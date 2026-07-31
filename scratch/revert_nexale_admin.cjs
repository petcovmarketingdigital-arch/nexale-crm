const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE);

async function revertNexaleAdmin() {
  console.log('--- Reverting nexale@gmail.com back to admin ---');
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .update({ role: 'admin' })
    .eq('email', 'nexale@gmail.com')
    .select();

  console.log('Revert result:', data, error);
}

revertNexaleAdmin();
