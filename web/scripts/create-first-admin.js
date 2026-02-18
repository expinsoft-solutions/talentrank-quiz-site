#!/usr/bin/env node
/**
 * Create the first admin user (bootstrap when no admins exist).
 * Run from repo root: npm run admin:create-first
 * Or: ADMIN_EMAIL=x@y.com ADMIN_PASSWORD=secret node web/scripts/create-first-admin.js
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
 * (in web/.env.local or as env vars)
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
loadEnv(path.join(webDir, '.env'));

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const env = process.env;
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const email = env.ADMIN_EMAIL || process.argv[2];
  const password = env.ADMIN_PASSWORD || process.argv[3];

  if (!url || !key) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in web/.env or .env.local)');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npm run admin:create-first');
    console.error('   Or: npm run admin:create-first admin@example.com yourpassword');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }

  if (!authUser.user?.id) {
    console.error('Failed to create auth user');
    process.exit(1);
  }

  const { error: usersError } = await supabase
    .from('users')
    .upsert(
      {
        email: email.trim().toLowerCase(),
        role: 'admin',
        auth_user_id: authUser.user.id,
      },
      { onConflict: 'email' }
    );

  if (usersError) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin', auth_user_id: authUser.user.id })
      .eq('email', email.trim().toLowerCase());
    if (updateError) {
      console.error('Users table error:', updateError.message);
      process.exit(1);
    }
  }

  console.log('First admin created:', email);
  console.log('Log in at /admin/login');
}

main();
