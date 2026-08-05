-- The garden plan backdrop, one image per user.
--
-- It lived in localStorage until now, which meant it existed only in the owner's
-- browser: public visitors saw bed outlines floating over an empty frame, and the
-- owner lost it on any profile reset. A row per user is the smallest thing that
-- fixes both.
--
-- One table rather than a column on `users`: this is garden-scoped state, and
-- keeping it out of the auth table means the garden feature owns its own schema.
-- Migrations re-run on every boot, so every statement must be idempotent.

CREATE TABLE IF NOT EXISTS garden_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_photo BYTEA,
    plan_photo_mime VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
