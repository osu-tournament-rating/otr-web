#!/usr/bin/env bash
# PreToolUse hook: blocks `gh pr create` and `gh pr edit` when the pull request
# description has no `## Review` section with at least one bullet. The
# pull-request skill explains how to run the review that fills it in.
#
# The description is searched for in the command itself (inline `--body` text
# and heredocs) and in files the command reads it from: `--body-file`,
# `$(cat file)`, `$(<file)`, and `cat file |` or `< file` feeding
# `--body-file -`. Exit code 2 blocks the call and shows stderr to Claude.

input=$(cat)
command=$(jq -r '.tool_input.command // ""' <<<"$input")
cwd=$(jq -r '.cwd // ""' <<<"$input")

# Any `gh pr create` or `gh pr edit`, including `/usr/bin/gh` and calls behind
# environment assignments such as `GH_TOKEN=x gh`.
if ! grep -Eq '(^|[^[:alnum:]_-])gh[[:space:]]+pr[[:space:]]+(create|edit)\b' <<<"$command"; then
  exit 0
fi

# `gh pr edit` without a new description, such as adding a label, is fine.
if grep -Eq '(^|[^[:alnum:]_-])gh[[:space:]]+pr[[:space:]]+edit\b' <<<"$command" &&
  ! grep -Eq '(^|[[:space:]])(--body|-b|--body-file|-F)([[:space:]=]|$)' <<<"$command"; then
  exit 0
fi

word='("[^"]*"|'"'"'[^'"'"']*'"'"'|[^[:space:];&|)]+)'
text=$command
while read -r path; do
  path=${path#[\"\']}
  path=${path%[\"\']}
  [[ $path == - || -z $path ]] && continue
  path=${path/#\~/$HOME}
  path=${path//\$\{HOME\}/$HOME}
  path=${path//\$HOME/$HOME}
  [[ $path != /* && -n $cwd ]] && path="$cwd/$path"
  [[ -f $path ]] && text+=$'\n'$(<"$path")
done < <(grep -Eo "((--body-file|-F)[[:space:]=]+|\\\$\\(cat[[:space:]]+|\\\$\\(<[[:space:]]*|(^|[[:space:]])cat[[:space:]]+|<[[:space:]]*)$word" <<<"$command" |
  sed -E 's/^[[:space:]]*(--body-file[[:space:]=]+|-F[[:space:]=]+|\$\(cat[[:space:]]+|\$\(<[[:space:]]*|cat[[:space:]]+|<[[:space:]]*)//')

# A `## Review` heading followed by a bullet before the next heading.
if awk '
  /^##[[:space:]]+Review[[:space:]]*$/ { inside = 1; next }
  /^##[[:space:]]/ { inside = 0 }
  inside && /^[[:space:]]*-[[:space:]]+[^[:space:]]/ { found = 1 }
  END { exit !found }
' <<<"$text"; then
  exit 0
fi

cat >&2 <<'EOF'
No `## Review` section with at least one bullet was found in the pull request
description. Before opening the pull request, run the `reviewer` agent once as
the pull-request skill describes (.claude/skills/pull-request/SKILL.md), fix
what it finds, and list each finding above `## Changelog`, most severe first,
marked fixed or declined with a reason.

If the section is already there, pass the description inline, in a heredoc, or
with `--body-file <path>` so this check can read it.
EOF
exit 2
