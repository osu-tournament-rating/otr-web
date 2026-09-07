use rosu_map::section::hit_objects::{Curve, CurveBuffers};
use rosu_pp::{
    Beatmap,
    model::{
        control_point::{DifficultyPoint, TimingPoint},
        hit_object::HitObjectKind,
    },
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Durations {
    pub total_length: f64,
    pub drain_length: f64,
}

fn calculate(bytes: &[u8], clock_rate: f64) -> Result<Durations, String> {
    if !clock_rate.is_finite() || !(0.01..=100.0).contains(&clock_rate) {
        return Err("Invalid clock rate".into());
    }
    if bytes.len() > 8 * 1024 * 1024 {
        return Err("Beatmap exceeds 8 MiB".into());
    }
    let map = Beatmap::from_bytes(bytes).map_err(|_| "Beatmap decoding failed")?;
    if map.hit_objects.is_empty() || map.hit_objects.len() > 100_000 {
        return Err("Invalid hit object count".into());
    }
    map.check_suspicion().map_err(|_| "Suspicious beatmap")?;
    let mut curves = CurveBuffers::default();
    let mut first = f64::INFINITY;
    let mut last = f64::NEG_INFINITY;
    for object in &map.hit_objects {
        let start = object.start_time;
        let end = match &object.kind {
            HitObjectKind::Circle => start,
            HitObjectKind::Spinner(spinner) => start + spinner.duration,
            HitObjectKind::Hold(hold) => start + hold.duration,
            HitObjectKind::Slider(slider) => {
                let timing_index = map
                    .timing_points
                    .binary_search_by(|point| point.time.total_cmp(&start))
                    .unwrap_or_else(|index| index.saturating_sub(1));
                let beat_len = map
                    .timing_points
                    .get(timing_index)
                    .map_or(TimingPoint::DEFAULT_BEAT_LEN, |point| point.beat_len);
                let difficulty_index = map
                    .difficulty_points
                    .binary_search_by(|point| point.time.total_cmp(&start))
                    .map_or_else(|index| index.checked_sub(1), Some);
                let slider_velocity = difficulty_index
                    .and_then(|index| map.difficulty_points.get(index))
                    .map_or(DifficultyPoint::DEFAULT_SLIDER_VELOCITY, |point| {
                        point.slider_velocity
                    });
                let curve = Curve::new(
                    map.mode,
                    &slider.control_points,
                    slider.expected_dist,
                    &mut curves,
                );
                // Match rosu-pp 4.0.1 OsuSlider/Catch JuiceStream, including its f32 SV rounding.
                let inherited_beat_len = -100.0 / slider_velocity;
                let bpm_multiplier = if inherited_beat_len < 0.0 {
                    f64::from(((-inherited_beat_len) as f32).clamp(10.0, 10_000.0)) / 100.0
                } else {
                    1.0
                };
                let velocity = 100.0 * map.slider_multiplier / (beat_len * bpm_multiplier);
                if !velocity.is_finite() || velocity <= 0.0 {
                    return Err("Invalid slider velocity".into());
                }
                start + slider.span_count() as f64 * curve.dist() / velocity
            }
        };
        if !start.is_finite() || !end.is_finite() || end < start {
            return Err("Invalid hit object duration".into());
        }
        first = first.min(start);
        last = last.max(end);
    }
    let mut breaks = Vec::with_capacity(map.breaks.len());
    for period in &map.breaks {
        if !period.start_time.is_finite() || !period.end_time.is_finite() {
            return Err("Invalid break".into());
        }
        let start = first.max(period.start_time);
        let end = last.min(period.end_time);
        if start < end {
            breaks.push((start, end));
        }
    }
    breaks.sort_unstable_by(|a, b| a.0.total_cmp(&b.0));
    let mut break_length = 0.0;
    let mut covered_until = first;
    for (start, end) in breaks {
        let uncovered_start = covered_until.max(start);
        if end > uncovered_start {
            break_length += end - uncovered_start;
        }
        covered_until = covered_until.max(end);
    }
    let total_length = (last - first) / (1000.0 * clock_rate);
    let drain_length = (last - first - break_length).max(0.0) / (1000.0 * clock_rate);
    if !total_length.is_finite() || !drain_length.is_finite() {
        return Err("Nonfinite duration".into());
    }
    Ok(Durations {
        total_length,
        drain_length,
    })
}

#[wasm_bindgen]
pub fn durations(bytes: &[u8], clock_rate: f64) -> Result<Durations, JsValue> {
    calculate(bytes, clock_rate).map_err(|error| JsValue::from_str(&error))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn map(objects: &str, events: &str, timing: &str) -> String {
        format!(
            "osu file format v14\n\n[General]\nMode:0\n\n[Difficulty]\nHPDrainRate:5\nCircleSize:4\nOverallDifficulty:8\nApproachRate:9\nSliderMultiplier:1.4\nSliderTickRate:1\n\n[Events]\n{events}\n\n[TimingPoints]\n{timing}\n\n[HitObjects]\n{objects}\n"
        )
    }

    fn duration(objects: &str, events: &str, timing: &str, clock: f64) -> Durations {
        calculate(map(objects, events, timing).as_bytes(), clock).unwrap()
    }

    #[test]
    fn circles_use_first_start_and_max_end() {
        let result = duration(
            "64,64,1000,1,0,0:0:0:0:\n64,64,2500,1,0,0:0:0:0:",
            "",
            "0,500,4,1,0,100,1,0",
            1.0,
        );
        assert_eq!(result.total_length, 1.5);
        assert_eq!(result.drain_length, 1.5);
    }

    #[test]
    fn sliders_include_curve_length_repeats_and_inherited_velocity() {
        let result = duration(
            "64,64,1000,1,0,0:0:0:0:\n64,64,2000,2,0,L|344:64,3,280",
            "",
            "0,500,4,1,0,100,1,0\n1500,-50,4,1,0,100,0,0",
            1.0,
        );
        assert_eq!(result.total_length, 2.5);
    }

    #[test]
    fn earlier_long_slider_can_outlast_last_started_circle() {
        let result = duration(
            "64,64,1000,2,0,L|344:64,4,280\n64,64,1200,1,0,0:0:0:0:",
            "",
            "0,500,4,1,0,100,1,0",
            1.0,
        );
        assert_eq!(result.total_length, 4.0);
    }

    #[test]
    fn degenerate_curves_do_not_invent_expected_distance() {
        let result = duration(
            "64,64,1000,1,0,0:0:0:0:\n64,64,2000,2,0,L|64:64,1,280",
            "",
            "0,500,4,1,0,100,1,0",
            1.0,
        );
        assert_eq!(result.total_length, 1.0);
    }

    #[test]
    fn timing_changes_reset_inherited_velocity() {
        let result = duration(
            "64,64,1000,1,0,0:0:0:0:\n64,64,2000,2,0,L|344:64,1,280",
            "",
            "0,500,4,1,0,100,1,0\n1000,-50,4,1,0,100,0,0\n1500,400,4,1,0,100,1,0",
            1.0,
        );
        assert_eq!(result.total_length, 1.8);
    }

    #[test]
    fn sliders_starting_before_first_timing_point_use_that_point() {
        let result = duration(
            "64,64,1000,2,0,L|344:64,1,280",
            "",
            "2000,500,4,1,0,100,1,0",
            1.0,
        );
        assert_eq!(result.total_length, 1.0);
    }

    #[test]
    fn fractional_clock_and_object_times_are_not_truncated() {
        let result = duration(
            "64,64,1000.5,1,0,0:0:0:0:\n256,192,1500.75,8,0,3000.25,0:0:0:0:",
            "",
            "0,500,4,1,0,100,1,0",
            1.1,
        );
        assert!((result.total_length - 1.99975 / 1.1).abs() < 1e-12);
    }

    #[test]
    fn spinner_and_hold_end_times_are_preserved() {
        let result = duration(
            "64,64,1000,1,0,0:0:0:0:\n256,192,1500,8,0,3500,0:0:0:0:\n64,64,2000,128,0,4000:0:0:0:0:",
            "",
            "0,500,4,1,0,100,1,0",
            1.0,
        );
        assert_eq!(result.total_length, 3.0);
    }

    #[test]
    fn breaks_are_clipped_merged_and_clock_rate_applies_once() {
        let result = duration(
            "64,64,1000,1,0,0:0:0:0:\n64,64,10000,1,0,0:0:0:0:",
            "2,0,2000\n2,3000,5000\n2,4000,6000\n2,9000,15000",
            "0,500,4,1,0,100,1,0",
            1.5,
        );
        assert_eq!(result.total_length, 6.0);
        assert!((result.drain_length - 4.0 / 1.5).abs() < 1e-12);
    }

    #[test]
    fn invalid_clock_and_empty_maps_are_rejected() {
        let bytes = map("64,64,1000,1,0,0:0:0:0:", "", "0,500,4,1,0,100,1,0");
        for clock in [0.0, -1.0, f64::NAN, f64::INFINITY] {
            assert!(calculate(bytes.as_bytes(), clock).is_err());
        }
        assert!(calculate(map("", "", "").as_bytes(), 1.0).is_err());
    }
}
