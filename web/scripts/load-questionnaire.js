#!/usr/bin/env node
/**
 * Load unified questionnaire JSON (free + paid) into assessments.
 * Canonical source: requirements/questionnaire.json with { free: [...], paid: [...] }
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

  const jsonPath = process.argv[2] || path.join(rootDir, 'requirements', 'questionnaire.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found:', jsonPath);
    console.error('Create requirements/questionnaire.json with { free: [...], paid: [...] }');
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

  const hasContent = (q) =>
    q &&
    typeof q === 'object' &&
    ((Array.isArray(q) && q.some((s) => Array.isArray(s?.questions))) ||
      (Array.isArray(q.free) && q.free.some((s) => Array.isArray(s?.questions))) ||
      (Array.isArray(q.paid) && q.paid.some((s) => Array.isArray(s?.questions))));

  if (Array.isArray(questionnaire)) {
    questionnaire = { free: questionnaire, paid: [] };
  } else if (!questionnaire || typeof questionnaire !== 'object' || !Array.isArray(questionnaire.free)) {
    console.error('questionnaire must be { free: [...], paid: [...] } or legacy array of sections');
    process.exit(1);
  }
  if (!Array.isArray(questionnaire.paid)) {
    questionnaire.paid = [];
  }
  if (!hasContent(questionnaire)) {
    console.error('questionnaire.free must have at least one section with questions');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: rows } = await supabase
    .from('assessments')
    .select('id, version, questionnaire')
    .order('created_at', { ascending: false })
    .limit(10);

  const target = Array.isArray(rows) ? rows.find((r) => hasContent(r.questionnaire)) ?? rows?.[0] : null;

  const version = `v1.0-${Date.now()}`;
  if (target?.id) {
    const { error } = await supabase
      .from('assessments')
      .update({ questionnaire, version })
      .eq('id', target.id);
    if (error) {
      console.error('Supabase error:', error.message);
      process.exit(1);
    }
    console.log('Updated assessment', target.id, 'version', version);
  } else {
    const { data: inserted, error } = await supabase
      .from('assessments')
      .insert({ questionnaire, version, language_key: 'en' })
      .select('id, version')
      .single();
    if (error) {
      console.error('Supabase error:', error.message);
      process.exit(1);
    }
    console.log('Created assessment', inserted?.id, 'version', inserted?.version);
  }
}

main();
