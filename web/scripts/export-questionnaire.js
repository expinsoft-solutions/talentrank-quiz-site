#!/usr/bin/env node
/**
 * Export questionnaire from assessments table to requirements/questionnaire_v1.json.
 * Run from web: npm run questionnaire:export
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
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in web/.env.local)');
    process.exit(1);
  }

  const outPath = process.argv[2] || path.join(rootDir, 'requirements', 'questionnaire_v1.json');
  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from('assessments')
    .select('id, version, questionnaire')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Assessments fetch error:', error.message);
    process.exit(1);
  }
  const hasContent = (q) =>
    Array.isArray(q) && q.length > 0 && q.some((s) => Array.isArray(s?.questions));
  const row = Array.isArray(rows) ? rows.find((r) => hasContent(r.questionnaire)) ?? rows[0] : null;
  if (!row?.questionnaire) {
    console.error('No questionnaire found in assessments table');
    console.error('Run: npm run questionnaire:load (with requirements/questionnaire_v1.json)');
    process.exit(1);
  }

  const questionnaire = Array.isArray(row.questionnaire) ? row.questionnaire : [];
  fs.writeFileSync(outPath, JSON.stringify(questionnaire, null, 2), 'utf8');
  const sectionCount = questionnaire.length;
  const questionCount = questionnaire.reduce((sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : 0), 0);
  console.log('Exported', sectionCount, 'sections,', questionCount, 'questions to', outPath);
}

main();
