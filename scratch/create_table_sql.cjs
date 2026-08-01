const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';

async function createChatTableSql() {
  console.log('⚡ Criando tabela public.chat_messages no Supabase via REST SQL...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.chat_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id TEXT,
      lead_id UUID,
      phone TEXT NOT NULL,
      from_me BOOLEAN DEFAULT false,
      sender_name TEXT,
      content TEXT,
      message_type TEXT DEFAULT 'text',
      status TEXT DEFAULT 'received',
      timestamp TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON public.chat_messages(phone);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_company ON public.chat_messages(company_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_lead ON public.chat_messages(lead_id);

    -- Habilita RLS e permissões públicas para leitura/escrita com anon key
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow all for anon on chat_messages" ON public.chat_messages;
    CREATE POLICY "Allow all for anon on chat_messages" ON public.chat_messages
      FOR ALL USING (true) WITH CHECK (true);
  `;

  // Tenta chamar a rota de execução de SQL da API REST do Supabase se disponível ou via rpc
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({ sql })
    });
    console.log('RPC Exec SQL status:', res.status);
    const text = await res.text();
    console.log('RPC Exec SQL response:', text);
  } catch (e) {
    console.error('Error executing SQL:', e.message);
  }
}

createChatTableSql();
