-- Click analytics schema for Cloudflare D1.
--
-- Deliberately minimal: no IP addresses, no user agents, no cookies, no
-- identifiers of any kind. Country arrives from the edge at country level and
-- the referrer is reduced to a hostname.
--
-- Apply with:
--   npx wrangler d1 execute calendarlink --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key   TEXT NOT NULL,
  provider    TEXT NOT NULL,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  country     TEXT,
  referer     TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_key      ON clicks (event_key);
CREATE INDEX IF NOT EXISTS idx_clicks_key_date ON clicks (event_key, clicked_at);

-- One row per tracked event, written on the first click so the dashboard has
-- a title to show. Never written when nobody clicks.
CREATE TABLE IF NOT EXISTS events (
  event_key   TEXT PRIMARY KEY,
  title       TEXT,
  starts_at   TEXT,
  time_zone   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Optional housekeeping. D1's free tier is generous, but if you ever want to
-- keep the table small, run this on a Cron Trigger:
--   DELETE FROM clicks WHERE clicked_at < datetime('now', '-400 days');
