const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do arquivo .env local se existir
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.log('Erro ao carregar arquivo .env local:', e.message);
}

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Servir arquivos públicos (guia anti-ban, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));


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

// ==========================================
// UTILITÁRIOS DE SEGURANÇA ANTI-BAN
// ==========================================

/**
 * Gera um delay aleatório entre minMs e maxMs milissegundos.
 * Delays aleatórios imitam comportamento humano e reduzem detecção de bot.
 */
const randomDelay = (minMs, maxMs) => {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log(`  ⏱️  Aguardando ${(ms / 1000).toFixed(1)}s (anti-ban)...`);
  return new Promise(r => setTimeout(r, ms));
};

/**
 * Simula presença ativa e digitação no WhatsApp antes de enviar a mensagem.
 * Isso imita o comportamento humano de abrir a conversa e digitar.
 */
const simulateTyping = async (companyId, phoneNumber, durationMs) => {
  const clean = phoneNumber.replace(/\D/g, '');
  try {
    // Sinaliza presença online
    await fetch(`http://localhost:8080/chat/updatePresence/${companyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': '123' },
      body: JSON.stringify({ number: clean, presence: 'composing' })
    });
    // Aguarda o tempo de "digitação" antes de enviar
    await new Promise(r => setTimeout(r, durationMs));
    // Volta ao status "disponível"
    await fetch(`http://localhost:8080/chat/updatePresence/${companyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': '123' },
      body: JSON.stringify({ number: clean, presence: 'paused' })
    });
  } catch (e) {
    // Não bloqueia o envio se a simulação falhar (endpoint pode não existir em todas as versões)
    console.warn(`  ⚠️  Simulação de digitação falhou (não bloqueante): ${e.message}`);
  }
};

