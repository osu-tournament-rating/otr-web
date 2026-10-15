#!/usr/bin/env bash
# Sets an issue's type and its Priority and Effort fields, then prints the
# result. `gh issue create --type` sets the type, but gh cannot set issue
# fields, so this goes through GraphQL. Type, field, and option IDs are looked
# up by name on every run, so nothing breaks when they change.
#
# Usage: set-fields.sh <number> [--type T] [--priority P] [--effort E]
# Names match case-insensitively, e.g. --type bug --priority high.
set -euo pipefail

owner=osu-tournament-rating
repo=otr

usage() {
  echo "usage: $0 <number> [--type T] [--priority P] [--effort E]" >&2
  exit 2
}

[[ $# -ge 1 && $1 =~ ^[0-9]+$ ]] || usage
num=$1
shift
type='' priority='' effort=''
while [[ $# -gt 0 ]]; do
  [[ $# -ge 2 ]] || usage
  case $1 in
    --type) type=$2 ;;
    --priority) priority=$2 ;;
    --effort) effort=$2 ;;
    *) usage ;;
  esac
  shift 2
done

# One line per entry: "type<TAB>name<TAB>id", "field<TAB>name<TAB>id", and
# "option<TAB>field/name<TAB>id".
catalog=$(gh api graphql -f query="{organization(login:\"$owner\"){
  issueTypes(first:50){nodes{id name}}
  issueFields(first:50){nodes{... on IssueFieldSingleSelect{id name options{id name}}}}}}" \
  --jq '.data.organization
    | ([.issueTypes.nodes[] | "type\t\(.name)\t\(.id)"]
      + [.issueFields.nodes[] | select(.id) | "field\t\(.name)\t\(.id)",
          (.name as $f | .options[] | "option\t\($f)/\(.name)\t\(.id)")])
    | .[]')

# lookup <kind> <name>: prints the ID, or fails and lists the valid names.
lookup() {
  local id
  id=$(awk -F'\t' -v k="$1" -v n="$2" \
    '$1 == k && tolower($2) == tolower(n) { print $3; exit }' <<<"$catalog")
  if [[ -z $id ]]; then
    echo "unknown $1 '$2'. Valid: $(awk -F'\t' -v k="$1" -v p="${2%%/*}/" \
      '$1 == k && (k != "option" || index($2, p) == 1) { printf "%s ", $2 }' <<<"$catalog")" >&2
    exit 1
  fi
  echo "$id"
}

# Resolve every name before changing anything, so a typo changes nothing.
type_id=''
[[ -z $type ]] || type_id=$(lookup type "$type")
fields=()
for pair in "Priority:$priority" "Effort:$effort"; do
  field=${pair%%:*} value=${pair#*:}
  [[ -n $value ]] || continue
  field_id=$(lookup field "$field")
  option_id=$(lookup option "$field/$value")
  fields+=("{fieldId:\"$field_id\",singleSelectOptionId:\"$option_id\"}")
done

issue_id=$(gh api graphql -f query="{repository(owner:\"$owner\",name:\"$repo\"){issue(number:$num){id}}}" \
  --jq .data.repository.issue.id)

if [[ -n $type_id ]]; then
  gh api graphql -f query='mutation($i:ID!,$t:ID!){updateIssueIssueType(input:{issueId:$i,issueTypeId:$t}){issue{number}}}' \
    -f i="$issue_id" -f t="$type_id" >/dev/null
fi
if ((${#fields[@]})); then
  joined=$(IFS=,; echo "${fields[*]}")
  gh api graphql -f query="mutation{setIssueFieldValue(input:{issueId:\"$issue_id\",issueFields:[$joined]}){clientMutationId}}" >/dev/null
fi

gh api graphql -f query="{repository(owner:\"$owner\",name:\"$repo\"){issue(number:$num){number issueType{name}
  issueFieldValues(first:10){nodes{... on IssueFieldSingleSelectValue{name field{... on IssueFieldSingleSelect{name}}}}}}}}" \
  --jq '.data.repository.issue
    | "#\(.number) type=\(.issueType.name // "-") \([.issueFieldValues.nodes[] | select(.field) | "\(.field.name)=\(.name)"] | join(" "))"'
