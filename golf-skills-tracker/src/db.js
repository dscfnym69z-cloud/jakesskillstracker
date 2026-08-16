const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.error(
    'DATABASE_URL is not set. Create a .env file (see .env.example) or set it in your hosting environment.'
  );
}

const useSSL = process.env.DATABASE_SSL !== 'false';

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pupils (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  higher_is_better BOOLEAN NOT NULL DEFAULT true,
  image_data BYTEA,
  image_mime TEXT,
  calib1_value DOUBLE PRECISION,
  calib1_x DOUBLE PRECISION,
  calib1_y DOUBLE PRECISION,
  calib2_value DOUBLE PRECISION,
  calib2_x DOUBLE PRECISION,
  calib2_y DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  pupil_id INTEGER NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores_pupil_challenge ON scores (pupil_id, challenge_id);
`;

async function initSchema() {
  await pool.query(SCHEMA_SQL);
}

module.exports = {
  pool,
  initSchema,
  query: (text, params) => pool.query(text, params),
};
