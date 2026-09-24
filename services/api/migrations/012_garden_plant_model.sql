-- A 3D model per plant (glTF binary), stood in the 3D walk instead of the
-- generated shape. Stored in the row like the photo: one deploy target, one
-- backup, and the API stays the single door to user data.
ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS model BYTEA;
ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS model_mime VARCHAR(64);
