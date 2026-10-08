use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tokio_postgres::{Client, NoTls};

pub struct TestDatabase {
    pub connection_string: String,
    _container: ContainerAsync<Postgres>
}

impl TestDatabase {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Start PostgreSQL container
        let container = Postgres::default().start().await?;
        let port = container.get_host_port_ipv4(5432).await?;

        let connection_string = format!(
            "host=localhost port={} user=postgres password=postgres dbname=postgres",
            port
        );

        // Connect and create schema
        let (client, connection) = tokio_postgres::connect(&connection_string, NoTls).await?;

        // Spawn the connection handler
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Database connection error: {}", e);
            }
        });

        // Load and execute schema
        let schema = include_str!("schema.sql");
        client.batch_execute(schema).await?;

        Ok(TestDatabase {
            connection_string,
            _container: container
        })
    }

    pub async fn get_client(&self) -> Result<Client, Box<dyn std::error::Error>> {
        let (client, connection) = tokio_postgres::connect(&self.connection_string, NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Database connection error: {}", e);
            }
        });

        Ok(client)
    }

    pub async fn seed_test_data(&self) -> Result<(), Box<dyn std::error::Error>> {
        let client = self.get_client().await?;

        // Insert test players
        client
            .execute(
                "INSERT INTO players (username, osu_id, country) 
             OVERRIDING SYSTEM VALUE
             VALUES 
             ('TestPlayer1', 1001, 'US'),
             ('TestPlayer2', 1002, 'US'),
             ('TestPlayer3', 1003, 'GB'),
             ('TestPlayer4', 1004, 'GB')",
                &[]
            )
            .await?;

        // Get the inserted player IDs
        let rows = client.query("SELECT id FROM players ORDER BY osu_id", &[]).await?;
        let player_ids: Vec<i32> = rows.iter().map(|row| row.get(0)).collect();

        // Insert player_osu_ruleset_data (this is what maps to ruleset_data in the Player struct)
        let ruleset_data = vec![
            (player_ids[0], 0, 5000.0, 1000),
            (player_ids[1], 0, 4000.0, 2000),
            (player_ids[2], 0, 3000.0, 3000),
            (player_ids[3], 0, 2000.0, 4000),
        ];

        for (player_id, ruleset, pp, global_rank) in ruleset_data {
            client
                .execute(
                    "INSERT INTO player_osu_ruleset_data (player_id, ruleset, pp, global_rank) VALUES 
                 ($1, $2, $3, $4)",
                    &[&player_id, &ruleset, &pp, &global_rank]
                )
                .await?;
        }

        // Insert player highest ranks for testing
        for (i, player_id) in player_ids.iter().enumerate() {
            let rank = (i + 1) * 1000;
            client.execute(
                "INSERT INTO player_highest_ranks (player_id, ruleset, global_rank, global_rank_date, country_rank, country_rank_date) VALUES 
                 ($1, 0, $2, '2024-01-01 00:00:00+00', $3, '2024-01-01 00:00:00+00')",
                &[player_id, &(rank as i32), &(((i + 1) * 100) as i32)]
            ).await?;
        }

        // Insert a test tournament
        client.execute(
            "INSERT INTO tournaments (name, abbreviation, forum_url, rank_range_lower_bound, ruleset, lobby_size, verification_status) 
             OVERRIDING SYSTEM VALUE
             VALUES 
             ('Test Tournament', 'TT', 'https://example.com', 0, 0, 8, 4)",
            &[]
        ).await?;

        let tournament_id: i32 = client
            .query_one("SELECT id FROM tournaments WHERE abbreviation = 'TT'", &[])
            .await?
            .get(0);

        // Insert test matches
        client
            .execute(
                "INSERT INTO matches (osu_id, name, start_time, end_time, verification_status, tournament_id) 
             OVERRIDING SYSTEM VALUE
             VALUES 
             (12345, 'Test Match 1', '2024-01-01 12:00:00+00', '2024-01-01 13:00:00+00', 4, $1),
             (12346, 'Test Match 2', '2024-01-02 12:00:00+00', '2024-01-02 13:00:00+00', 4, $1)",
                &[&tournament_id]
            )
            .await?;

        let match_ids: Vec<i32> = client
            .query("SELECT id FROM matches ORDER BY osu_id", &[])
            .await?
            .iter()
            .map(|row| row.get(0))
            .collect();

        // No need to link matches to tournament - it's done via foreign key

        // Insert games
        client.execute(
            "INSERT INTO games (osu_id, match_id, start_time, end_time, beatmap_id, ruleset, scoring_type, team_type, mods, verification_status) 
             OVERRIDING SYSTEM VALUE
             VALUES 
             (1, $1, '2024-01-01 12:00:00+00', '2024-01-01 12:10:00+00', NULL, 0, 0, 0, 0, 4),
             (2, $1, '2024-01-01 12:15:00+00', '2024-01-01 12:25:00+00', NULL, 0, 0, 0, 0, 4),
             (3, $2, '2024-01-02 12:00:00+00', '2024-01-02 12:10:00+00', NULL, 0, 0, 0, 0, 4)",
            &[&match_ids[0], &match_ids[1]]
        ).await?;

        let game_ids: Vec<i32> = client
            .query("SELECT id FROM games ORDER BY osu_id", &[])
            .await?
            .iter()
            .map(|row| row.get(0))
            .collect();

        // Insert game scores
        let score_values = vec![
            (
                player_ids[0],
                game_ids[0],
                0,
                1000000,
                500,
                10,
                20,
                300,
                5,
                0,
                0,
                false,
                true,
                1,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[1],
                game_ids[0],
                0,
                900000,
                450,
                15,
                25,
                280,
                10,
                0,
                0,
                false,
                true,
                2,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[2],
                game_ids[0],
                0,
                800000,
                400,
                20,
                30,
                260,
                15,
                0,
                0,
                false,
                true,
                3,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[3],
                game_ids[0],
                0,
                700000,
                350,
                25,
                35,
                240,
                20,
                0,
                0,
                false,
                true,
                4,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[0],
                game_ids[1],
                0,
                950000,
                480,
                12,
                22,
                290,
                7,
                0,
                0,
                false,
                true,
                2,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[1],
                game_ids[1],
                0,
                1000000,
                500,
                8,
                18,
                310,
                3,
                0,
                0,
                false,
                true,
                1,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[2],
                game_ids[1],
                0,
                850000,
                420,
                18,
                28,
                270,
                12,
                0,
                0,
                false,
                true,
                3,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[3],
                game_ids[1],
                0,
                750000,
                370,
                22,
                32,
                250,
                18,
                0,
                0,
                false,
                true,
                4,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[0],
                game_ids[2],
                0,
                980000,
                490,
                9,
                19,
                305,
                4,
                0,
                0,
                false,
                true,
                1,
                0,
                0,
                0,
                4,
                0
            ),
            (
                player_ids[1],
                game_ids[2],
                0,
                920000,
                460,
                13,
                23,
                285,
                8,
                0,
                0,
                false,
                true,
                2,
                0,
                0,
                0,
                4,
                0
            ),
        ];

        for (
            player_id,
            game_id,
            team,
            score,
            max_combo,
            count50,
            count100,
            count300,
            count_miss,
            count_geki,
            count_katu,
            perfect,
            pass,
            placement,
            grade,
            mods,
            ruleset,
            verification_status,
            rejection_reason
        ) in score_values
        {
            client.execute(
                "INSERT INTO game_scores (player_id, game_id, team, score, max_combo, count50, count100, count300, count_miss, count_geki, count_katu, perfect, pass, placement, grade, mods, ruleset, verification_status, rejection_reason) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)",
                &[
                    &player_id, &game_id, &team, &score, &max_combo,
                    &count50, &count100, &count300, &count_miss, &count_geki,
                    &count_katu, &perfect, &pass, &placement, &grade,
                    &mods, &ruleset, &verification_status, &rejection_reason
                ]
            ).await?;
        }

        Ok(())
    }
}
