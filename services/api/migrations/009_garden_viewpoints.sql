-- Garden viewpoints: the 360° tour.
--
-- Each row is one spot in the garden the owner photographed as an equirectangular
-- panorama, plus where that spot sits on the traced plan. The plan position is
-- what makes the tour more than a photo gallery: knowing where the camera stood,
-- the client derives the compass bearing to every bed centroid and to every other
-- viewpoint, so bed labels and the "walk over there" markers are computed rather
-- than placed by hand in 3D.
--
-- Coordinates are normalised 0..1 in the same space as garden_beds.shape, so a
-- re-traced or swapped plan photo moves nothing.
--
-- Migrations re-run on every boot, so every statement must be idempotent.

CREATE TABLE IF NOT EXISTS garden_viewpoints (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    -- Where the camera stood, on the plan. Nullable: a panorama can be uploaded
    -- before its spot is pinned, it just cannot show bearing-derived markers yet.
    plan_x DOUBLE PRECISION,
    plan_y DOUBLE PRECISION,
    -- Rotation, in degrees, between the panorama's own 0 seam and the plan's +x
    -- axis. The owner calibrates it once by lining the panorama up with reality;
    -- without it every derived bearing would be off by a constant.
    heading_deg DOUBLE PRECISION NOT NULL DEFAULT 0,
    -- The panorama itself, in the row as with the plan and plant photos: one
    -- deploy target, one backup, and the API is already the only way in. Uploads
    -- are downscaled client-side, which is what keeps this reasonable.
    photo BYTEA,
    photo_mime VARCHAR(64),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Every read is "this user's viewpoints, in tour order".
CREATE INDEX IF NOT EXISTS idx_garden_viewpoints_user_id
    ON garden_viewpoints(user_id, sort_order);
