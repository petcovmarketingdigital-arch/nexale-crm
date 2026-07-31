const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE);

async function setNexaleSuperadmin() {
  console.log('--- Setting nexale@gmail.com as superadmin ---');
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .update({ role: 'superadmin' })
    .eq('email', 'nexale@gmail.com')
    .select();

  console.log('Update result:', data, error);
}

setNexaleSuperadmin();
