-- Who was signed in when the page loaded, when anyone was.
--
-- Denormalised as the email rather than a user_id foreign key: this is a log,
-- and a log should keep saying who it was after the account is renamed or
-- deleted. Empty means an anonymous visit.
--
-- Migrations re-run on every boot, so every statement must be idempotent.

ALTER TABLE visits ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NOT NULL DEFAULT '';
