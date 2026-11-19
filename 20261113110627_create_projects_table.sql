/*
# Create projects table for the video editor

1. New Tables
- `projects`
  - `id` (uuid, primary key)
  - `name` (text, project title)
  - `folder` (text, folder the project is grouped in, default 'Default')
  - `thumbnail` (text, small cover image as data URL, optional)
  - `data` (jsonb, the full editing timeline of the project)
  - `duration` (double precision, total length in seconds)
  - `created_at` / `updated_at` (timestamps)

2. Security
- Enable RLS on `projects`.
- The app has no sign-in screen, so every request runs as `anon`. Policies therefore target `anon, authenticated`.
- Grants are limited to the verbs the app uses (select, insert, update, delete).

3. Notes
- Table is intentionally shared across devices of this app; no user ownership column exists because no accounts are used.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled',
  folder text NOT NULL DEFAULT 'Default',
  thumbnail text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects (updated_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);
