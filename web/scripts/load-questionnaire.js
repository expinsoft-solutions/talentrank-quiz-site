#!/usr/bin/env node
/**
 * Load questionnaire JSON into assessments (v1.0).
 * Canonical source: requirements/questionnaire_v1.json (or path as first arg).
 * Run from web: npm run questionnaire:load
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (e.g. in web/.env.local)
 */

const path = require('path');
const fs = require('fs');

const webDir = path.join(__dirname, '..');
const rootDir = path.join(webDir, '..');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, '').trim();
      if (val === '') return;
      process.env[key] = val;
    }
  });
}
loadEnv(path.join(rootDir, '.env'));
loadEnv(path.join(webDir, '.env.local'));

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const env = process.env;
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in web/.env.local)');
    process.exit(1);
  }

  const jsonPath = process.argv[2] || path.join(rootDir, 'requirements', 'questionnaire_v1.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found:', jsonPath);
    console.error('Create it or run from repo root: npm run questionnaire:export');
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  let questionnaire;
  try {
    questionnaire = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('assessments')
    .upsert(
      { questionnaire, version: 'v1.0', language_key: 'en' },
      { onConflict: 'version' }
    )
    .select('id, version')
    .single();

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }
  console.log('Loaded questionnaire into assessments:', data?.version, '(id:', data?.id, ')');
}

main();
