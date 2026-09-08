# Calculator fixtures

These are real source `.osu` files, with no mocked difficulty or metadata output.
Files 1028484 (taiko), 1638954 (mania 4K), 2118524 (catch), and 2785319 (osu!)
come from the [MIT-licensed rosu-pp 4.0.1 test resources](https://github.com/MaxOhn/rosu-pp/tree/v4.0.1/resources).
The upstream license is retained in `UPSTREAM-LICENSE`.
File 763919 (mania 7K) was downloaded from
[osu!'s source-file endpoint](https://osu.ppy.sh/osu/763919).

The five fixtures cover every native library mode and the separate 4K/7K
identities. Tests modify a fixture for malformed input and uncommon mania keys.
All difficulty and hit-window results come from the released `rosu-pp-js` library.
