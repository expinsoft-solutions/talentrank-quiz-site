#!/usr/bin/env node
/**
 * Load questionnaire JSON into the latest assessment (or create new if empty).
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
  const { data: rows } = await supabase
    .from('assessments')
    .select('id, version, questionnaire')
    .order('created_at', { ascending: false })
    .limit(10);

  const hasContent = (q) =>
    Array.isArray(q) && q.length > 0 && q.some((s) => Array.isArray(s?.questions));
  const target = Array.isArray(rows) ? rows.find((r) => hasContent(r.questionnaire)) ?? rows?.[0] : null;

  if (!target?.id) {
    const { data: inserted, error: insertErr } = await supabase
      .from('assessments')
      .insert({ questionnaire, version: `imported-${Date.now()}`, language_key: 'en' })
      .select('id, version')
      .single();
    if (insertErr) {
      console.error('Supabase error:', insertErr.message);
      process.exit(1);
    }
    console.log('Created new assessment:', inserted?.version, '(id:', inserted?.id, ')');
  } else {
    const { data, error } = await supabase
      .from('assessments')
      .update({ questionnaire })
      .eq('id', target.id)
      .select('id, version')
      .single();
    if (error) {
      console.error('Supabase error:', error.message);
      process.exit(1);
    }
    console.log('Updated assessment:', data?.version, '(id:', data?.id, ')');
  }
}

main();
