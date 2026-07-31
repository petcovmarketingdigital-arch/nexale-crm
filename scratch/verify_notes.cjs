const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

async function verifyNotes() {
  const { data, error } = await supabaseAdmin.from('lead_notes').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Latest notes:', data);
}

verifyNotes();
