-- Skema database NaviKarier, dijalankan saat start (idempoten). Setara dengan migrasi Alembic
-- 4ba49cf12b8e + Base.metadata.create_all milik backend Python lama, jadi DB hasil dump lama tetap cocok.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    password_hash VARCHAR,
    role VARCHAR DEFAULT 'JOBSEEKER',
    phone VARCHAR,
    bio TEXT,
    target_role VARCHAR,
    experience_level VARCHAR,
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
CREATE INDEX IF NOT EXISTS ix_users_name ON users (name);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS cv_data (
    id SERIAL PRIMARY KEY,
    extracted_text TEXT,
    user_id INTEGER REFERENCES users (id),
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_cv_data_id ON cv_data (id);

CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    match_score DOUBLE PRECISION,
    target_role VARCHAR DEFAULT '',
    level VARCHAR DEFAULT 'MID',
    missing_skills TEXT,
    skill_details TEXT,
    recommended_courses TEXT,
    user_id INTEGER REFERENCES users (id),
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_analysis_results_id ON analysis_results (id);

CREATE TABLE IF NOT EXISTS job_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id),
    title VARCHAR,
    level VARCHAR,
    required_skills TEXT,
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_job_roles_id ON job_roles (id);

CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id),
    token VARCHAR,
    target_role VARCHAR,
    level VARCHAR,
    candidate_email VARCHAR,
    candidate_name VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_invites_id ON invites (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_invites_token ON invites (token);
