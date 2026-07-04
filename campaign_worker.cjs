const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

// Supabase Connection
const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbHliaWlma2FtYmVic2N5ZHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTA1MTQsImV4cCI6MjA5NzM4NjUxNH0.WiKUGZfvle5pQap7m4Hoc_SUWe3d1wpqsS3NKt1zKUE';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

// Evolution API Helper
const sendWahaMessage = async (companyId, phoneNumber, text) => {
  const clean = phoneNumber.replace(/\D/g, '');
  
  const sendRes = await fetch(`http://localhost:8080/message/sendText/${companyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': '123' },
    body: JSON.stringify({ number: clean, text })
  });
  
  if (!sendRes.ok) throw new Error(`Evolution API returned ${sendRes.status}`);
  return sendRes;
};

// Main Worker Logic
async function processCampaigns() {
  console.log(`[${new Date().toISOString()}] Checking for scheduled campaigns...`);
  try {
    // Buscar campanhas pendentes cuja data de agendamento seja <= agora
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('status', 'pendente')
      .lte('scheduled_for', new Date().toISOString());

    if (error) throw error;
    if (!campaigns || campaigns.length === 0) return;

    console.log(`Found ${campaigns.length} campaigns to process.`);

    for (const campaign of campaigns) {
      console.log(`Processing campaign ${campaign.id}...`);
      
      // Marcar como enviando
      await supabaseAdmin.from('campaigns').update({ status: 'enviando' }).eq('id', campaign.id);
      
      const contacts = campaign.contacts;
      const delayMs = (campaign.delay || 20) * 1000;
      let successCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const msg = campaign.message.replace(/\{\{nome\}\}/gi, contact.nome);
        
        try {
          await sendWahaMessage(campaign.company_id, contact.telefone, msg);
          successCount++;
          console.log(`  Sent to ${contact.telefone} (${i+1}/${contacts.length})`);
        } catch (e) {
          console.error(`  Failed for ${contact.telefone}: ${e.message}`);
        }

        if (i < contacts.length - 1) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      // Marcar como concluido
      await supabaseAdmin.from('campaigns').update({ 
        status: 'concluido', 
        completed_at: new Date().toISOString() 
      }).eq('id', campaign.id);
      
      console.log(`Campaign ${campaign.id} finished. Sent ${successCount}/${contacts.length}.`);
    }

  } catch (err) {
    console.error('Error processing campaigns:', err);
  }
}

// Inicia o loop a cada minuto
console.log('🚀 Campaign Worker Started!');
processCampaigns();
setInterval(processCampaigns, 60000);

// ==========================================
// FUNÇÕES AUXILIARES DA IA (GEMINI)
// ==========================================
async function respondWithGemini(companyId, leadId, phone, textContent, aiPrompt, aiApiKey) {
  if (!aiApiKey || aiApiKey.trim() === "") {
    console.error("❌ Chave de API do Gemini não configurada.");
    return;
  }

  try {
    // 1. Busca histórico de notas do lead para servir como contexto
    const { data: notes } = await supabaseAdmin
      .from("lead_notes")
      .select("nota")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(10);

    let historyText = "";
    if (notes && notes.length > 0) {
      historyText = notes.map(n => n.nota).join("\n");
    }

    // 2. Monta o prompt
    const systemInstruction = aiPrompt || "Você é um atendente virtual simpático da nossa empresa.";
    const prompt = `Instruções de comportamento:\n${systemInstruction}\n\nHistórico de mensagens anteriores:\n${historyText}\n\nMensagem atual do cliente: ${textContent}\nAtendente (IA):`;

    console.log(`🤖 Chamando API do Gemini com o prompt...`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro na API do Gemini: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText || replyText.trim() === "") {
      throw new Error("Retorno vazio da API do Gemini.");
    }

    const cleanedReply = replyText.trim();
    console.log(`🤖 Resposta gerada: "${cleanedReply}"`);

    // 3. Envia a resposta via WhatsApp
    await sendWahaMessage(companyId, phone, cleanedReply);

    // 4. Salva a conversa no histórico de notas
    const { data: leadData } = await supabaseAdmin.from("leads").select("user_id").eq("id", leadId).single();
    const userId = leadData ? leadData.user_id : null;

    // Registra a mensagem do cliente no histórico
    await supabaseAdmin.from("lead_notes").insert([{
      lead_id: leadId,
      user_id: userId,
      nota: `Cliente: ${textContent}`
    }]);

    // Registra a resposta da IA no histórico
    await supabaseAdmin.from("lead_notes").insert([{
      lead_id: leadId,
      user_id: userId,
      nota: `Atendente (IA): ${cleanedReply}`
    }]);

    console.log(`✅ Notas de interação salvas para o lead ${leadId}`);
  } catch (err) {
    console.error("❌ Erro no respondWithGemini:", err.message);
  }
}

// ==========================================
// SERVIDOR WEBHOOK PARA CAPTAÇÃO DE LEADS
// ==========================================
app.post('/webhook/:companyId', async (req, res) => {
  const companyId = req.params.companyId;
  const payload = req.body;
  
  res.status(200).send('OK');

  console.log(`\n\n=== WEBHOOK RECEBIDO DE ${companyId} ===`);
  console.log(`Event: ${payload.event}`);
  
  if (payload.event === 'messages.upsert') {
    try {
      const msgData = payload.data;
      if (!msgData || !msgData.key) return;
      if (msgData.key.fromMe) return; 
      if (msgData.key.remoteJid && msgData.key.remoteJid.includes('@g.us')) return; 

      console.log('--- START PROCESS WEBHOOK ---');
      const phone = msgData.key.remoteJid.split('@')[0];
      let pushName = msgData.pushName || 'Novo Contato (WhatsApp)';

      // O companyId já foi extraído via req.params.companyId na linha 101
      const messageObj = msgData.message || {};
      const textContent = messageObj.conversation || (messageObj.extendedTextMessage && messageObj.extendedTextMessage.text) || '';

      console.log(`CompanyId: ${companyId}`);
      console.log(`Phone: ${phone}`);
      console.log(`TextContent: ${textContent}`);

      // Verifica se a empresa configurou um Gatilho
      const { data: compData } = await supabaseAdmin.from('companies').select('message_templates').eq('id', companyId).single();
      const triggerPhrase = compData?.message_templates?.whatsapp_trigger_phrase;
      
      const { data: existingLeads, error: leadCheckErr } = await supabaseAdmin
        .from('leads')
        .select('id, ai_paused')
        .eq('company_id', companyId)
        .eq('telefone', phone);

      console.log(`Existing Leads Count: ${existingLeads?.length}, Error: ${leadCheckErr?.message}`);

      // Se o lead já existe no banco:
      if (existingLeads && existingLeads.length > 0) {
        const lead = existingLeads[0];
        const aiEnabled = compData?.message_templates?.ai_enabled;
        const aiPrompt = compData?.message_templates?.ai_prompt;
        const aiApiKey = compData?.message_templates?.ai_api_key;

        // Se a IA estiver ativada e o atendimento não estiver pausado (human takeover):
        if (aiEnabled && !lead.ai_paused) {
          console.log(`🤖 Lead ${phone} existe e IA está ATIVA. Chamando Gemini...`);
          await respondWithGemini(companyId, lead.id, phone, textContent, aiPrompt, aiApiKey);
        } else {
          console.log(`Lead ${phone} já existe mas a IA está desativada ou pausada. Parando.`);
        }
        return; 
      }

      // Se o lead não existe no banco, só podemos cadastrar se ele enviou a frase gatilho!
      if (!triggerPhrase || triggerPhrase.trim() === '') {
        console.log(`[IGNORE] Mensagem de desconhecido ${phone} recebida, mas sem frase gatilho configurada na empresa.`);
        return;
      }

      const removePunctuation = str => str.replace(/[^\w\sÀ-ÿ]/g, '').trim().toLowerCase();
      const normalizedText = removePunctuation(textContent);
      const normalizedTrigger = removePunctuation(triggerPhrase);
      
      if (!normalizedText.includes(normalizedTrigger)) {
        console.log(`[IGNORE] Mensagem de desconhecido ${phone} não contém a frase gatilho.`);
        return;
      }

      const { data: adminRole, error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('company_id', companyId)
        .limit(1)
        .single();
      
      console.log(`AdminRole fetch error: ${roleErr?.message}`);
      const userId = adminRole ? adminRole.id : null;
      console.log(`UserId defined as: ${userId}`);

      console.log('Tentando inserir lead...');
      const { data: insertRes, error: insertErr } = await supabaseAdmin.from('leads').insert([{
        company_id: companyId,
        user_id: userId,
        empresa: pushName,
        contato: pushName,
        telefone: phone,
        tipo: 'Pessoa Física',
        status_amostra: 'Frio',
        coluna_id: 'leads',
        metragem: 'Captado automaticamente pelo WhatsApp',
        valor: 0,
        kits: 0,
        origem: 'Link de WhatsApp'
      }]).select('id');

      if (insertErr) {
        console.error('❌ Erro ao inserir lead:', insertErr);
      } else {
        console.log(`✅ Lead inserido com sucesso para a empresa ${companyId}`);
        
        const aiEnabled = compData?.message_templates?.ai_enabled;
        const aiPrompt = compData?.message_templates?.ai_prompt;
        const aiApiKey = compData?.message_templates?.ai_api_key;
        const newLeadId = insertRes?.[0]?.id;

        // Se a IA estiver ativa na primeira mensagem, responde com IA. Caso contrário, manda resposta padrão estática:
        if (aiEnabled && newLeadId) {
          console.log(`🤖 Novo lead ${phone} cadastrado e IA está ATIVA. Respondendo com Gemini...`);
          await respondWithGemini(companyId, newLeadId, phone, textContent, aiPrompt, aiApiKey);
        } else {
          const autoReply = "Olá! Já recebemos sua mensagem. Em instantes um especialista da nossa equipe falará com você por aqui mesmo!";
          await sendWahaMessage(companyId, phone, autoReply);
        }
      }
    } catch (err) {
      console.error('❌ Erro no processamento do webhook:', err);
    }
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`📡 Webhook Server escutando na porta ${PORT}`);
});
