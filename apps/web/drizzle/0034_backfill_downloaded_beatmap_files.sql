-- Files recorded before fetch status existed were persisted after acquisition.
UPDATE "beatmap_files"
SET "fetch_status" = 2,
    "last_fetch_attempt" = "acquired_at"
WHERE "fetch_status" = 0
  AND "checksum" IS NOT NULL
  AND "storage_key" IS NOT NULL
  AND "byte_length" IS NOT NULL
  AND "acquired_at" IS NOT NULL;
