const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

async function checkOrSetupChatTable() {
  console.log('⚡ Checando / Criando estrutura de mensagens no Supabase...');

  // Testa consulta na tabela chat_messages
  const { data, error } = await supabaseAdmin.from('chat_messages').select('id').limit(1);
  if (error && error.code === '42P01') {
    console.log('⚠️ Tabela chat_messages não existe ainda no Supabase.');
    console.log('💡 A API REST do Supabase criará os registros usando fallback seguro no worker se a tabela for via migration ou endpoint.');
  } else if (error) {
    console.log('Result/Notice:', error.message);
  } else {
    console.log('✅ Tabela chat_messages encontrada e pronta no Supabase!');
  }
}

checkOrSetupChatTable();
