# Beatmap duration binding

This worker-private WASM binding supplements the pinned `rosu-pp-js@4.0.1`
release, which exposes difficulty and hit windows but does not expose duration.
It uses the same pinned Rust parser (`rosu-pp=4.0.1`) and slider curve library
(`rosu-map=0.2.1`). It does not read osu! API metadata.

`total_length` is the interval from the first object start to the latest object
end, in seconds. Osu! and catch slider ends use the parsed curve distance, all
spans, active timing and inherited slider velocity, and the same precision
adjustment as rosu-pp. Mania legacy slider objects use their parsed curve with
rosu-pp's direct slider-velocity multiplication. Native taiko drum rolls use
encoded expected distance with the converter's exact velocity operation order
and truncate duration to integer milliseconds before clock-rate adjustment;
short native rolls remain rolls. Spinner and hold ends include their full duration. `drain_length`
subtracts the union of break intervals clipped to that play interval. Both
lengths divide by the supplied effective clock rate exactly once. Intro/outro
audio outside the object interval is not included. Empty maps are rejected.

The interval refers to the source file. The MVP adapter accepts native rulesets
and does not convert standard maps to other modes. Map bytes are bounded to
8 MiB, object count to 100,000, and the upstream suspicious-map check runs
before curve construction. The parent process must enforce execution deadlines
and memory bounds; synchronous WASM cannot interrupt itself.

The small runtime under `pkg/` is committed so local and deployed workers need
no Rust toolchain. The lockfile pins all Rust inputs; `UPSTREAM-LICENSE` and
`THIRD-PARTY-NOTICES` retain dependency licenses. Slider velocity
and control-point selection follow these exact upstream sources:

- [rosu-pp 4.0.1 slider construction](https://github.com/MaxOhn/rosu-pp/blob/v4.0.1/src/osu/object.rs)
- [rosu-pp precision adjustment](https://github.com/MaxOhn/rosu-pp/blob/v4.0.1/src/util/mod.rs)
- [Pinned taiko drum-roll conversion](https://github.com/ppy/osu/blob/28c846b4d9366484792e27f4729cd1afa2cdeb66/osu.Game.Rulesets.Taiko/Beatmaps/TaikoBeatmapConverter.cs)
- [rosu-pp 4.0.1 mania object ends](https://github.com/MaxOhn/rosu-pp/blob/v4.0.1/src/mania/object.rs)
- [rosu-pp control points](https://github.com/MaxOhn/rosu-pp/tree/v4.0.1/src/model/control_point)
- [rosu-pp-js 4.0.1 binding surface](https://github.com/MaxOhn/rosu-pp-js/blob/v4.0.1/rosu_pp_js.d.ts)

To reproduce the runtime, install Rust 1.98.1 and the
`wasm32-unknown-unknown` target, then install `wasm-bindgen-cli` version 0.2.100
(or use its corresponding official prebuilt release). Run from this directory:

```sh
cargo test --locked
cargo build --locked --release --target wasm32-unknown-unknown
wasm-bindgen --target nodejs --out-dir pkg --out-name otr_beatmap_duration target/wasm32-unknown-unknown/release/otr_beatmap_duration.wasm
mv pkg/otr_beatmap_duration.js pkg/otr_beatmap_duration.cjs
mv pkg/otr_beatmap_duration.d.ts pkg/otr_beatmap_duration.d.cts
bunx prettier pkg/otr_beatmap_duration.cjs --write
```

The native Rust suite covers object ends, slider repeats and inherited velocity,
long objects extending beyond later starts, break clipping and overlap,
clock-rate scaling, and invalid input. The TypeScript calculator suite also
executes this generated WASM against real files for every base library mode.
Version `1.0.1` corrects native taiko drum-roll duration and mania legacy slider
velocity. Its calculation identity differs from `1.0.0` so corrected results
can be rebuilt while prior results remain attributable to their original version.
Changes to duration semantics require a binding version increase, regeneration,
and a new calculation identity so retained results remain reproducible.
