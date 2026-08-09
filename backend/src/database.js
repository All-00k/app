const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = require('./config');

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

let supabase = null;

if (SUPABASE_URL && supabaseKey) {
  try {
    supabase = createClient(SUPABASE_URL, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('⚡ Supabase client initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('⚠️ WARNING: Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY) are missing in .env');
}

async function getDb() {
  if (!supabase) {
    console.warn('⚠️ Supabase client is not configured. Please supply SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
    return null;
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('⚠️ Supabase Connected, but tables are missing. Please run `supabase_schema.sql` in your Supabase SQL Editor.');
      } else {
        console.warn('⚠️ Supabase connection warning:', error.message);
      }
    } else {
      console.log('✅ Supabase database connection verified successfully.');
    }
  } catch (e) {
    console.warn('⚠️ Supabase connection check error:', e.message);
  }

  return supabase;
}

function isSupabaseConfigured() {
  return !!supabase;
}

module.exports = {
  supabase,
  getDb,
  isSupabaseConfigured,
};
