-- Visits: who lands on the sites, for the admin dashboard in the portal.
--
-- Every frontend fires one beacon per page load at POST /track. The row keeps
-- the client IP as the proxy saw it plus what the browser volunteered; nothing
-- ties a visit to an account on purpose, this is traffic, not user activity.
--
-- Geolocation lives in its own table keyed by IP rather than on the visit: one
-- lookup per distinct address instead of one per hit (the free provider allows
-- 45/min), and a late or retried lookup fills in every past visit from that
-- address at once through the join.
--
-- Migrations re-run on every boot, so every statement must be idempotent.

CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY,
    ip INET NOT NULL,
    app VARCHAR(50) NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    referrer TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_ip ON visits (ip);
CREATE INDEX IF NOT EXISTS idx_visits_app ON visits (app);

CREATE TABLE IF NOT EXISTS ip_locations (
    ip INET PRIMARY KEY,
    country VARCHAR(100) NOT NULL DEFAULT '',
    country_code VARCHAR(2) NOT NULL DEFAULT '',
    region VARCHAR(100) NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT '',
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    isp VARCHAR(200) NOT NULL DEFAULT '',
    -- A failed lookup is stored too, so the same address is not retried on every
    -- hit; `resolved` says whether the columns above mean anything.
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    looked_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