// Evolution API Helper — com simulação de digitação integrada
const sendWahaMessage = async (companyId, phoneNumber, text) => {
  let clean = phoneNumber.replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }

  // Simula digitação por 2 a 5 segundos antes de enviar (imita humano)
  const typingDuration = Math.floor(Math.random() * 3000) + 2000;
  await simulateTyping(companyId, clean, typingDuration);

  const sendRes = await fetch(`http://localhost:8080/message/sendText/${companyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': '123' },
    body: JSON.stringify({ number: clean, text })
  });
  
  if (!sendRes.ok) throw new Error(`Evolution API returned ${sendRes.status}`);
  return sendRes;
};

const sendWahaMedia = async (companyId, phoneNumber, mediaType, mimeType, base64Media, fileName, caption = "") => {
  let clean = phoneNumber.replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }
  const rawBase64 = base64Media.includes('base64,') ? base64Media.split('base64,')[1] : base64Media;
  
  // Simula digitação por 2 a 5 segundos antes de enviar (imita humano)
  const typingDuration = Math.floor(Math.random() * 3000) + 2000;
  await simulateTyping(companyId, clean, typingDuration);

  const res = await fetch(`http://localhost:8080/message/sendMedia/${companyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': '123' },
    body: JSON.stringify({
      number: clean,
      mediatype: mediaType,
      mimetype: mimeType,
      media: rawBase64,
      fileName: fileName,
      caption: caption
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API returned ${res.status}: ${err}`);
  }
  return res;
};

// Helper to resolve Brazilian phone variants (with/without DDI 55, with/without extra 9)
function getPhoneVariants(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('55') && clean.length >= 12) {
    clean = clean.slice(2);
  }
  const variants = new Set();
  variants.add(clean);
  variants.add('55' + clean);
  
  if (clean.length === 10) {
    const ddd = clean.slice(0, 2);
    const local = clean.slice(2);
    const with9 = ddd + '9' + local;
    variants.add(with9);
    variants.add('55' + with9);
  } else if (clean.length === 11 && clean[2] === '9') {
    const ddd = clean.slice(0, 2);
    const local = clean.slice(3);
    const without9 = ddd + local;
    variants.add(without9);
    variants.add('55' + without9);
  }
  return Array.from(variants);
}

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
      console.log(`\n🚀 Iniciando campanha ${campaign.id}...`);
      
      // Marcar como enviando
      await supabaseAdmin.from('campaigns').update({ status: 'enviando' }).eq('id', campaign.id);
      
      const contacts = campaign.contacts;

      // ── Configuração de delay anti-ban ──────────────────────────────────────
      // delayMin: delay base configurado pelo usuário (padrão 20s), em milissegundos
      // delayMax: delay base + até 25 segundos extras aleatórios
      // Isso garante variação natural e imprevisível entre cada envio.
      const delayMinMs = (campaign.delay || 20) * 1000;
      const delayMaxMs = delayMinMs + 25000;

      // A cada BATCH_SIZE mensagens, o worker faz uma pausa longa (BATCH_PAUSE_MS)
      // simulando um humano que para para tomar um café ou atender outra coisa.
      const BATCH_SIZE = 50;
      const BATCH_PAUSE_MIN_MS = 10 * 60 * 1000; // 10 minutos
      const BATCH_PAUSE_MAX_MS = 15 * 60 * 1000; // 15 minutos
      // ────────────────────────────────────────────────────────────────────────

      let successCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        let messageText = '';
        let mediaAttachment = null;

        // Tenta fazer o parse para ver se a mensagem é um JSON contendo anexo
        const trimmedMsg = campaign.message.trim();
        if (trimmedMsg.startsWith('{') && trimmedMsg.endsWith('}')) {
          try {
            const parsed = JSON.parse(campaign.message);
            messageText = parsed.text || '';
            mediaAttachment = parsed.attachment || null;
          } catch(e) {
            messageText = campaign.message;
          }
        } else {
          messageText = campaign.message;
        }

        const msg = messageText.replace(/\{\{nome\}\}/gi, contact.nome);
        
        let messageStatus = 'sucesso';
        try {
          if (mediaAttachment) {
            await sendWahaMedia(
              campaign.company_id,
              contact.telefone,
              mediaAttachment.type,
              mediaAttachment.mimetype,
              mediaAttachment.base64,
              mediaAttachment.name,
              msg
            );
          } else {
            await sendWahaMessage(campaign.company_id, contact.telefone, msg);
          }
          successCount++;
          console.log(`  ✅ Enviado para ${contact.telefone} (${i+1}/${contacts.length})`);
        } catch (e) {
          messageStatus = 'erro';
          console.error(`  ❌ Falha para ${contact.telefone}: ${e.message}`);
        }

        // Atualiza progresso em tempo real no banco
        try {
          await supabaseAdmin.from('campaigns').update({
            status: `enviando:${i+1}/${contacts.length}|${contact.nome}|${contact.telefone}|${messageStatus}`
          }).eq('id', campaign.id);
        } catch (dbErr) {
          console.error('Erro ao atualizar progresso no banco:', dbErr.message);
        }

        // Não aplica delay após a última mensagem
        if (i < contacts.length - 1) {

          // ── PAUSA DE LOTE: a cada BATCH_SIZE envios, pausa longa ──────────
          const isEndOfBatch = (i + 1) % BATCH_SIZE === 0;
          if (isEndOfBatch) {
            const batchPauseMs = Math.floor(Math.random() * (BATCH_PAUSE_MAX_MS - BATCH_PAUSE_MIN_MS + 1)) + BATCH_PAUSE_MIN_MS;
            const batchPauseMin = (batchPauseMs / 60000).toFixed(1);
            console.log(`\n  🛡️  [ANTI-BAN] Lote de ${BATCH_SIZE} msgs concluído. Pausando por ${batchPauseMin} minutos para proteger o número...\n`);
            await new Promise(r => setTimeout(r, batchPauseMs));
          } else {
            // ── DELAY ALEATÓRIO entre mensagens individuais ───────────────
            await randomDelay(delayMinMs, delayMaxMs);
          }
        }
      }

      // Marcar como concluido
      await supabaseAdmin.from('campaigns').update({ 
        status: 'concluido', 
        completed_at: new Date().toISOString() 
      }).eq('id', campaign.id);
      
      console.log(`\n✅ Campanha ${campaign.id} finalizada. Enviados: ${successCount}/${contacts.length}.`);
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${aiApiKey}`, {
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

      console.log('Trace 1: Querying companies message_templates...');
      const { data: compData, error: compErr } = await supabaseAdmin.from('companies').select('message_templates').eq('id', companyId).single();
      console.log(`Trace 2: companies query completed. compData: ${JSON.stringify(compData)}, error: ${compErr?.message}`);
      const triggerPhrase = compData?.message_templates?.whatsapp_trigger_phrase;
      
      const cleanPhone = phone.startsWith('55') ? phone.slice(2) : phone;
      const variants = getPhoneVariants(phone);
      console.log(`Trace 3: Querying leads. cleanPhone: ${cleanPhone}, variants: ${JSON.stringify(variants)}`);
      
      const orFilter = variants.map(v => `telefone.eq.${v}`).join(',');
      const { data: existingLeads, error: leadCheckErr } = await supabaseAdmin
        .from('leads')
        .select('id, ai_paused')
        .eq('company_id', companyId)
        .or(orFilter);

      console.log(`Trace 4: leads query completed. count: ${existingLeads?.length}, Error: ${leadCheckErr?.message}`);

      // Se o lead já existe no banco:
      if (existingLeads && existingLeads.length > 0) {
        const lead = existingLeads[0];
        const aiEnabled = compData?.message_templates?.ai_enabled;
        const aiPrompt = compData?.message_templates?.ai_prompt;
        const aiApiKey = compData?.message_templates?.ai_api_key;

        console.log(`Trace 5: Lead found. ai_paused: ${lead.ai_paused}, aiEnabled: ${aiEnabled}`);
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

// ==========================================
// WEBHOOK DO ASAAS PARA ASSINATURAS
// ==========================================
app.post('/asaas-webhook', async (req, res) => {
  const payload = req.body;
  
  // Acknowledge Asaas immediately
  res.status(200).send('OK');

  try {
    const { event, payment } = payload;
    console.log(`\n=== ASAAS WEBHOOK RECEBIDO ===`);
    console.log(`Evento: ${event}`);
    if (payment) {
      console.log(`Pagamento ID: ${payment.id}, Customer ID: ${payment.customer}, Valor: ${payment.value}`);
    }

    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      console.log(`[IGNORE] Evento ignorado: ${event}`);
      return;
    }

    if (!payment || !payment.customer) {
      console.error('❌ Pagamento ou cliente não informado no payload.');
      return;
    }

    const customerId = payment.customer;
    const paymentValue = payment.value;

    // Buscar chave de API do Asaas (process.env.ASAAS_API_KEY)
    const asaasApiKey = process.env.ASAAS_API_KEY || '';

    if (!asaasApiKey) {
      console.warn('⚠️ AVISO: ASAAS_API_KEY não configurada. A busca de e-mail/telefone na API do Asaas falhará.');
    }

    console.log(`Buscando detalhes do cliente ${customerId} no Asaas...`);
    let customerDetails = null;

    if (asaasApiKey) {
      try {
        const asaasRes = await fetch(`https://www.asaas.com/api/v3/customers/${customerId}`, {
          method: 'GET',
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json'
          }
        });
        if (asaasRes.ok) {
          customerDetails = await asaasRes.json();
          console.log(`Cliente localizado no Asaas: Email: ${customerDetails.email}, Telefone: ${customerDetails.mobilePhone}`);
        } else {
          console.warn(`Aviso: Falha ao buscar cliente no Asaas (Status: ${asaasRes.status}).`);
        }
      } catch (apiErr) {
        console.error('Erro na requisição da API Asaas:', apiErr.message);
      }
    }

    let companyId = null;

    // 1. Tentar correspondência por e-mail se conseguimos carregar da API do Asaas
    if (customerDetails && customerDetails.email) {
      const emailMatch = customerDetails.email.trim().toLowerCase();
      console.log(`Buscando empresa pelo e-mail: ${emailMatch}`);
      const { data: roleData, error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .select('company_id')
        .eq('email', emailMatch)
        .limit(1);

      if (roleData && roleData.length > 0) {
        companyId = roleData[0].company_id;
        console.log(`Empresa localizada via e-mail: ${companyId}`);
      } else if (roleErr) {
        console.error('Erro ao buscar por e-mail:', roleErr.message);
      }
    }

    // 2. Se não localizou por e-mail, tentar por telefone (usando celular do Asaas ou dados do payload)
    if (!companyId && customerDetails && customerDetails.mobilePhone) {
      const phoneMatch = customerDetails.mobilePhone.replace(/\D/g, '');
      if (phoneMatch) {
        const variants = getPhoneVariants(phoneMatch);
        console.log(`Buscando empresa pelas variantes de telefone: ${JSON.stringify(variants)}`);
        const orFilter = variants.map(v => `phone.eq.${v}`).join(',');
        const { data: compData, error: compErr } = await supabaseAdmin
          .from('companies')
          .select('id')
          .or(orFilter)
          .order('created_at', { ascending: false })
          .limit(1);

        if (compData && compData.length > 0) {
          companyId = compData[0].id;
          console.log(`Empresa localizada via telefone (Asaas API): ${companyId}`);
        } else if (compErr) {
          console.error('Erro ao buscar por telefone:', compErr.message);
        }
      }
    }

    if (!companyId) {
      console.error('❌ Não foi possível associar o pagamento a nenhuma empresa ativa no banco de dados.');
      return;
    }

    // Buscar dados atuais da empresa para somar a data
    console.log(`Carregando dados da empresa ${companyId}...`);
    const { data: company, error: companyErr } = await supabaseAdmin
      .from('companies')
      .select('id, name, trial_ends_at, plan')
      .eq('id', companyId)
      .single();

    if (companyErr || !company) {
      console.error(`Erro ao carregar empresa ${companyId}:`, companyErr?.message);
      return;
    }

    // Calcular nova data de expiração
    const now = new Date();
    let baseDate = now;
    
    if (company.trial_ends_at) {
      const currentExpiry = new Date(company.trial_ends_at);
      if (currentExpiry > now) {
        // Se a assinatura ainda está ativa/no futuro, somamos a partir dela!
        baseDate = currentExpiry;
        console.log(`Assinatura ativa até ${currentExpiry.toISOString()}. Somando a partir daí.`);
      } else {
        console.log(`Assinatura anterior expirada em ${currentExpiry.toISOString()}. Definindo a partir de agora.`);
      }
    } else {
      console.log(`Nenhuma expiração anterior registrada. Definindo a partir de agora.`);
    }

    // Adiciona exatamente 30 dias (30 * 24 * 60 * 60 * 1000 milissegundos)
    const newExpiryDate = new Date(baseDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    console.log(`Nova data de expiração calculada: ${newExpiryDate.toISOString()}`);

    // Identificar o plano com base no valor pago
    let matchedPlan = company.plan || 'Pequenos Negócios';
    if (paymentValue >= 40 && paymentValue <= 60) {
      matchedPlan = 'Vendedor Solo';
    } else if (paymentValue >= 60 && paymentValue <= 85) {
      matchedPlan = 'Pequenos Negócios';
    } else if (paymentValue >= 85 && paymentValue <= 110) {
      matchedPlan = 'Equipe Pro';
    }
    console.log(`Plano identificado pelo valor R$ ${paymentValue}: ${matchedPlan}`);

    // Atualizar no banco de dados
    const { data: updateRes, error: updateErr } = await supabaseAdmin
      .from('companies')
      .update({
        subscription_status: 'active',
        trial_ends_at: newExpiryDate.toISOString(),
        plan: matchedPlan,
        asaas_customer_id: customerId
      })
      .eq('id', companyId)
      .select();

    if (updateErr) {
      console.error('❌ Erro ao atualizar assinatura da empresa:', updateErr.message);
    } else {
      console.log(`✅ Assinatura da empresa "${company.name}" atualizada com sucesso para ${newExpiryDate.toISOString()} (${matchedPlan})`);

      // ── Dispara mensagem de boas-vindas automática ao novo assinante ──
      if (customerDetails && customerDetails.mobilePhone) {
        const nomeCliente = customerDetails.name || company.name || 'Cliente';
        const phone = customerDetails.mobilePhone.replace(/\D/g, '');
        sendWelcomeMessage('superadmin', phone, nomeCliente, 'assinante').catch(e =>
          console.warn('⚠️ Falha ao enviar boas-vindas (Asaas):', e.message)
        );
      }
    }

  } catch (err) {
    console.error('❌ Erro crítico no processamento do webhook do Asaas:', err.message);
  }
});

// ==========================================
// SISTEMA DE BOAS-VINDAS AUTOMÁTICO
// ==========================================

const GUIDE_URL = `https://app.nexalecrm.com.br/guia-antiban-nexale.html`;

/**
 * Envia sequência de boas-vindas via WhatsApp para um novo usuário.
 * @param {string} companyId - ID da instância Evolution API
 * @param {string} phone     - Número do cliente (só dígitos)
 * @param {string} nome      - Nome do cliente
 * @param {string} tipo      - 'trial' ou 'assinante'
 */
async function sendWelcomeMessage(companyId, phone, nome, tipo) {
  const primeiroNome = nome.split(' ')[0];
  const isTrial = tipo === 'trial';

  const msgs = [
    `🎉 Olá, ${primeiroNome}! Seja bem-vindo ao *Nexale CRM*!\n\n${
      isTrial
        ? 'Seu período de teste de *14 dias* está ativo. Fique à vontade para explorar todas as funcionalidades!'
        : `Sua assinatura está confirmada e ativa. Obrigado por confiar no Nexale CRM! 🚀`
    }`,
    `📋 *Antes de começar*, leia nosso *Guia de Boas Práticas Anti-Ban*. Ele é essencial para manter seu número do WhatsApp seguro e com alta capacidade de envio.\n\n🔗 Acesse aqui: ${GUIDE_URL}`,
    `✅ *Próximos passos:*\n\n1️⃣ Prepare um número de WhatsApp exclusivo para o CRM\n2️⃣ Leia o guia completo (link acima)\n3️⃣ Escaneie o QR Code no painel para conectar\n4️⃣ Configure a IA com as instruções do seu negócio\n\nQualquer dúvida, é só chamar! 😊`
  ];

  for (let i = 0; i < msgs.length; i++) {
    // Pequena pausa entre as mensagens para não parecer spam
    if (i > 0) await new Promise(r => setTimeout(r, 3000));
    try {
      await sendWahaMessage(companyId, phone, msgs[i]);
      console.log(`  ✅ Boas-vindas msg ${i + 1}/3 enviada para ${phone}`);
    } catch (e) {
      console.warn(`  ⚠️ Falha na msg ${i + 1}/3 para ${phone}: ${e.message}`);
    }
  }

  console.log(`🎉 Sequência de boas-vindas concluída para ${primeiroNome} (${phone})`);
}

// Endpoint chamado pelo Auth.jsx após signup (trial)
app.post('/enviar-boas-vindas', async (req, res) => {
  const { phone, nome, companyId, tipo } = req.body;

  if (!phone || !nome || !companyId) {
    return res.status(400).json({ error: 'phone, nome e companyId são obrigatórios.' });
  }

  // Responde imediatamente (não bloqueia o cadastro)
  res.status(200).json({ ok: true, message: 'Boas-vindas agendadas!' });

  // Dispara em background
  sendWelcomeMessage(companyId, phone, nome, tipo || 'trial').catch(e =>
    console.warn('⚠️ Erro no envio de boas-vindas (endpoint):', e.message)
  );
});

// ==========================================
// ENDPOINT DO SAC INTELIGENTE (CHATBOT IA)
// ==========================================
app.get('/sac-chat', (req, res) => {
  res.send('SAC ONLINE');
});

app.post('/sac-chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia.' });
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error('❌ Erro no SAC Chat: GEMINI_API_KEY não está configurada no ambiente.');
      return res.status(500).json({ error: 'Erro de configuração do servidor de IA.' });
    }

    const systemInstruction = `Você é a "Nexa", assistente inteligente de suporte técnico do Nexale CRM.
Seu objetivo é responder a dúvidas dos usuários/assinantes sobre a nossa plataforma com tom profissional, prestativo, rápido e amigável.

Informações Importantes do Nexale CRM:
1. Funcionalidades do Sistema:
   - Funil Kanban de Vendas personalizável por nicho de mercado (ex: imobiliária, concessionária, escolas, clínicas, etc.).
   - Disparo em massa de Campanhas de mensagens no WhatsApp.
   - Atendimento integrado e inteligente com Inteligência Artificial (Gemini) respondendo leads e clientes automaticamente.
   - Scraping/Captador Automático de leads B2B buscando dados de CNPJs locais na internet.
   - Relatórios e Dashboards analíticos de faturamento em tempo real.
2. Planos e Preços:
   - Vendedor Solo (R$ 49/mês): Recomendado para 1 usuário (gerente), inclui funil Kanban e disparos de WhatsApp.
   - Pequenos Negócios (R$ 79/mês): Recomendado para até 3 usuários, inclui dashboards de relatórios e suporte prioritário.
   - Equipe Pro (R$ 99/mês): Recomendado para até 10 usuários, inclui o Captador B2B Automático e suporte VIP no WhatsApp.
3. Como conectar o WhatsApp no CRM:
   - Vá no menu de configurações do WhatsApp ou clique no ícone de conexão do WhatsApp, gere o QR Code clicando em "Conectar WhatsApp" e escaneie com o app do WhatsApp no seu celular (como faz no WhatsApp Web).
4. Suporte Humano:
   - Se o cliente perguntar algo complexo sobre cobranças específicas, reembolso, bugs técnicos ou pedir explicitamente para falar com um humano, instrua-o de forma atenciosa a entrar em contato com o suporte humano no WhatsApp ou a abrir um chamado.

Regras de Atendimento:
- Responda em português de forma clara, formatando a resposta com parágrafos curtos, emojis de forma sóbria e marcadores para facilitar a leitura.
- Seja breve e direto ao ponto nas respostas para não alongar demais a leitura.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(h => {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contents
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro na API do Gemini: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ reply: replyText.trim() });
  } catch (error) {
    console.error('Erro no SAC Chat:', error.message);
    res.status(500).json({ error: 'Erro ao processar a resposta da IA. Tente novamente mais tarde.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`📡 Webhook Server escutando na porta ${PORT}`);
});

