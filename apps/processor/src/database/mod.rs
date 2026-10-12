//! Persistence for a rating rebuild. It reads verified tournament data,
//! replaces every rating, and finds the tournaments whose statistics the new
//! ratings make stale.
//!
//! In SQL, `verification_status = 4` means verified.

pub mod db;
pub mod db_structs;
pub mod error;
mod load;
mod placements;
mod save;
mod tournament_stats;
