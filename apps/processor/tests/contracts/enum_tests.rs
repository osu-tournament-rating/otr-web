//! The processor reads and writes enum columns as numbers, so its enums must
//! number their variants exactly as `@otr/core` does. These tests read the
//! TypeScript source, because TypeScript cannot see the processor's copies.

use otr_processor::model::structures::{rating_adjustment_type::RatingAdjustmentType, ruleset::Ruleset};
use std::{collections::BTreeMap, fmt::Debug, fs};
use strum::IntoEnumIterator;

/// `@otr/core`'s persisted enums, from the otr root.
const CORE_ENUMS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../packages/otr-core/src/osu/enums.ts");

/// The processor's SQL selects verified rows with `verification_status = 4`.
const VERIFIED: i64 = 4;

/// Every member of `export enum <name>` in `@otr/core`, by name. Panics if a
/// member has no explicit number, since TypeScript would assign one implicitly.
fn core_enum(name: &str) -> BTreeMap<String, i64> {
    let source = fs::read_to_string(CORE_ENUMS).expect("Failed to read @otr/core enums");
    let opening = format!("export enum {name} {{");
    let body = source
        .split_once(&opening)
        .unwrap_or_else(|| panic!("@otr/core no longer exports enum {name}"))
        .1;
    let body = body.split_once('}').expect("Unterminated enum").0;

    body.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with("//") && !line.starts_with("/*") && !line.starts_with('*'))
        .map(|line| {
            let (member, value) = line
                .trim_end_matches(',')
                .split_once('=')
                .unwrap_or_else(|| panic!("{name} member `{line}` has no explicit number"));
            let value = value
                .trim()
                .parse()
                .unwrap_or_else(|_| panic!("{name} member `{line}` is not a plain number"));
            (member.trim().to_string(), value)
        })
        .collect()
}

/// Every variant of a processor enum, by name.
fn processor_enum<T: IntoEnumIterator + Debug + Copy>(as_number: impl Fn(T) -> i64) -> BTreeMap<String, i64> {
    T::iter()
        .map(|variant| (format!("{variant:?}"), as_number(variant)))
        .collect()
}

#[test]
fn test_ruleset_matches_core() {
    assert_eq!(processor_enum(|r: Ruleset| r as i64), core_enum("Ruleset"));
}

#[test]
fn test_rating_adjustment_type_matches_core() {
    assert_eq!(
        processor_enum(|t: RatingAdjustmentType| t as i64),
        core_enum("RatingAdjustmentType")
    );
}

#[test]
fn test_verified_matches_core() {
    assert_eq!(core_enum("VerificationStatus").get("Verified"), Some(&VERIFIED));
}
