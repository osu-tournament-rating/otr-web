# otr-processor

Rating calculation engine for the o!TR platform. Processes osu! tournament
data to calculate player skill ratings using a PlackettLuce model.

The processor lives in otr-web under `apps/processor`. From this directory,
`cargo run -- --help` lists its options. A run rewrites ratings in the database
at `DATABASE_URL`, read from the environment or otr-web's root `.env`.

Please see the
[Development Guide](https://docs.otr.stagec.xyz/Development/Development-Guide) for more information.
