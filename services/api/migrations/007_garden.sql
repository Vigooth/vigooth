-- Garden: plants, the spots they occupy, and the phases inside each occupation.
-- Migrations here re-run on every boot, so every statement must be idempotent.

CREATE TABLE IF NOT EXISTS garden_beds (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'bed',
    area_m2 NUMERIC(8, 2),
    -- Polygon on the traced garden plan, as [{"x":0.12,"y":0.44}, ...] in
    -- normalised 0..1 coordinates. Storing it unit-relative means the plan photo
    -- can be swapped or re-traced at any resolution without moving the beds.
    shape JSONB,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garden_beds_user_id ON garden_beds(user_id);

CREATE TABLE IF NOT EXISTS garden_plants (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    latin_name VARCHAR(200),
    family VARCHAR(120),
    description TEXT,
    sun VARCHAR(32),
    water VARCHAR(32),
    spacing_cm INTEGER,
    -- Photos live in the row rather than on disk: one deploy target, one backup,
    -- and the API is already the only way in. Uploads are downscaled client-side
    -- before they get here, which is what keeps this from becoming a problem.
    photo BYTEA,
    photo_mime VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garden_plants_user_id ON garden_plants(user_id);

CREATE TABLE IF NOT EXISTS garden_occupations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES garden_plants(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES garden_beds(id) ON DELETE CASCADE,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT garden_occupations_dates_ordered CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_garden_occupations_user_id ON garden_occupations(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_occupations_bed_id ON garden_occupations(bed_id);
CREATE INDEX IF NOT EXISTS idx_garden_occupations_plant_id ON garden_occupations(plant_id);
-- Overlap queries filter on a bed and a date window; this covers both.
CREATE INDEX IF NOT EXISTS idx_garden_occupations_bed_window
    ON garden_occupations(bed_id, starts_on, ends_on);

CREATE TABLE IF NOT EXISTS garden_phases (
    id UUID PRIMARY KEY,
    occupation_id UUID NOT NULL REFERENCES garden_occupations(id) ON DELETE CASCADE,
    kind VARCHAR(32) NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    CONSTRAINT garden_phases_dates_ordered CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_garden_phases_occupation_id ON garden_phases(occupation_id);
