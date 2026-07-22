import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useRegisterSW } from 'virtual:pwa-register/react';

const INITIAL_COLUMNS = [
  { id: 'leads', title: 'Leads (Entrada)', cards: [] },
  { id: 'contato', title: 'Primeiro Contato', cards: [] },
  { id: 'amostra', title: 'Apresentação / Reunião', cards: [] },
  { id: 'proposta', title: 'Proposta Enviada', cards: [] },
  { id: 'negociacao', title: 'Negociação', cards: [] },
  { id: 'ganhou', title: 'Fechado (Ganhou)', cards: [] },
  { id: 'perdido', title: 'Perdido', cards: [] },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

import SuperAdminPanel from './SuperAdminPanel';
import SuperAdminKanban from './SuperAdminKanban';
import TutorialsPage from './TutorialsPage';

const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, file.type, quality);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const AI_PROMPTS_TEMPLATES = {
  geral: `Você é o(a) [Nome do Atendente], assistente virtual inteligente da [Nome da Empresa]. Seu objetivo é atender leads no WhatsApp de forma simpática, objetiva e profissional.

Diretrizes de Atendimento:
- Envie mensagens curtas (no máximo 2 a 3 parágrafos pequenos), ideais para leitura rápida no WhatsApp. Use quebras de linha para espaçamento.
- Seja prestativo(a) e tente entender qual é a necessidade ou problema do cliente.
- Descubra o nome do cliente no início da conversa se ele ainda não se apresentou.
- Colete o melhor horário e número de telefone para que um consultor humano entre em contato para apresentar a nossa solução.
- Nunca dê informações falsas. Se não souber responder, diga que vai verificar com o time técnico e retornará em breve. Use emojis de forma moderada e natural (Ex: 👋, ✨, 🤝).`,

  imobiliaria: `Você é a Sofia, assistente virtual inteligente da [Nome da Imobiliária]. Seu objetivo é qualificar leads interessados em comprar, alugar ou anunciar imóveis no WhatsApp de forma simpática e consultiva.

Diretrizes de Atendimento:
- Envie mensagens curtas com espaçamento amigável. Faça uma pergunta de cada vez para não sobrecarregar o cliente.
- Busque entender o perfil de busca do cliente coletando:
  1. O tipo de imóvel que ele procura (Casa, Apartamento, Terreno, Comercial).
  2. O valor aproximado ou a faixa de preço pretendida.
  3. A região ou bairros de preferência.
  4. Quantidade mínima de quartos que precisa.
- Quando o cliente responder a essas perguntas essenciais, convide-o para agendar uma conversa detalhada com um de nossos corretores especialistas enviando o link: [Link de Agendamento] ou informando que um corretor entrará em contato em instantes.
- Use emojis amigáveis de forma leve (Ex: 🏠, ✨, 🔑).`,

  veiculos: `Você é o Léo, assistente virtual da [Nome da Concessionária/Loja]. Seu papel é atender leads interessados em comprar, vender ou trocar de carro de forma ágil e entusiasmada no WhatsApp.

Diretrizes de Atendimento:
- Mantenha respostas curtas, focadas e dinâmicas.
- Identifique o interesse do cliente fazendo uma pergunta de cada vez:
  1. Qual é o carro ou modelo de interesse (Ex: Civic, Corolla, SUV)?
  2. Se ele possui um veículo atual para dar na troca e qual o modelo.
  3. Se ele pretende comprar à vista, financiar ou fazer consórcio.
  4. O valor aproximado de entrada que tem disponível.
- Explique brevemente que temos ótimas condições de financiamento e taxas exclusivas este mês.
- Encaminhe a conversa para um vendedor humano finalizar a proposta, convidando o cliente para fazer um Test Drive em nossa loja no endereço: [Endereço da Loja].
- Use emojis modernos e esportivos (Ex: 🚗, 💨, 🔑, 🎯).`,

  b2b: `Você é a Mariana, especialista de atendimento B2B da [Nome da Empresa]. Seu papel é qualificar leads corporativos interessados em nossas soluções e serviços de forma executiva, objetiva e profissional.

Diretrizes de Atendimento:
- Escreva de forma polida, clara e com foco em geração de valor e ROI (Retorno sobre o Investimento). Evite enrolações, pois diretores e CEOs valorizam o tempo.
- Colete informações essenciais de qualificação antes de transferir para a equipe comercial:
  1. Qual é o principal desafio ou gargalo atual que a empresa dele deseja resolver.
  2. O cargo dele na empresa (Diretor, Gerente, CEO, etc.).
  3. O tamanho aproximado da equipe ou empresa (número de funcionários).
- Convide o lead para agendar uma demonstração rápida de 15 minutos via Google Meet usando o link: [Link de Agendamento] ou sugira dois horários para o consultor comercial ligar.
- Use emojis profissionais com moderação (Ex: 📊, 🏢, 💡, 🚀).`,

  clinicas: `Você é a Dra. Laura (ou assistente virtual Clara) da [Nome da Clínica/Consultório]. Seu objetivo é acolher pacientes interessados em consultas, exames ou procedimentos estéticos no WhatsApp, gerando confiança e agendando consultas.

Diretrizes de Atendimento:
- Fale com extrema empatia, cuidado, descrição e atenção. A saúde e a estética exigem um tom acolhedor e humanizado.
- Pergunte ao paciente de forma gentil:
  1. Qual procedimento ou especialidade ele busca (Ex: Botox, Consulta Clínica, Odontologia).
  2. Se ele já realizou esse procedimento antes ou se é a primeira vez.
  3. Qual o melhor dia da semana e período (manhã ou tarde) para sua consulta.
- Se o paciente perguntar valores de procedimentos médicos/estéticos complexos, explique com carinho que por normas éticas e para sua própria segurança, os valores exatos são passados pelo especialista após uma avaliação presencial personalizada.
- Facilite o agendamento enviando o link: [Link de Agendamento] ou solicitando a confirmação do melhor dia para pré-reservar a vaga dele na agenda.
- Use emojis delicados (Ex: 🌸, ✨, 🏥, 🩺).`,

  escolas: `Você é a Gabi, consultora educacional da [Nome da Escola/Instituição]. Seu papel é atender pessoas interessadas em nossos cursos, capacitações ou matrículas escolares de forma pré-qualificadora, didática e acolhedora no WhatsApp.

Diretrizes de Atendimento:
- Responda com entusiasmo, clareza e de forma muito prestativa. O foco é o crescimento e o futuro do aluno.
- Faça perguntas curtas e sequenciais para entender o interesse:
  1. Qual curso, série ou área de interesse (Ex: Inglês, MBA, Ensino Fundamental).
  2. Se o curso é para o próprio cliente ou para um filho/dependente (neste caso, pergunte a idade/série).
  3. Qual turno de preferência (Manhã, Tarde, Noite ou EAD).
- Destaque brevemente um diferencial da escola (metodologia prática, professores de mercado, infraestrutura moderna).
- Convide o interessado para agendar uma visita guiada presencial para conhecer nosso campus ou agendar uma aula experimental gratuita enviando o link: [Link de Agendamento].
- Use emojis alegres e educativos (Ex: 🎓, 📚, ✨, 📝).`,

  eventos: `Você é a Bia, assessora de eventos da [Nome do Buffet/Espaço]. Seu objetivo é atender leads interessados em orçamentos para festas, casamentos, formaturas ou eventos corporativos no WhatsApp, captando os detalhes para gerar a proposta comercial.

Diretrizes de Atendimento:
- Fale em tom festivo, entusiasmado, criativo e profissional. Afinal, estamos lidando com a realização de sonhos!
- Obtenha os dados essenciais para montagem do orçamento básico:
  1. O tipo de evento (Casamento, 15 anos, Corporativo, Aniversário Infantil).
  2. A data ou mês previsto para a comemoração.
  3. O número estimado de convidados.
  4. O tipo de serviço que mais interessa (Somente buffet, espaço completo com decoração, etc.).
- Explique que nossa agenda de datas concorrida se esgota rapidamente e convide o cliente para agendar uma visita presencial ao espaço para degustação do menu enviando o link: [Link de Agendamento].
- Use emojis festivos e elegantes (Ex: 🎉, 🥂, 💍, 🎂, ✨).`,

  advocacia: `Você é o(a) assistente jurídico(a) virtual do escritório [Nome do Escritório/Advogado]. Seu papel é fazer o acolhimento e triagem inicial de clientes no WhatsApp de forma extremamente ética, reservada, séria e profissional.

Diretrizes de Atendimento:
- Use um tom formal mas acessível, transmitindo total segurança jurídica, sigilo e seriedade. Evite termos técnicos exagerados que possam afastar o cliente.
- Faça perguntas objetivas de triagem:
  1. Qual é o assunto ou área do problema (Ex: Dúvida trabalhista, contrato de aluguel, divórcio, aposentadoria).
  2. Se ele já possui um processo em andamento (se sim, peça o número para análise).
  3. Uma breve descrição do que aconteceu.
- Explique que, para garantir a melhor análise legal do caso, as consultas detalhadas são agendadas diretamente com nossos advogados especialistas em reuniões confidenciais online ou presenciais.
- Envie o link de agendamento: [Link de Agendamento] para ele escolher o melhor horário para a consulta.
- Use emojis de forma muito sóbria e discreta (Ex: ⚖️, 🏛️, 📁).`,

  seguros: `Você é a Júlia, consultora de proteção da [Nome da Corretora]. Seu papel é atender leads interessados em seguros, consórcios ou financiamentos no WhatsApp, qualificando a necessidade de proteção patrimonial ou planejamento financeiro de forma confiável e ágil.

Diretrizes de Atendimento:
- Use um tom seguro, transparente, ágil e acolhedor. O cliente busca tranquilidade e confiança.
- Colete as informações necessárias para rodar a cotação inicial nas seguradoras parceiras:
  1. O produto de interesse (Seguro Auto, Vida, Residencial, Consórcio Imóvel/Auto, Financiamento).
  2. O valor estimado do bem ou limite de apólice desejado (Ex: valor do carro, valor do imóvel).
  3. Se ele já possui seguro ativo atualmente e quer uma proposta de renovação competitiva.
- Explique que trabalhamos com as maiores e melhores seguradoras do país para garantir o menor preço com a melhor cobertura.
- Encaminhe para a análise de um corretor humano finalizar o cálculo, convidando para tirar dúvidas rápidas enviando o link: [Link de Agendamento].
- Use emojis de proteção e finanças (Ex: 🛡️, 🚗, 🏠, 💰, 🔑).`,

  moveis: `Você é o Lucas, consultor de projetos da [Nome da Marcenaria/Empresa]. Seu objetivo é qualificar clientes interessados em móveis planejados, marcenaria sob medida ou reformas no WhatsApp de forma inspiradora, técnica e prática.

Diretrizes de Atendimento:
- Fale com entusiasmo sobre design de interiores, aproveitamento de espaço e sofisticação. Demonstre interesse em entender o lar do cliente.
- Faça perguntas chaves para o pré-projeto:
  1. Quais ambientes ele deseja planejar (Ex: Cozinha, Dormitório, Casa toda).
  2. Se ele já possui a planta dos ambientes (se sim, peça para enviar o arquivo PDF ou foto).
  3. O prazo ou urgência que ele tem para o início e entrega do projeto.
- Destaque que nossos projetos incluem renderização 3D realista para ele visualizar o ambiente completo antes de fabricar.
- Convide o cliente para agendar uma apresentação 3D e orçamento presencial ou por chamada de vídeo enviando o link: [Link de Agendamento].
- Use emojis de design e decoração (Ex: 📐, 🛋️, 🪚, ✨, 🏠).`
};

const NICHOS_CONFIG = {
  geral: {
    label: 'Geral / Padrão',
    fields: [],
    cardSummary: () => null
  },
  imobiliaria: {
    label: 'Imobiliária & Corretores',
    fields: [
      { key: 'tipo_imovel', label: 'Tipo de Imóvel', type: 'select', options: ['Casa', 'Apartamento', 'Terreno', 'Sobrado', 'Comercial'] },
      { key: 'valor_pretendido', label: 'Valor do Imóvel (R$)', type: 'number', placeholder: 'Ex: 450000' },
      { key: 'renda_cliente', label: 'Renda do Cliente (R$)', type: 'number', placeholder: 'Ex: 8000' },
      { key: 'quartos', label: 'Qtd. Quartos', type: 'text', placeholder: 'Ex: 3 quartos' }
    ],
    cardSummary: (data) => {
      if (!data.tipo_imovel && !data.valor_pretendido) return null;
      const valor = data.valor_pretendido ? `R$ ${(Number(data.valor_pretendido)/1000).toFixed(0)}k` : '';
      return `🏠 ${data.tipo_imovel || 'Imóvel'} ${valor}`;
    }
  },
  veiculos: {
    label: 'Concessionária / Loja de Carros',
    fields: [
      { key: 'carro_interesse', label: 'Carro de Interesse', type: 'text', placeholder: 'Ex: Honda Civic' },
      { key: 'ano_modelo', label: 'Ano / Modelo', type: 'text', placeholder: 'Ex: 2020/2021' },
      { key: 'carro_troca', label: 'Carro na Troca?', type: 'select', options: ['Não', 'Sim (Mesmo valor)', 'Sim (Menor valor)', 'Sim (Maior valor)'] },
      { key: 'valor_entrada', label: 'Valor de Entrada (R$)', type: 'number', placeholder: 'Ex: 20000' }
    ],
    cardSummary: (data) => {
      if (!data.carro_interesse) return null;
      const entrada = data.valor_entrada ? ` · Entr: R$ ${(Number(data.valor_entrada)/1000).toFixed(0)}k` : '';
      return `🚗 ${data.carro_interesse}${entrada}`;
    }
  },
  b2b: {
    label: 'Vendas B2B / Serviços',
    fields: [
      { key: 'cargo_contato', label: 'Cargo do Contato', type: 'text', placeholder: 'Ex: Diretor Comercial' },
      { key: 'tamanho_empresa', label: 'Tamanho da Empresa', type: 'select', options: ['1-10 func.', '11-50 func.', '51-200 func.', '200+ func.'] },
      { key: 'faturamento', label: 'Faturamento Anual', type: 'text', placeholder: 'Ex: Até 1M' }
    ],
    cardSummary: (data) => {
      if (!data.cargo_contato && !data.tamanho_empresa) return null;
      return `🏢 ${data.cargo_contato || ''} (${data.tamanho_empresa || ''})`;
    }
  },
  clinicas: {
    label: 'Clínicas / Estética / Consultórios',
    fields: [
      { key: 'procedimento', label: 'Procedimento / Serviço', type: 'select', options: ['Botox', 'Preenchimento', 'Fisioterapia', 'Consulta Médica', 'Nutrição', 'Odontologia', 'Outros'] },
      { key: 'profissional', label: 'Profissional / Doutor(a)', type: 'text', placeholder: 'Ex: Dr. Silva' },
      { key: 'data_consulta', label: 'Data/Hora de Agendamento', type: 'text', placeholder: 'Ex: Terça 14h' }
    ],
    cardSummary: (data) => {
      if (!data.procedimento) return null;
      const prof = data.profissional ? ` · ${data.profissional}` : '';
      return `🩺 ${data.procedimento}${prof}`;
    }
  },
  escolas: {
    label: 'Escolas / Cursos / Educação',
    fields: [
      { key: 'curso_interesse', label: 'Curso de Interesse', type: 'text', placeholder: 'Ex: Inglês Intensivo' },
      { key: 'periodo', label: 'Período', type: 'select', options: ['Manhã', 'Tarde', 'Noite', 'Sábado', 'EAD'] },
      { key: 'aluno_nome', label: 'Nome do Aluno', type: 'text', placeholder: 'Ex: João da Silva' }
    ],
    cardSummary: (data) => {
      if (!data.curso_interesse) return null;
      const aluno = data.aluno_nome ? ` · Aluno: ${data.aluno_nome}` : '';
      return `🎓 ${data.curso_interesse}${aluno}`;
    }
  },
  eventos: {
    label: 'Eventos / Festas / Buffet',
    fields: [
      { key: 'tipo_evento', label: 'Tipo de Evento', type: 'select', options: ['Casamento', 'Aniversário', 'Corporativo', 'Formatura', 'Infantil', 'Outros'] },
      { key: 'data_evento', label: 'Data do Evento', type: 'text', placeholder: 'Ex: 12/12/2026' },
      { key: 'qtd_convidados', label: 'Quantidade de Convidados', type: 'number', placeholder: 'Ex: 150' }
    ],
    cardSummary: (data) => {
      if (!data.tipo_evento) return null;
      const conv = data.qtd_convidados ? ` · ${data.qtd_convidados} conv.` : '';
      return `🎉 ${data.tipo_evento}${conv}`;
    }
  },
  advocacia: {
    label: 'Advocacia / Escritório Jurídico',
    fields: [
      { key: 'area_juridica', label: 'Área do Direito', type: 'select', options: ['Civil', 'Trabalhista', 'Família', 'Previdenciário', 'Tributário', 'Penal', 'Outros'] },
      { key: 'numero_processo', label: 'Número do Processo', type: 'text', placeholder: 'Ex: 5001234-xx' },
      { key: 'parte_contraria', label: 'Parte Contrária', type: 'text', placeholder: 'Ex: Banco XYZ' }
    ],
    cardSummary: (data) => {
      if (!data.area_juridica) return null;
      const proc = data.numero_processo ? ` · Proc: ${data.numero_processo}` : '';
      return `⚖️ ${data.area_juridica}${proc}`;
    }
  },
  seguros: {
    label: 'Seguros / Financiamentos / Consórcio',
    fields: [
      { key: 'tipo_produto', label: 'Produto', type: 'select', options: ['Seguro Auto', 'Seguro de Vida', 'Seguro Residencial', 'Consórcio Imobiliário', 'Consórcio Veículos', 'Financiamento Auto', 'Outros'] },
      { key: 'valor_credito', label: 'Valor do Crédito / Apólice (R$)', type: 'number', placeholder: 'Ex: 150000' },
      { key: 'seguradora_parceira', label: 'Seguradora / Administradora', type: 'text', placeholder: 'Ex: Porto Seguro' }
    ],
    cardSummary: (data) => {
      if (!data.tipo_produto) return null;
      const valor = data.valor_credito ? ` · R$ ${(Number(data.valor_credito)/1000).toFixed(0)}k` : '';
      return `💰 ${data.tipo_produto}${valor}`;
    }
  },
  moveis: {
    label: 'Móveis Planejados / Construção / Reformas',
    fields: [
      { key: 'ambientes', label: 'Ambientes a Planejar', type: 'text', placeholder: 'Ex: Cozinha, Closet' },
      { key: 'planta_disponivel', label: 'Possui Planta?', type: 'select', options: ['Sim', 'Não', 'Em Desenvolvimento'] },
      { key: 'prazo_desejado', label: 'Prazo Desejado', type: 'text', placeholder: 'Ex: 45 dias' }
    ],
    cardSummary: (data) => {
      if (!data.ambientes) return null;
      return `🪚 ${data.ambientes}`;
    }
  }
};

export default function App({ session }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [scraperText, setScraperText] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scraperPerfil, setScraperPerfil] = useState('B2B');
  const [editingCardId, setEditingCardId] = useState(null);
  const [customTitles, setCustomTitles] = useState({});
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingDb, setLoadingDb] = useState(true);
  const [currentView, setCurrentView] = useState('kanban'); 
  
  // Multi-Tenant & Níveis de Acesso
  const [userRole, setUserRole] = useState('vendedor');
  const [companyId, setCompanyId] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  // SuperAdmin: lista e empresa selecionada
  const [allCompanies, setAllCompanies] = useState([]);
  const [superAdminCompanyId, setSuperAdminCompanyId] = useState('');
  
  const [selectedOrigem, setSelectedOrigem] = useState('all');

  const [leadNotes, setLeadNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState({
    contato: 'Olá {{nome}}! 👋 Vi que você se interessou pelos nossos produtos. Posso te ajudar com alguma informação?',
    amostra: 'Olá {{nome}}! 😊 Gostaríamos de apresentar nossos produtos pessoalmente. Que dia fica melhor pra você?',
    proposta: 'Olá {{nome}}! 📋 Acabei de enviar nossa proposta comercial. Por favor, verifique e me avise se tiver alguma dúvida!',
    negociacao: 'Olá {{nome}}! 🤝 Estou à disposição para ajustar os detalhes da nossa proposta. Podemos conversar?',
    ganhou: 'Olá {{nome}}! 🎉 Muito obrigado pelo fechamento! É uma honra ter você como nosso cliente. Qualquer dúvida, pode me chamar!'
  });
  const [triggerPhrase, setTriggerPhrase] = useState('Olá, vi seu anúncio e gostaria de mais informações!');
  const [activeMobileCol, setActiveMobileCol] = useState('leads');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [companyPhone, setCompanyPhone] = useState('');

  // SAC Inteligente Chatbot (Nexa)
  const [isSacOpen, setIsSacOpen] = useState(false);
  const [sacMessages, setSacMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou a Nexa, assistente de suporte inteligente do Nexale CRM. 🤖\n\nPosso te ajudar a tirar qualquer dúvida sobre a nossa plataforma, planos, preços ou conexão de WhatsApp. Como posso te ajudar hoje?' }
  ]);
  const [sacInput, setSacInput] = useState('');
  const [isSacSending, setIsSacSending] = useState(false);

  const handleSendSacMessage = async (e) => {
    if (e) e.preventDefault();
    if (!sacInput.trim() || isSacSending) return;

    const userText = sacInput.trim();
    setSacInput('');
    setSacMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsSacSending(true);

    try {
      const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const apiEndpoint = isLocal 
        ? 'http://187.77.243.166:3001/sac-chat'
        : `${window.location.origin}/sac-chat`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: sacMessages.slice(1) 
        })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }

      const data = await response.json();
      setSacMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Desculpe, não consegui obter uma resposta.' }]);
    } catch (err) {
      console.error(err);
      setSacMessages(prev => [...prev, { role: 'assistant', content: '❌ Ops! Tive um problema de conexão. Por favor, tente novamente.' }]);
    } finally {
      setIsSacSending(false);
    }
  };

  const EVOLUTION_API_URL = 'http://187.77.243.166:8080';
  const EVOLUTION_API_KEY = 'Decisao@3990';

  // Campanha de disparo em massa
  const [campMsg, setCampMsg] = useState('');
  const [campTab, setCampTab] = useState('crm'); // 'crm' | 'externa'
  const [campSelectedLeads, setCampSelectedLeads] = useState([]);
  const [campExternalList, setCampExternalList] = useState('');
  const [campFilter, setCampFilter] = useState({ coluna: 'all', temperatura: 'all' });
  const [campProgress, setCampProgress] = useState(null); // { sent, total, log[] }
  const [campRunning, setCampRunning] = useState(false);
  const [campDelay, setCampDelay] = useState(20);
  const [campMode, setCampMode] = useState('agora'); // 'agora' | 'agendar'
  const [campDate, setCampDate] = useState('');
  const [campAttachment, setCampAttachment] = useState(null); // { name, size, mimetype, base64, type }
  const [campaignQueue, setCampaignQueue] = useState([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorderRef, setMediaRecorderRef] = useState(null);
  const [recordingIntervalId, setRecordingIntervalId] = useState(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Você é um atendente simpático da nossa empresa.');
  const [aiApiKey, setAiApiKey] = useState('');
  const [activeCardAiPaused, setActiveCardAiPaused] = useState(false);
  const [selectedConfigCompanyId, setSelectedConfigCompanyId] = useState('');
  const [companyNiche, setCompanyNiche] = useState('geral');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [templateLoadedMsg, setTemplateLoadedMsg] = useState('');

  const handleLoadPromptTemplate = (nichoKey) => {
    const template = AI_PROMPTS_TEMPLATES[nichoKey];
    if (template) {
      setAiPrompt(template);
      const config = NICHOS_CONFIG[nichoKey] || NICHOS_CONFIG.geral;
      const label = config.label.split('/')[0].split('&')[0].trim();
      setTemplateLoadedMsg(`Modelo de ${label} carregado!`);
      setTimeout(() => setTemplateLoadedMsg(''), 6000);
    }
  };



  const [formData, setFormData] = useState({
    empresa: '',
    contato: '',
    telefone: '',
    email: '',
    tipo: 'B2B',
    observacao: '',
    valor: '',
    temperatura: 'Frio',
    dataRetorno: '',
    notas: '',
    dados_nicho: {},
    user_id: ''
  });

  useEffect(() => {
    if (session?.user) {
      initApp();
    }
  }, [session]);

  const initApp = async () => {
    setLoadingDb(true);
    
    // 1. Pega o perfil e a empresa do usuário logado
    const { data: roleData } = await supabase.from('user_roles').select('*').eq('id', session.user.id).single();
    
    let role = roleData ? roleData.role : 'vendedor';
    if (session.user.email === 'petcov@live.com' || session.user.email === 'contato@nexalecrm.com.br') {
      role = 'superadmin';
    }
    const compId = roleData ? roleData.company_id : null;
    
    setUserRole(role);
    setCompanyId(compId);

    if (role === 'superadmin') {
      setCurrentView('superadmin');
      // Carrega lista de empresas para o seletor do superadmin e campanhas
      const { data: companiesData } = await supabase.from('companies').select('id, name, phone, subscription_status, sa_stage, sa_temperatura, sa_valor').order('name', { ascending: true });
      if (companiesData) {
        setAllCompanies(companiesData);
        if (companiesData.length > 0) {
          setSelectedConfigCompanyId(companiesData[0].id);
        }
      }
    } else {
       setSelectedConfigCompanyId(compId);
    }

    let loadedCustomTitles = {};
    if (session?.user?.user_metadata?.custom_kanban_titles) {
      loadedCustomTitles = session.user.user_metadata.custom_kanban_titles;
      setCustomTitles(loadedCustomTitles);
    }

    if (compId) {
      const { data: compData } = await supabase.from('companies').select('invite_code, subscription_status, trial_ends_at, phone, nicho, logo_url').eq('id', compId).single();
      if (compData) {
        if (role === 'admin') setInviteCode(compData.invite_code);
        setSubscriptionStatus(compData.subscription_status);
        setTrialEndsAt(compData.trial_ends_at);
        setCompanyPhone(compData.phone || '');
        setCompanyNiche(compData.nicho || 'geral');
        setCompanyLogoUrl(compData.logo_url || '');
      }


      if (role === 'admin') {
        const { data: teamData } = await supabase.from('user_roles').select('*').eq('company_id', compId);
        if (teamData) setTeamMembers(teamData);
      }

      await fetchLeads(role, 'all', compId);
    } else {
      setLoadingDb(false);
    }
  };

  const fetchLeads = async (role = userRole, filterUserId = selectedSeller, compId = companyId, loadedCustomTitles = customTitles) => {
    if (!compId) return;
    
    try {
      setLoadingDb(true);
      let query = supabase.from('leads').select('*').order('data_criacao', { ascending: false });

      // ISOLAMENTO MULTI-TENANT: Apenas leads desta empresa
      query = query.eq('company_id', compId);

      // ISOLAMENTO DE VENDEDOR
      if (role === 'vendedor') {
        query = query.eq('user_id', session.user.id);
      } else if (role === 'admin' && filterUserId !== 'all') {
        query = query.eq('user_id', filterUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const cols = JSON.parse(JSON.stringify(INITIAL_COLUMNS));
      cols.forEach(c => {
         if (loadedCustomTitles[c.id]) c.title = loadedCustomTitles[c.id];
      });

      data.forEach(dbLead => {
        const lead = {
          id: dbLead.id,
          empresa: dbLead.empresa,
          contato: dbLead.contato,
          telefone: dbLead.telefone,
          email: dbLead.email,
          tipo: dbLead.tipo,
          observacao: dbLead.metragem, 
          kits: dbLead.kits,
          valor: Number(dbLead.valor) || 0,
          temperatura: dbLead.status_amostra || 'Frio',
          dataCriacao: new Date(dbLead.data_criacao).toLocaleDateString('pt-BR'),
          dataRetorno: dbLead.data_retorno,
          data_movimentacao: dbLead.data_movimentacao || dbLead.data_criacao,
          origem: dbLead.origem || 'Novo Lead',
          ai_paused: !!dbLead.ai_paused,
          dados_nicho: dbLead.dados_nicho || {},
          user_id: dbLead.user_id
        };
        const targetCol = cols.find(c => c.id === dbLead.coluna_id) || cols[0];
        targetCol.cards.push(lead);
      });
      setColumns(cols);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingDb(false);
    }
  };

  const handleFilterChange = (userId) => {
    setSelectedSeller(userId);
    fetchLeads(userRole, userId, companyId, customTitles);
  };

  const saveColumnTitle = async (colId) => {
    if (!editingColumnTitle.trim()) {
      setEditingColumnId(null);
      return;
    }
    const newTitles = { ...customTitles, [colId]: editingColumnTitle };
    setCustomTitles(newTitles);
    setColumns(columns.map(c => c.id === colId ? { ...c, title: editingColumnTitle } : c));
    setEditingColumnId(null);
    await supabase.auth.updateUser({
      data: { custom_kanban_titles: newTitles }
    });
  };

  const fetchNotes = async (leadId) => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setLeadNotes(data);
    } else {
      console.error("Error fetching notes", error);
    }
    setLoadingNotes(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !editingCardId) return;
    
    const { error } = await supabase.from('lead_notes').insert([{
      lead_id: editingCardId,
      user_id: session.user.id,
      nota: newNote
    }]);

    if (!error) {
      await supabase.from('leads').update({ ai_paused: true }).eq('id', editingCardId);
      setNewNote('');
      fetchNotes(editingCardId);
      fetchLeads();
    } else {
      alert("Erro ao salvar nota: " + error.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if(window.confirm('Excluir esta nota?')) {
      const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
      if(!error) fetchNotes(editingCardId);
    }
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    const valorOportunidade = parseFloat(formData.valor) || 0;

    try {
      if (userRole === 'superadmin') {
        if (editingCardId) {
          const { error } = await supabase.from('companies').update({
            name: formData.empresa,
            phone: formData.telefone,
            sa_temperatura: formData.temperatura,
            sa_valor: valorOportunidade,
            sa_obs: formData.observacao,
          }).eq('id', editingCardId);
          if (error) throw error;
        } else {
          const inviteCodeGenerated = Math.random().toString(36).substring(2, 8).toUpperCase();
          const { error } = await supabase.from('companies').insert([{
            name: formData.empresa,
            phone: formData.telefone,
            invite_code: inviteCodeGenerated,
            sa_temperatura: formData.temperatura,
            sa_valor: valorOportunidade,
            sa_obs: formData.observacao,
            sa_stage: 'leads',
            subscription_status: 'trial'
          }]);
          if (error) throw error;
        }
        // Atualiza a lista local de empresas do superadmin
        const { data: companiesData } = await supabase.from('companies').select('id, name, phone, subscription_status, sa_stage, sa_temperatura, sa_valor').order('name', { ascending: true });
        if (companiesData) setAllCompanies(companiesData);
        window.dispatchEvent(new Event('sa-companies-changed'));
      } else {
        if (editingCardId) {
          // Busca a origem atual do card para mantê-la ou atualizá-la
          let origemAtual = '';
          for (const col of columns) {
            const foundCard = col.cards.find(c => c.id === editingCardId);
            if (foundCard) {
              origemAtual = foundCard.origem || 'Novo Lead';
              break;
            }
          }

          let novaOrigem = origemAtual;
          const isAtribuidoOutro = formData.user_id && formData.user_id !== session.user.id;
          if (isAtribuidoOutro) {
            novaOrigem = companyNiche === 'imobiliaria' ? 'Enviado pela Imobiliária' : 'Enviado pela Empresa';
          }

          setColumns(columns.map(col => ({
            ...col,
            cards: col.cards.map(c => 
              c.id === editingCardId 
                ? { ...c, ...formData, valor: valorOportunidade, origem: novaOrigem }
                : c
            )
          })));

          const { error } = await supabase.from('leads').update({
            empresa: formData.empresa,
            contato: formData.contato,
            telefone: formData.telefone,
            email: formData.email,
            tipo: formData.tipo,
            metragem: formData.observacao,
            kits: 0,
            valor: valorOportunidade,
            status_amostra: formData.temperatura,
            data_retorno: formData.dataRetorno || null,
            notas: formData.notas,
            dados_nicho: formData.dados_nicho || {},
            user_id: formData.user_id || session.user.id,
            origem: novaOrigem
          }).eq('id', editingCardId);
          
          if (error) throw error;
        } else {
          // NOVO LEAD (MULTI-TENANT)
          const isAtribuidoOutro = formData.user_id && formData.user_id !== session.user.id;
          const origemPadrao = isAtribuidoOutro 
            ? (companyNiche === 'imobiliaria' ? 'Enviado pela Imobiliária' : 'Enviado pela Empresa')
            : (userRole === 'vendedor' 
                ? (companyNiche === 'imobiliaria' ? 'Captação do Corretor' : 'Captação Própria')
                : 'Novo Lead');

          const { data, error } = await supabase.from('leads').insert([{
            user_id: formData.user_id || session.user.id,
            company_id: companyId, // VINCULA À EMPRESA CORRETA
            empresa: formData.empresa,
            contato: formData.contato,
            telefone: formData.telefone,
            email: formData.email,
            tipo: formData.tipo,
            metragem: formData.observacao,
            kits: 0,
            valor: valorOportunidade,
            status_amostra: formData.temperatura,
            coluna_id: 'leads',
            data_retorno: formData.dataRetorno || null,
            notas: formData.notas,
            origem: origemPadrao,
            dados_nicho: formData.dados_nicho || {}
          }]).select();
          
          if (error) throw error;
 
          if (data && data.length > 0) {
            const dbLead = data[0];
            const newCard = {
              id: dbLead.id,
              empresa: dbLead.empresa,
              contato: dbLead.contato,
              telefone: dbLead.telefone,
              email: dbLead.email,
              tipo: dbLead.tipo,
              observacao: dbLead.metragem,
              valor: Number(dbLead.valor),
              temperatura: dbLead.status_amostra,
              dataCriacao: new Date(dbLead.data_criacao).toLocaleDateString('pt-BR'),
              dataRetorno: dbLead.data_retorno,
              notas: dbLead.notas,
              data_movimentacao: dbLead.data_movimentacao,
              origem: dbLead.origem || 'Novo Lead',
              dados_nicho: dbLead.dados_nicho || {}
            };
            setColumns(columns.map(col => {
              if (col.id === 'leads') {
                return { ...col, cards: [newCard, ...col.cards] };
              }
              return col;
            }));
          }
        }
      }
 
      setFormData({ empresa: '', contato: '', telefone: '', email: '', tipo: 'B2B', observacao: '', valor: '', temperatura: 'Frio', dataRetorno: '', notas: '', dados_nicho: {} });
      setEditingCardId(null);
      setLeadNotes([]);
      setShowModal(false);
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) return;
    try {
      if (userRole === 'superadmin') {
        const { error } = await supabase.from('companies').delete().eq('id', leadId);
        if (error) throw error;
        
        const { data: companiesData } = await supabase.from('companies').select('id, name, phone, subscription_status, sa_stage, sa_temperatura, sa_valor').order('name', { ascending: true });
        if (companiesData) setAllCompanies(companiesData);
        window.dispatchEvent(new Event('sa-companies-changed'));
      } else {
        const { error } = await supabase.from('leads').delete().eq('id', leadId);
        if (error) throw error;
        
        setColumns(columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => c.id !== leadId)
        })));
      }
      
      setEditingCardId(null);
      setShowModal(false);
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  };


  const handleEditClick = (card) => {
    setFormData({
      empresa: card.empresa || '',
      contato: card.contato || '',
      telefone: card.telefone || '',
      email: card.email || '',
      tipo: card.tipo || 'B2B',
      observacao: card.observacao || '',
      valor: card.valor || '',
      temperatura: card.temperatura || 'Frio',
      dataRetorno: card.dataRetorno ? new Date(card.dataRetorno).toISOString().slice(0, 16) : '',
      notas: card.notas || '',
      dados_nicho: card.dados_nicho || {},
      user_id: card.user_id || ''
    });
    setActiveCardAiPaused(!!card.ai_paused);
    setEditingCardId(card.id);
    setShowModal(true);
    setShowAdvanced(!!card.email || !!card.tipo);
    fetchNotes(card.id);
  };

  const handleScrape = async () => {
    setIsScraping(true);
    const regex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
    const matches = scraperText.match(regex);
    
    if (!matches || matches.length === 0) {
      alert("Nenhum CNPJ encontrado no texto.");
      setIsScraping(false);
      return;
    }

    const uniqueCnpjs = [...new Set(matches.map(c => c.replace(/[^\d]/g, '')))];
    const dbInserts = [];

    for (const cnpj of uniqueCnpjs) {
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) continue;
        const data = await response.json();
        
        dbInserts.push({
          user_id: session.user.id,
          company_id: companyId,
          empresa: data.razao_social || data.nome_fantasia || 'Empresa Desconhecida',
          contato: data.qsa && data.qsa[0] ? data.qsa[0].nome_socio : 'Sócio/Responsável',
          telefone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\s+/g, ' ') : (data.ddd_telefone_2 ? data.ddd_telefone_2.replace(/\s+/g, ' ') : 'Não informado'),
          email: data.email || 'Não informado',
          tipo: scraperPerfil || 'B2B',
          metragem: 'Captado via Híbrido',
          kits: 0,
          valor: 0,
          status_amostra: 'Frio',
          coluna_id: 'leads',
          origem: 'Captação B2B'
        });
        
        await new Promise(r => setTimeout(r, 300));
      } catch (error) {
        console.error("Erro ao buscar CNPJ:", cnpj, error);
      }
    }

    if (dbInserts.length > 0) {
      try {
        const { error } = await supabase.from('leads').insert(dbInserts);
        if (error) throw error;
        
        alert(`${dbInserts.length} leads importados com sucesso!`);
        setScraperText('');
        setShowScraperModal(false);
        fetchLeads();
      } catch (error) {
        alert("Erro ao salvar no banco: " + error.message);
      }
    } else {
      alert("Não foi possível importar os leads. Verifique se os CNPJs são válidos.");
    }
    setIsScraping(false);
  };

  const [waConnected, setWaConnected] = useState(false);
  const [waUser, setWaUser] = useState(null);

  // Check Evolution API connection status
  useEffect(() => {
    const activeInstance = userRole === 'superadmin' ? 'superadmin' : companyId;
    if (currentView === 'whatsapp' && activeInstance) {
      fetch(`/evolution/instance/connectionState/${activeInstance}`, {
        headers: { 'apikey': '123' }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.instance && data.instance.state === 'open') {
          setWaConnected(true);
          setWaUser('Conectado');

          // Busca o número conectado de forma assíncrona
          fetch('/evolution/instance/fetchInstances', {
            headers: { 'apikey': '123' }
          })
          .then(res => res.json())
          .then(instances => {
            if (Array.isArray(instances)) {
              const matched = instances.find(inst => inst.name === activeInstance);
              if (matched && matched.ownerJid) {
                const rawNum = matched.ownerJid.split('@')[0];
                // Formata o número (ex: 555196952482 -> +55 (51) 96952-482)
                let formatted = rawNum;
                if (rawNum.startsWith('55') && rawNum.length >= 12) {
                  const ddd = rawNum.slice(2, 4);
                  const rest = rawNum.slice(4);
                  if (rest.length === 9) {
                    formatted = `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
                  } else {
                    formatted = `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
                  }
                } else {
                  formatted = `+${rawNum}`;
                }
                setWaUser(formatted);
              }
            }
          })
          .catch(console.error);
          
          // Configura o Webhook silenciosamente
          fetch(`/evolution/webhook/set/${activeInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': '123' },
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: `http://187.77.243.166:3001/webhook/${activeInstance}`,
                byEvents: false,
                base64: false,
                events: ["MESSAGES_UPSERT"]
              }
            })
          }).catch(console.error);

        } else {
          setWaConnected(false);
        }
      })
      .catch(console.error);
    }
  }, [currentView, companyId, userRole]);

  const handleGenerateQR = async () => {
    setIsGeneratingQR(true);
    setQrCodeImage(null);
    const activeInstance = userRole === 'superadmin' ? 'superadmin' : companyId;
    try {
      // 1. Criar a instância no Evolution API
      const createRes = await fetch('/evolution/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': '123' },
        body: JSON.stringify({ instanceName: activeInstance, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
      });
      
      const createData = await createRes.json();
      
      let base64Image = '';
      if (createData.qrcode && createData.qrcode.base64) {
        base64Image = createData.qrcode.base64;
      } else {
        // Se a instância já existir, vamos pedir para conectar
        const connectRes = await fetch(`/evolution/instance/connect/${activeInstance}`, {
          headers: { 'apikey': '123' }
        });
        const connectData = await connectRes.json();
        if (connectData.base64) {
           base64Image = connectData.base64;
        } else {
           throw new Error('Não foi possível gerar o QR Code.');
        }
      }

      if (base64Image.startsWith('data:image')) {
        setQrCodeImage(base64Image);
      } else {
        setQrCodeImage(`data:image/png;base64,${base64Image}`);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const checkSession = async () => {
    try {
      const activeInstance = userRole === 'superadmin' ? 'superadmin' : companyId;
      const st = await fetch(`/evolution/instance/connectionState/${activeInstance}`, { headers: { 'apikey': '123' } });
      if (st.ok) {
        const data = await st.json();
        setIsWahaConnected(data.instance?.state === 'open');
      } else {
        setIsWahaConnected(false);
      }
    } catch (e) {
      setIsWahaConnected(false);
    }
  };

  useEffect(() => {
    if (showConfigModal) checkSession();
  }, [showConfigModal]);

  // Load company settings when activeId changes
  useEffect(() => {
    const loadCompanySettings = async () => {
      const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
      if (!activeId) return;

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('nicho, message_templates, logo_url')
          .eq('id', activeId)
          .single();

        if (!error && data) {
          setCompanyNiche(data.nicho || 'geral');
          setCompanyLogoUrl(data.logo_url || '');
          if (data.message_templates) {
            setMessageTemplates(data.message_templates);
            if (data.message_templates.ai_enabled !== undefined) setAiEnabled(!!data.message_templates.ai_enabled);
            if (data.message_templates.ai_prompt !== undefined) setAiPrompt(data.message_templates.ai_prompt || 'Você é um atendente simpático da nossa empresa.');
            if (data.message_templates.ai_api_key !== undefined) setAiApiKey(data.message_templates.ai_api_key || '');
            if (data.message_templates.whatsapp_trigger_phrase !== undefined) setTriggerPhrase(data.message_templates.whatsapp_trigger_phrase || 'Olá, vi seu anúncio e gostaria de mais informações!');
          }
        }
      } catch (err) {
        console.error('Error loading company settings:', err);
      }
    };

    loadCompanySettings();
  }, [selectedConfigCompanyId, companyId, userRole]);

  const handleUpdateCompanyLogoUrl = async (newLogoUrl) => {
    setCompanyLogoUrl(newLogoUrl);
    const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
    if (activeId) {
      const { error } = await supabase.from('companies').update({ logo_url: newLogoUrl }).eq('id', activeId);
      if (error) {
        console.error('Error updating company logo URL:', error.message);
      }
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Limita tamanho a 3MB
    if (file.size > 3 * 1024 * 1024) {
      alert('A imagem do logotipo deve ter no máximo 3MB.');
      return;
    }

    setIsUploadingLogo(true);
    const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
    if (!activeId) {
      alert('Empresa não identificada.');
      setIsUploadingLogo(false);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${activeId}_${Date.now()}.${fileExt}`;

      // Upload do arquivo para o bucket 'logos'
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      // Obtém a URL pública
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Salva no banco de dados e atualiza o estado
      await handleUpdateCompanyLogoUrl(publicUrl);
      alert('✅ Logotipo enviado e salvo com sucesso!');
    } catch (err) {
      console.error('Erro no upload do logotipo:', err);
      alert(`Erro ao enviar logotipo: ${err.message || err}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUpdateCompanyNiche = async (newNiche) => {


    setCompanyNiche(newNiche);
    const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
    if (activeId) {
      const { error } = await supabase.from('companies').update({ nicho: newNiche }).eq('id', activeId);
      if (error) {
        console.error('Error updating company niche:', error.message);
      } else {
        // Recarregar leads para aplicar nova lógica de resumo/cards
        fetchLeads(userRole, selectedSeller, companyId, customTitles);
      }
    }
  };

  // Helper: Evolution API uses plain numbers with country code
  const sendWahaMessage = async (phoneNumber, text) => {
    let clean = phoneNumber.replace(/\D/g, '');
    // Adiciona o DDI do Brasil se tiver apenas DDD + Número (10 ou 11 dígitos)
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    
    const instanceName = userRole === 'superadmin' ? 'superadmin' : companyId;
    const res = await fetch(`/evolution/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': '123' },
      body: JSON.stringify({ number: clean, text })
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('Erro na Evolution API:', err);
      throw new Error(`Erro ${res.status}: ${err}`);
    }
    return res;
  };

  const sendWahaAudio = async (phoneNumber, base64Audio) => {
    let clean = phoneNumber.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    const rawBase64 = base64Audio.includes('base64,') ? base64Audio.split('base64,')[1] : base64Audio;
    const instanceName = userRole === 'superadmin' ? 'superadmin' : companyId;
    const res = await fetch(`/evolution/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': '123' },
      body: JSON.stringify({ number: clean, audio: rawBase64 })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Erro ao enviar audio:', err);
      throw new Error(`Erro ${res.status}: ${err}`);
    }
    return res;
  };

  const sendWahaMedia = async (phoneNumber, mediaType, mimeType, base64Media, fileName, caption = "") => {
    let clean = phoneNumber.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    const rawBase64 = base64Media.includes('base64,') ? base64Media.split('base64,')[1] : base64Media;
    const instanceName = userRole === 'superadmin' ? 'superadmin' : companyId;
    const res = await fetch(`/evolution/message/sendMedia/${instanceName}`, {
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
      console.error('Erro ao enviar media:', err);
      throw new Error(`Erro ${res.status}: ${err}`);
    }
    return res;
  };

  const handleSendTestMessage = async () => {
    const number = prompt("Digite o número do WhatsApp com DDD (Ex: 5511999999999):");
    if (!number) return;
    
    try {
      const res = await sendWahaMessage(number, '🤖 *BIP BOP!* Esta é uma mensagem oficial da sua nova Nexale!\n\nSe você recebeu esta mensagem, o seu servidor está 100% conectado e pronto para vender!');
      
      if (res.ok) {
        alert("✅ Mensagem enviada com sucesso! Verifique o WhatsApp.");
      } else {
        const err = await res.text();
        alert("Erro ao enviar: " + err);
      }
    } catch (error) {
      alert("Erro na conexão: " + error.message);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());

        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const fileReader = new FileReader();
        fileReader.onload = () => {
          setCampAttachment({
            name: `Áudio Gravado (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).ogg`,
            size: blob.size,
            mimetype: 'audio/ogg',
            base64: fileReader.result,
            type: 'audio',
            isRecorded: true
          });
        };
        fileReader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorderRef(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      const interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      setRecordingIntervalId(interval);

    } catch (err) {
      console.error(err);
      alert("Não foi possível acessar o microfone. Verifique se deu permissão no seu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef && mediaRecorderRef.state !== 'inactive') {
      mediaRecorderRef.stop();
    }
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setIsRecording(false);
  };

  const [draggedCard, setDraggedCard] = useState(null);
  const [lossModal, setLossModal] = useState(null); // { card, sourceColId }
  const [lossReason, setLossReason] = useState('');
  const LOSS_REASONS = ['Achou caro', 'Não responde', 'Comprou do concorrente', 'Sem interesse', 'Timing errado', 'Outro motivo'];

  // Mensagens automáticas por coluna (disparo ao arrastar)
  const getWaMessage = (colId, nome) => {
    const template = messageTemplates[colId];
    if (!template) return null;
    return template.replace(/\{\{nome\}\}/g, nome || '');
  };

  const saveTemplates = async () => {
    try {
      const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
      if (activeId) {
        const { error } = await supabase.from('companies').update({ message_templates: messageTemplates }).eq('id', activeId);
        if (error) throw error;
        alert('Mensagens salvas com sucesso!');
        setShowTemplateModal(false);
      }
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  };

  const handleSaveAiSettings = async () => {
    try {
      const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
      if (!activeId) {
        alert('Nenhuma empresa ativa selecionada.');
        return;
      }
      const newTemplates = { 
        ...messageTemplates, 
        ai_enabled: aiEnabled,
        ai_prompt: aiPrompt,
        ai_api_key: aiApiKey,
        whatsapp_trigger_phrase: triggerPhrase
      };
      const { error } = await supabase.from('companies').update({ message_templates: newTemplates }).eq('id', activeId);
      if (error) throw error;
      setMessageTemplates(newTemplates);
      alert('Configurações da IA de Atendimento salvas com sucesso!');
    } catch (e) {
      alert('Erro ao salvar IA: ' + e.message);
    }
  };

  const handleDragStart = (e, card, sourceColId) => {
    setDraggedCard({ card, sourceColId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetColId) => {
    e.preventDefault();
    if (!draggedCard) return;
    const { card, sourceColId } = draggedCard;
    if (sourceColId === targetColId) { setDraggedCard(null); return; }

    if (targetColId === 'perdido') {
      setLossModal({ card, sourceColId, targetColId });
      setDraggedCard(null);
      return;
    }

    await executeDrop(card, sourceColId, targetColId);
  };

  const handleSaveTrigger = async () => {
    const activeId = userRole === 'superadmin' ? selectedConfigCompanyId : companyId;
    if (!activeId) return;
    const newTemplates = { ...messageTemplates, whatsapp_trigger_phrase: triggerPhrase };
    await supabase.from('companies').update({ message_templates: newTemplates }).eq('id', activeId);
    setMessageTemplates(newTemplates);
    alert('Frase e Link atualizados com sucesso!');
  };

  const handleMoveMobile = (card, sourceColId, targetColId) => {
    if (!targetColId) return;
    if (targetColId === 'perdido') {
      setLossModal({ card, sourceColId, targetColId });
      return;
    }
    executeDrop(card, sourceColId, targetColId);
  };

  const executeDrop = async (card, sourceColId, targetColId, reason = null) => {
    // Atualiza visual imediatamente
    setColumns(prev => prev.map(col => {
      if (col.id === sourceColId) return { ...col, cards: col.cards.filter(c => c.id !== card.id) };
      if (col.id === targetColId) return { ...col, cards: [{ ...card, coluna_id: targetColId }, ...col.cards] };
      return col;
    }));
    setDraggedCard(null);

    // Salva no banco
    const updateData = { coluna_id: targetColId, data_movimentacao: new Date().toISOString() };
    if (reason) updateData.motivo_perda = reason;
    if (targetColId !== 'leads') {
      updateData.ai_paused = true;
    }
    const { error } = await supabase.from('leads').update(updateData).eq('id', card.id);
    if (error) { alert('Erro ao atualizar: ' + error.message); fetchLeads(); return; }

    // 📲 Disparo automático de WhatsApp ao mover de coluna
    const templateExists = messageTemplates[targetColId] && messageTemplates[targetColId].trim() !== '';
    if (templateExists && card.telefone && card.telefone !== 'Não informado') {
      const primeiroNome = card.contato?.split(' ')[0] || '';
      const message = getWaMessage(targetColId, primeiroNome);
      try {
        await sendWahaMessage(card.telefone, message);
        console.log(`✅ WhatsApp disparado para ${card.empresa} ao mover para ${targetColId}`);
      } catch (e) {
        alert('WhatsApp não pôde ser enviado: ' + e.message);
        console.warn('WhatsApp não pôde ser enviado:', e.message);
      }
    }
  };

  const handleConfirmLoss = async () => {
    if (!lossReason) { alert('Por favor, selecione o motivo da perda.'); return; }
    await executeDrop(lossModal.card, lossModal.sourceColId, lossModal.targetColId, lossReason);
    setLossModal(null);
    setLossReason('');
  };

  const handleDeleteCard = async (cardId, colId) => {
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      setColumns(columns.map(col => {
        if (col.id === colId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        return col;
      }));

      await supabase.from('leads').delete().eq('id', cardId);
    }
  };

  const totalFaturamentoPotencial = columns.reduce((acc, col) => {
    if (col.id !== 'ganhou') {
      return acc + col.cards.reduce((cAcc, card) => cAcc + (Number(card.valor) || 0), 0);
    }
    return acc;
  }, 0);

  const totalFaturamentoRealizado = columns.find(col => col.id === 'ganhou')?.cards.reduce((acc, card) => acc + (Number(card.valor) || 0), 0) || 0;

  const funnelData = columns.map(col => ({
    name: col.title.split(' ')[0],
    Quantidade: col.cards.length,
    Valor: col.cards.reduce((acc, card) => acc + (Number(card.valor) || 0), 0)
  }));

  const pieData = [
    { name: 'Em Andamento', value: totalFaturamentoPotencial },
    { name: 'Fechado (Ganho)', value: totalFaturamentoRealizado }
  ];

  const fetchCampaignQueue = async (targetCompId = companyId) => {
    const activeId = (userRole === 'superadmin' && selectedConfigCompanyId) ? selectedConfigCompanyId : (companyId || 'fbd8e84b-d35e-4390-ae05-5e18ab3e888e');
    if (!activeId) return;
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', activeId)
        .in('status', ['pendente', 'enviando', 'concluido', 'cancelado'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setCampaignQueue(data);
      }
    } catch (err) {
      console.error('Erro ao buscar fila de campanhas:', err);
    }
  };

  const handleCancelCampaign = async (campaignId) => {
    if (!confirm('Deseja realmente cancelar/remover esta campanha da fila?')) return;
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'cancelado' })
        .eq('id', campaignId);
      if (error) throw error;
      alert('Campanha cancelada com sucesso!');
      fetchCampaignQueue();
    } catch (err) {
      alert('Erro ao cancelar campanha: ' + err.message);
    }
  };

  useEffect(() => {
    if (currentView === 'campanha') {
      fetchCampaignQueue();
      const interval = setInterval(fetchCampaignQueue, 5000);
      return () => clearInterval(interval);
    }
  }, [currentView, selectedConfigCompanyId, companyId, userRole]);

  // Lógica de Vencimento Universal (Teste ou Assinatura)
  const expirationDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const now = new Date();
  const isExpired = expirationDate ? now > expirationDate : false;
  const daysRemaining = expirationDate ? Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24)) : 0;
  
  let isLocked = subscriptionStatus === 'canceled' || subscriptionStatus === 'pendente' || subscriptionStatus === 'blocked' || isExpired;
  if (userRole === 'superadmin') isLocked = false;

  if (loadingDb) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans"><p className="text-slate-500 font-medium">Carregando seus dados...</p></div>;
  }

  if (isLocked) {
    if (userRole === 'vendedor') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
             <div className="w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
               <span className="text-2xl">🔒</span>
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Suspenso</h2>
             <p className="text-slate-500 text-sm mb-6">A assinatura da sua empresa encontra-se vencida ou pendente. Por favor, entre em contato com o seu gerente ou através de <a href="mailto:contato@nexalecrm.com.br" className="text-indigo-600 font-bold hover:underline">contato@nexalecrm.com.br</a> para regularizar o acesso.</p>
             <button onClick={() => supabase.auth.signOut()} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Sair da Conta</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full text-center border border-slate-100">
           <div className="w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
             <span className="text-2xl">💳</span>
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Assinatura Vencida</h2>
           <p className="text-slate-500 text-sm mb-8">Seu período de acesso terminou. Para continuar utilizando a sua Máquina de Vendas e não perder seus leads, renove sua assinatura escolhendo um dos planos abaixo. Se precisar de suporte técnico, entre em contato com <a href="mailto:contato@nexalecrm.com.br" className="text-indigo-600 font-bold hover:underline">contato@nexalecrm.com.br</a>.</p>
           
           <div className="grid md:grid-cols-3 gap-6 mb-8 text-left">
             <div className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white">
               <h3 className="text-lg font-bold text-slate-800">Vendedor Solo</h3>
               <p className="text-xs text-slate-500 mb-4 font-medium">Ideal para 1 usuário.</p>
               <p className="text-3xl font-black text-slate-800 mb-6">R$ 49<span className="text-sm text-slate-400 font-bold">/mês</span></p>
               <ul className="space-y-3 mb-8 text-xs text-slate-600 font-bold">
                 <li className="flex items-center gap-2"><span className="text-green-500">✓</span> 1 Usuário (Gerente)</li>
                 <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Funil de Vendas Kanban</li>
                 <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Automação de WhatsApp</li>
               </ul>
               <a href="https://www.asaas.com/c/bqbwcc2hczubmdj3" target="_blank" rel="noreferrer" className="block w-full bg-slate-800 hover:bg-black text-white text-center font-bold py-3 rounded-xl transition-colors text-sm">Assinar Vendedor Solo</a>
             </div>

             <div className="border-2 border-indigo-500 rounded-xl p-5 shadow-xl shadow-indigo-500/10 bg-indigo-50/30 relative">
               <div className="absolute -top-3 right-2 bg-gradient-to-r from-indigo-600 to-indigo-600 text-slate-900 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-md shadow-indigo-900/10">Mais Popular</div>
               <h3 className="text-lg font-bold text-indigo-700">Pequenos Negócios</h3>
               <p className="text-xs text-indigo-600/70 mb-4 font-medium">Para pequenas equipes.</p>
               <p className="text-3xl font-black text-indigo-900 mb-6">R$ 79<span className="text-sm text-indigo-600/50 font-bold">/mês</span></p>
               <ul className="space-y-3 mb-8 text-xs text-slate-700 font-bold">
                 <li className="flex items-center gap-2"><span className="text-indigo-500">🔥</span> Até 3 Usuários</li>
                 <li className="flex items-center gap-2"><span className="text-indigo-500">🔥</span> Dashboard de Relatórios</li>
                 <li className="flex items-center gap-2"><span className="text-indigo-500">🔥</span> Suporte Prioritário</li>
               </ul>
               <a href="https://www.asaas.com/c/jilxk95jdvtgfv6k" target="_blank" rel="noreferrer" className="block w-full bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-700 text-white text-center font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm transform hover:-translate-y-0.5">Assinar Pequenos Negócios</a>
             </div>
             
             <div className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white">
               <h3 className="text-lg font-bold text-slate-800">Equipe Pro</h3>
               <p className="text-xs text-slate-500 mb-4 font-medium">Para máquinas de vendas reais.</p>
               <p className="text-3xl font-black text-slate-800 mb-6">R$ 99<span className="text-sm text-slate-400 font-bold">/mês</span></p>
               <ul className="space-y-3 mb-8 text-xs text-slate-600 font-bold">
                 <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Até 10 Usuários</li>
                 <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Captador B2B Automático</li>
                 <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Suporte VIP WhatsApp</li>
               </ul>
               <a href="https://www.asaas.com/c/dtho5xew6ca5py2d" target="_blank" rel="noreferrer" className="block w-full bg-slate-800 hover:bg-black text-white text-center font-bold py-3 rounded-xl transition-colors text-sm">Assinar Equipe Pro</a>
             </div>
           </div>
           
           <div className="flex justify-between items-center px-4 border-t border-slate-100 pt-6">
             <p className="text-[11px] text-slate-400 font-bold">Após o pagamento, o sistema da Asaas liberará o painel automaticamente em instantes.</p>
             <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors bg-red-50 px-3 py-1.5 rounded-lg">Sair da Conta</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* Banner de Atualização PWA */}
      {needRefresh && (
        <div className="mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl text-center text-xs md:text-sm font-bold flex flex-col md:flex-row items-center justify-center gap-3 shadow-lg z-[9999] relative animate-bounce border border-indigo-500">
          <span className="flex items-center gap-2">✨ Uma nova versão do Nexale CRM está pronta com novidades!</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-white hover:bg-slate-100 text-indigo-700 px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shadow-md transform hover:scale-105 active:scale-95"
          >
            ⚡ Atualizar Agora
          </button>
        </div>
      )}

      {/* HEADER COMPLETO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <img src="/logo-nexale.jpg" alt="Nexale Logo" className="h-8 w-8 rounded-lg object-cover shadow-sm border border-slate-100" />
            Nexale CRM
          </h1>

          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            Gestão Inteligente
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${userRole === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              Perfil: {userRole}
            </span>
          </p>
        </div>
        
        <div className="flex gap-3 items-center overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap w-full xl:w-auto pb-2 md:pb-0 minimal-scrollbar [&>*]:flex-shrink-0">
          {/* Exibição do Código de Convite para o Admin */}
          {userRole === 'admin' && inviteCode && (
            <div className="bg-green-50 border border-green-200 p-1.5 rounded-lg flex items-center shadow-sm shadow-indigo-900/5 cursor-pointer hover:bg-green-100 transition-colors" 
                 onClick={() => { navigator.clipboard.writeText(inviteCode); alert('Código copiado!'); }}
                 title="Clique para copiar e enviar para seus vendedores"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span className="text-[11px] text-green-700 font-bold ml-1 mr-2">CÓDIGO DA EQUIPE:</span>
              <span className="bg-white border border-green-200 rounded text-xs px-2 py-0.5 font-mono text-green-800 font-black tracking-wider">{inviteCode}</span>
            </div>
          )}

          {userRole === 'admin' && (
            <div className="bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg flex items-center shadow-sm shadow-indigo-900/5">
              <span className="text-[11px] text-indigo-700 font-bold ml-2 mr-2 uppercase">Visão do Gerente:</span>
              <select 
                value={selectedSeller} 
                onChange={(e) => handleFilterChange(e.target.value)}
                className="bg-white border-none rounded text-sm p-1.5 font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm shadow-indigo-900/5 max-w-[150px] truncate"
              >
                <option value="all">Toda a Equipe</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.email} {m.id === session.user.id ? '(Você)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg flex items-center shadow-sm shadow-indigo-900/5">
            <span className="text-[11px] text-indigo-700 font-bold ml-2 mr-2 uppercase">Origem:</span>
            <select
              value={selectedOrigem}
              onChange={(e) => setSelectedOrigem(e.target.value)}
              className="bg-white border-none rounded text-sm p-1.5 font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm shadow-indigo-900/5 max-w-[180px] truncate"
            >
              <option value="all">Todas as Origens</option>
              <option value="Novo Lead">Novo Lead</option>
              <option value="Captação B2B">Captação B2B</option>
              <option value="Link de WhatsApp">Link de WhatsApp</option>
              <option value="Landing Page">Landing Page</option>
              <option value={companyNiche === 'imobiliaria' ? 'Enviado pela Imobiliária' : 'Enviado pela Empresa'}>
                {companyNiche === 'imobiliaria' ? 'Enviado pela Imobiliária' : 'Enviado pela Empresa'}
              </option>
              <option value={companyNiche === 'imobiliaria' ? 'Captação do Corretor' : 'Captação Própria'}>
                {companyNiche === 'imobiliaria' ? 'Captação do Corretor' : 'Captação Própria'}
              </option>
            </select>
          </div>

          {/* Seletor de Nicho na barra de cabeçalho */}
          <div className="bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg flex items-center shadow-sm shadow-indigo-900/5">
            <span className="text-[11px] text-indigo-700 font-bold ml-2 mr-2 uppercase">Segmento/Nicho:</span>
            {userRole === 'admin' || userRole === 'superadmin' ? (
              <select
                value={companyNiche}
                onChange={(e) => handleUpdateCompanyNiche(e.target.value)}
                className="bg-white border-none rounded text-sm p-1.5 font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm shadow-indigo-900/5 max-w-[180px] truncate"
              >
                {Object.entries(NICHOS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            ) : (
              <span className="bg-white border border-indigo-200 rounded text-xs px-2.5 py-1 font-semibold text-indigo-800 tracking-wide shadow-sm shadow-indigo-900/5">
                {NICHOS_CONFIG[companyNiche]?.label || 'Geral'}
              </span>
            )}
          </div>

          {/* SuperAdmin: sem seletor de empresa — tem Kanban próprio */}

          <div className="bg-slate-100 p-1 rounded-lg flex flex-wrap gap-1">
            <button 
              onClick={() => setCurrentView('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'kanban' ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-900/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📋 Kanban
            </button>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-900/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📊 Relatórios
            </button>
              <button 
                onClick={() => setCurrentView('whatsapp')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'whatsapp' ? 'bg-green-500 text-slate-900 shadow-sm shadow-indigo-900/5' : 'text-green-600 hover:text-green-700'}`}
              >
                💬 WhatsApp
              </button>
              <button 
                onClick={() => setCurrentView('ai_config')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'ai_config' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/5' : 'text-indigo-600 hover:text-indigo-700 border border-indigo-200/50 bg-indigo-50/50'}`}
              >
                ⚙️ Configurações / IA
              </button>

              <button 
                onClick={() => setCurrentView('campanha')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'campanha' ? 'bg-orange-500 text-slate-900 shadow-sm shadow-indigo-900/5' : 'text-orange-600 hover:text-orange-700'}`}
              >
                🚀 Campanha
              </button>

              <button 
                onClick={() => setCurrentView('tutorials')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'tutorials' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/5' : 'text-slate-500 hover:text-slate-700'}`}
              >
                🎥 Tutoriais
              </button>

            {userRole === 'superadmin' && (
              <button 
                onClick={() => setCurrentView('superadmin')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${currentView === 'superadmin' ? 'bg-black text-white shadow-sm shadow-indigo-900/5' : 'text-slate-500 hover:text-slate-700'}`}
              >
                👑 Painel Master
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowScraperModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-slate-900 font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-indigo-900/5 text-sm"
          >
            ⚡ Captação B2B
          </button>
          <button 
            onClick={() => setShowLinkModal(true)}
            className="bg-green-500 hover:bg-green-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-indigo-900/5 text-sm"
          >
            🔗 Captação B2C / PF
          </button>
          <button 
            onClick={() => setShowTemplateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-emerald-900/5 text-sm flex items-center gap-1"
            title="Editar Mensagens de WhatsApp"
          >
            ⚙️ Mensagens
          </button>
          <button 
            onClick={() => {
              setEditingCardId(null);
              setFormData({ empresa: '', contato: '', telefone: '', email: '', tipo: 'B2B', observacao: '', valor: '', temperatura: 'Frio', dataRetorno: '', notas: '', dados_nicho: {}, user_id: session?.user?.id || '' });
              setLeadNotes([]);
              setShowModal(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-indigo-900/5 text-sm flex items-center gap-1"
          >
            + Novo Lead
          </button>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-slate-400 hover:text-red-500 text-[9px] font-black uppercase tracking-wider transition-colors ml-1 px-2.5 py-1 bg-slate-50 rounded-lg hover:bg-red-50 flex flex-col items-center justify-center gap-0.5 border border-slate-100/60"
            title="Sair do Sistema"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Banner de Assinatura / Trial */}
      {userRole !== 'vendedor' && userRole !== 'superadmin' && (
        <div className={`mb-6 rounded-lg p-3 text-sm flex items-center justify-between shadow-sm border ${daysRemaining <= 3 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{daysRemaining <= 3 ? '⚠️' : '⏳'}</span>
            <p>
              <strong>Status:</strong> {subscriptionStatus === 'trialing' ? 'Período de Teste' : 'Assinatura Ativa'} &mdash; {expirationDate ? (daysRemaining === 0 ? 'Expira hoje!' : `Restam ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}. (Vence em ${expirationDate.toLocaleDateString('pt-BR')})`) : 'Verificando validade...'}
            </p>
          </div>
          <button onClick={() => setShowUpgradeModal(true)} className={`px-4 py-1.5 rounded-md font-bold text-xs shadow-sm transition-colors ${daysRemaining <= 3 ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            Renovar Plano
          </button>
        </div>
      )}

      {/* Modal de Upgrade de Plano */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-8">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Evolua sua Máquina de Vendas</h2>
              <p className="text-slate-500 text-sm">Escolha o plano ideal e renove a sua assinatura para não perder o acesso aos leads.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-4 text-left">
              {/* Vendedor Solo */}
              <div className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white">
                <h3 className="text-lg font-bold text-slate-800">Vendedor Solo</h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">Ideal para 1 usuário.</p>
                <p className="text-3xl font-black text-slate-800 mb-6">R$ 49<span className="text-sm text-slate-400 font-bold">/mês</span></p>
                <ul className="space-y-3 mb-8 text-xs text-slate-600 font-bold">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> 1 Usuário (Gerente)</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Funil de Vendas Kanban</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Automação de WhatsApp</li>
                </ul>
                <a href={`https://www.asaas.com/c/bqbwcc2hczubmdj3?email=${encodeURIComponent(session?.user?.email || '')}&mobilePhone=${encodeURIComponent(companyPhone)}`} target="_blank" rel="noreferrer" className="block w-full bg-slate-800 hover:bg-black text-white text-center font-bold py-3 rounded-xl transition-colors text-sm">Assinar Vendedor Solo</a>
              </div>

              {/* Pequenos Negócios */}
              <div className="border-2 border-indigo-500 rounded-xl p-5 shadow-xl shadow-indigo-500/10 bg-indigo-50/30 relative">
                <div className="absolute -top-3 right-2 bg-gradient-to-r from-indigo-600 to-indigo-600 text-slate-900 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-md shadow-indigo-900/10">Mais Popular</div>
                <h3 className="text-lg font-bold text-indigo-700">Pequenos Negócios</h3>
                <p className="text-xs text-indigo-600/70 mb-4 font-medium">Para pequenas equipes.</p>
                <p className="text-3xl font-black text-indigo-900 mb-6">R$ 79<span className="text-sm text-indigo-600/50 font-bold">/mês</span></p>
                <ul className="space-y-3 mb-8 text-xs text-slate-700 font-bold">
                  <li className="flex items-center gap-2"><span className="text-indigo-500">🔥</span> Até 3 Usuários</li>
                  <li className="flex items-center gap-2"><span className="text-indigo-500">🔥</span> Dashboard de Relatórios</li>
                  <li className="flex items-center gap-2"><span className="text-indigo-500">🔥</span> Suporte Prioritário</li>
                </ul>
                <a href={`https://www.asaas.com/c/jilxk95jdvtgfv6k?email=${encodeURIComponent(session?.user?.email || '')}&mobilePhone=${encodeURIComponent(companyPhone)}`} target="_blank" rel="noreferrer" className="block w-full bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-700 text-white text-center font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm transform hover:-translate-y-0.5">Assinar Pequenos Negócios</a>
              </div>
              
              {/* Equipe Pro */}
              <div className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white">
                <h3 className="text-lg font-bold text-slate-800">Equipe Pro</h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">Para máquinas de vendas reais.</p>
                <p className="text-3xl font-black text-slate-800 mb-6">R$ 99<span className="text-sm text-slate-400 font-bold">/mês</span></p>
                <ul className="space-y-3 mb-8 text-xs text-slate-600 font-bold">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Até 10 Usuários</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Captador B2B Automático</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Suporte VIP WhatsApp</li>
                </ul>
                <a href={`https://www.asaas.com/c/dtho5xew6ca5py2d?email=${encodeURIComponent(session?.user?.email || '')}&mobilePhone=${encodeURIComponent(companyPhone)}`} target="_blank" rel="noreferrer" className="block w-full bg-slate-800 hover:bg-black text-white text-center font-bold py-3 rounded-xl transition-colors text-sm">Assinar Equipe Pro</a>
              </div>
            </div>
            <p className="text-center text-[11px] text-slate-400 font-bold mt-4">Ao efetuar o pagamento, seu plano atual será atualizado automaticamente pelo sistema de cobranças.</p>
          </div>
        </div>
      )}

      {currentView === 'kanban' && userRole === 'superadmin' && (
        <SuperAdminKanban session={session} />
      )}

      {currentView === 'kanban' && userRole !== 'superadmin' && (
        <>
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm shadow-indigo-900/5 border border-slate-100 w-full md:w-64">
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider mb-1">Total em Aberto</span>
              <span className="text-2xl font-black text-indigo-600">R$ {totalFaturamentoPotencial.toLocaleString('pt-BR')}</span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm shadow-indigo-900/5 border border-slate-100 w-full md:w-64">
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider mb-1">Faturamento Realizado</span>
              <span className="text-2xl font-black text-green-500">R$ {totalFaturamentoRealizado.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-full md:flex-1 md:max-w-md">
              <div className="bg-white p-4 rounded-lg shadow-sm shadow-indigo-900/5 border border-slate-100 h-full flex items-center">
                <input 
                  type="text" 
                  placeholder="🔍 Buscar empresa, contato ou telefone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border-none bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Seletor de Abas Móvel para o Kanban */}
          <div className="flex md:hidden overflow-x-auto gap-2 pb-3 mb-4 scrollbar-none justify-start px-1 border-b border-slate-100">
            {columns.map((column) => {
              const isActive = activeMobileCol === column.id;
              const count = column.cards.length;
              
              let badgeBg = isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500';
              if (column.id === 'ganhou') badgeBg = isActive ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700';
              if (column.id === 'perdido') badgeBg = isActive ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700';

              return (
                <button
                  key={column.id}
                  onClick={() => setActiveMobileCol(column.id)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isActive 
                      ? (column.id === 'ganhou' ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-600/10' :
                         column.id === 'perdido' ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/10' :
                         'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10')
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {column.id === 'ganhou' ? '🏆 ' : column.id === 'perdido' ? '💔 ' : ''}
                  {column.title.split(' ')[0]}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badgeBg}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex overflow-x-auto pb-4 gap-4 items-start minimal-scrollbar h-[calc(100dvh-250px)] min-h-[500px]">
            {columns.map((column, colIndex) => (
              <div 
                key={column.id} 
                className={`p-3 rounded-xl w-full md:min-w-[280px] md:max-w-[280px] flex-shrink-0 border flex flex-col h-full ${
                  column.id === 'perdido' 
                    ? 'bg-red-50/80 border-red-200/60' 
                    : column.id === 'ganhou'
                    ? 'bg-green-50/80 border-green-200/60'
                    : 'bg-slate-100/80 border-slate-200/60'
                } ${
                  column.id === activeMobileCol ? 'flex' : 'hidden md:flex'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex justify-between items-center mb-4 px-1">
                  {editingColumnId === column.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingColumnTitle}
                      onChange={(e) => setEditingColumnTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveColumnTitle(column.id)}
                      onBlur={() => saveColumnTitle(column.id)}
                      className="text-xs font-bold uppercase tracking-wider border-b-2 border-indigo-500 focus:outline-none bg-transparent flex-1 mr-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <h2 className={`text-xs font-bold uppercase tracking-wider ${
                        column.id === 'perdido' ? 'text-red-700' : column.id === 'ganhou' ? 'text-green-700' : 'text-slate-700'
                      }`}>
                        {column.id === 'perdido' ? '💔 ' : column.id === 'ganhou' ? '🏆 ' : ''}{column.title}
                      </h2>
                      <button 
                        onClick={() => {
                          setEditingColumnId(column.id);
                          setEditingColumnTitle(column.title);
                        }}
                        className="text-slate-300 hover:text-indigo-600 transition-colors"
                        title="Editar nome da coluna"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                  <span className="bg-white text-slate-600 text-xs px-2 py-1 rounded-md font-bold shadow-sm shadow-indigo-900/5">{column.cards.length}</span>
                </div>
                
                <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-1">
                  {column.cards
                    .filter(card => {
                      const matchSearch = 
                        card.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        card.contato.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        card.telefone.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchOrigem = selectedOrigem === 'all' || (card.origem || 'Novo Lead') === selectedOrigem;
                      return matchSearch && matchOrigem;
                    })
                    .map((card) => {
                      const isAtrasado = card.dataRetorno && new Date(card.dataRetorno) < new Date();
                      // 🔥 Contador de dias parado na coluna
                      const diasParado = card.data_movimentacao
                        ? Math.floor((new Date() - new Date(card.data_movimentacao)) / (1000 * 60 * 60 * 24))
                        : null;
                      const muitoParado = diasParado !== null && diasParado >= 3;
                      return (
                        <div 
                          key={card.id} 
                          className={`bg-white p-4 rounded-xl shadow-sm shadow-indigo-900/5 border-2 ${isAtrasado ? 'border-red-300 bg-red-50/30' : 'border-transparent'} hover:border-indigo-300 hover:shadow-md shadow-indigo-900/10 transition-all cursor-grab relative group`}
                          draggable={window.innerWidth > 768}
                          onDragStart={(e) => handleDragStart(e, card, column.id)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                                card.tipo === 'Cliente Final' ? 'bg-orange-100 text-orange-700' :
                                card.tipo === 'Revenda' ? 'bg-purple-100 text-purple-700' :
                                'bg-teal-100 text-teal-700'
                              }`}>
                                {card.tipo}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                                card.origem === 'Captação B2B' ? 'bg-indigo-100 text-indigo-700' :
                                card.origem === 'Link de WhatsApp' ? 'bg-emerald-100 text-emerald-700' :
                                card.origem.includes('Enviado') ? 'bg-blue-100 text-blue-700' :
                                card.origem.includes('Captação') ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {card.origem || 'Novo Lead'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(card)} className="text-slate-400 hover:text-indigo-500 p-1 bg-slate-50 rounded" title="Editar lead">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteCard(card.id, column.id)} className="text-slate-400 hover:text-red-500 p-1 bg-slate-50 rounded" title="Excluir lead">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-slate-800 text-[15px] mb-1 leading-tight">{card.empresa}</h3>
                          
                          {card.notas && (
                            <div className="bg-yellow-50 border-l-2 border-yellow-400 p-2 my-2 rounded-r-md">
                              <p className="text-[11px] font-medium text-yellow-800 italic">"{card.notas}"</p>
                            </div>
                          )}

                          <div className="text-[11px] text-slate-500 mb-4 font-medium space-y-1">
                            <p className="flex items-center gap-1"><span className="opacity-70">👤</span> {card.contato}</p>
                            <div className="flex items-center gap-1">
                              <span className="opacity-70">📞</span> {card.telefone}
                              {card.telefone && card.telefone !== 'Não informado' && (
                                <a 
                                  href={`https://wa.me/${card.telefone.replace(/\D/g, '').length <= 11 ? '55' : ''}${card.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${card.contato !== 'Sócio/Responsável' ? card.contato.split(' ')[0] : ''}, tudo bem?`)}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="mt-2 w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                  title="Iniciar conversa no WhatsApp"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                                  Falar no WhatsApp
                                </a>
                              )}
                            </div>
                            {card.email && <p className="flex items-center gap-1"><span className="opacity-70">✉️</span> {card.email.toLowerCase()}</p>}
                          </div>
                          
                          {card.dataRetorno && (
                            <div className={`mb-3 p-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
                              isAtrasado ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                              Retornar: {new Date(card.dataRetorno).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              {isAtrasado && ' (Atrasado!)'}
                            </div>
                          )}

                          {/* Resumo do Nicho se houver */}
                          {companyNiche !== 'geral' && NICHOS_CONFIG[companyNiche] && (
                            (() => {
                              const summary = NICHOS_CONFIG[companyNiche].cardSummary(card.dados_nicho || {});
                              if (!summary) return null;
                              return (
                                <div className="mb-3 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-[10px] font-semibold w-fit truncate max-w-full">
                                  {summary}
                                </div>
                              );
                            })()
                          )}

                          {/* 🔥 Badge de dias parado */}
                          {diasParado !== null && (
                            <div className={`mb-3 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit ${
                              muitoParado ? 'bg-red-100 text-red-700' : diasParado >= 1 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                            }`}>
                              {muitoParado ? '🔥' : diasParado >= 1 ? '⏳' : '✅'}
                              {diasParado === 0 ? 'Movido hoje' : `${diasParado} dia${diasParado > 1 ? 's' : ''} aqui`}
                            </div>
                          )}



                          <div className="flex justify-between items-center border-t border-slate-100 pt-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                card.temperatura === 'Quente' ? 'bg-orange-100 text-orange-700' :
                                card.temperatura === 'Morno' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'
                              }`}>
                                {card.temperatura === 'Frio' ? '❄️' : card.temperatura === 'Morno' ? '☕' : '🔥'} {card.temperatura}
                              </span>

                              {userRole === 'admin' && card.user_id && (
                                (() => {
                                  const member = teamMembers.find(m => m.id === card.user_id);
                                  const initials = member ? member.email.substring(0, 2).toUpperCase() : '??';
                                  const colorClass = member ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500';
                                  return (
                                    <span 
                                      className={`text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm select-none ${colorClass}`} 
                                      title={member ? `Responsável: ${member.email}` : 'Responsável não encontrado'}
                                    >
                                      {initials}
                                    </span>
                                  );
                                })()
                              )}
                            </div>
                            <span className="text-[13px] font-black text-slate-800">R$ {Number(card.valor).toLocaleString('pt-BR')}</span>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 md:hidden">
                             <button 
                               onClick={() => handleMoveMobile(card, column.id, columns[colIndex - 1]?.id)}
                               disabled={colIndex === 0}
                               className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold disabled:opacity-30 transition-colors"
                             >
                               ← Voltar
                             </button>
                             <button 
                               onClick={() => handleMoveMobile(card, column.id, columns[colIndex + 1]?.id)}
                               disabled={colIndex === columns.length - 1}
                               className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold disabled:opacity-30 transition-colors"
                             >
                               Avançar →
                             </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 🚀 TELA DE CAMPANHA */}
      {currentView === 'campanha' && (() => {
        // Filtrar leads do CRM conforme filtros
        const saLeads = allCompanies.map(c => ({
          id: c.id,
          empresa: c.name,
          contato: c.name,
          telefone: c.phone || '',
          temperatura: c.sa_temperatura || 'Frio',
          coluna: c.sa_stage || 'leads',
          valor: c.sa_valor || 0
        }));
        const allLeads = userRole === 'superadmin' ? saLeads : columns.flatMap(col => col.cards.map(c => ({ ...c, coluna: col.id })));
        const filteredLeads = allLeads.filter(l => {
          if (campFilter.coluna !== 'all' && l.coluna !== campFilter.coluna) return false;
          if (campFilter.temperatura !== 'all' && l.temperatura !== campFilter.temperatura) return false;
          return l.telefone && l.telefone !== 'Não informado';
        });

        // Parse external list
        const externalContacts = campExternalList
          .split(/[\n,;]/)
          .map(line => {
            const parts = line.trim().split('|');
            return { nome: parts[1]?.trim() || 'Cliente', telefone: parts[0]?.trim().replace(/\D/g, '') };
          })
          .filter(c => c.telefone.length >= 10);

        const handleToggleLead = (id) => {
          setCampSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        };
        const handleSelectAll = () => {
          if (campSelectedLeads.length === filteredLeads.length) setCampSelectedLeads([]);
          else setCampSelectedLeads(filteredLeads.map(l => l.id));
        };

        const handleFireCampaign = async () => {
          if (!campMsg.trim() && !campAttachment) { alert('Escreva uma mensagem ou anexe um arquivo antes de disparar!'); return; }
          const crmContacts = filteredLeads.filter(l => campSelectedLeads.includes(l.id)).map(l => ({ nome: l.contato?.split(' ')[0] || 'Cliente', telefone: l.telefone }));
          const allContacts = campTab === 'crm' ? crmContacts : campTab === 'externa' ? externalContacts : [...crmContacts, ...externalContacts];
          if (allContacts.length === 0) { alert('Selecione ao menos um contato para disparar.'); return; }
          
          // Prepara a mensagem empacotando o anexo caso ele exista
          let payloadMessage = campMsg;
          if (campAttachment) {
            payloadMessage = JSON.stringify({
              text: campMsg,
              attachment: {
                name: campAttachment.name,
                type: campAttachment.type,
                mimetype: campAttachment.mimetype,
                base64: campAttachment.base64
              }
            });
          }

          if (campMode === 'agendar') {
            if (!campDate) { alert('Selecione uma data e hora para agendar.'); return; }
            const scheduleTime = new Date(campDate);
            if (scheduleTime <= new Date()) { alert('A data de agendamento deve ser no futuro.'); return; }
            if (!window.confirm(`Agendar disparo para ${allContacts.length} contatos no dia ${scheduleTime.toLocaleString('pt-BR')}?`)) return;
            
            try {
              const targetCompanyId = (userRole === 'superadmin' && selectedConfigCompanyId) ? selectedConfigCompanyId : (companyId || 'fbd8e84b-d35e-4390-ae05-5e18ab3e888e');
              const { error } = await supabase.from('campaigns').insert({
                company_id: targetCompanyId,
                user_id: session.user.id,
                status: 'pendente',
                scheduled_for: scheduleTime.toISOString(),
                contacts: allContacts,
                message: payloadMessage,
                delay: campDelay
              });
              if (error) throw error;
              alert('Campanha agendada com sucesso! O sistema fará o disparo no servidor.');
              setCampMsg('');
              setCampSelectedLeads([]);
              setCampAttachment(null);
              fetchCampaignQueue(targetCompanyId);
            } catch (err) {
              console.error('Erro ao agendar:', err);
              alert(`Erro ao agendar campanha: ${err.message || 'Verifique o console'}`);
            }
            return;
          }

          // Se for disparo imediato
          if (!window.confirm(`Disparar AGORA para ${allContacts.length} contatos? O envio será processado com segurança no servidor e você poderá fechar a aba.`)) return;

          setCampRunning(true);
          setCampProgress({ sent: 0, total: allContacts.length, log: [] });

          try {
            // Insere campanha imediata no banco (scheduled_for = agora)
            const targetCompanyId = (userRole === 'superadmin' && selectedConfigCompanyId) ? selectedConfigCompanyId : (companyId || 'fbd8e84b-d35e-4390-ae05-5e18ab3e888e');
            const { data, error } = await supabase.from('campaigns').insert({
              company_id: targetCompanyId,
              user_id: session.user.id,
              status: 'pendente',
              scheduled_for: new Date().toISOString(),
              contacts: allContacts,
              message: payloadMessage,
              delay: campDelay
            }).select('id').single();

            if (error) throw error;
            const campaignId = data.id;
            fetchCampaignQueue();

            // Escuta atualizações de progresso no banco via polling a cada 3 segundos
            const interval = setInterval(async () => {
              try {
                const { data: camp, error: fetchErr } = await supabase
                  .from('campaigns')
                  .select('status, completed_at')
                  .eq('id', campaignId)
                  .single();

                if (fetchErr) {
                  console.error(fetchErr);
                  return;
                }

                if (camp.status === 'concluido') {
                  clearInterval(interval);
                  setCampProgress(prev => ({ ...prev, sent: prev.total, log: [{ nome: 'Sistema', telefone: 'Finalizado', status: '✅ Campanha concluída com sucesso!' }, ...prev.log] }));
                  setCampRunning(false);
                  setCampAttachment(null);
                } else if (camp.status.startsWith('enviando:')) {
                  // Parse: enviando:sent/total|nome|telefone|status
                  const parts = camp.status.split(':');
                  const progressData = parts.slice(1).join(':'); // garante lidar com colons internos se houver
                  if (progressData) {
                    const [counts, nome, telefone, msgStatus] = progressData.split('|');
                    const [sent, total] = counts.split('/').map(Number);
                    
                    setCampProgress(prev => {
                      // Evita duplicar logs idênticos de contatos
                      const alreadyLogged = prev.log.some(l => l.telefone === telefone && l.status.includes(msgStatus === 'sucesso' ? 'Enviado' : 'Erro'));
                      const newLog = alreadyLogged ? prev.log : [{
                        nome: nome || 'Cliente',
                        telefone: telefone || '',
                        status: msgStatus === 'sucesso' ? '✅ Enviado (Servidor)' : '❌ Erro no envio'
                      }, ...prev.log];

                      return {
                        sent: sent || prev.sent,
                        total: total || prev.total,
                        log: newLog
                      };
                    });
                  }
                }
              } catch (pollErr) {
                console.error('Erro no polling da campanha:', pollErr);
              }
            }, 3000);

          } catch (err) {
            console.error('Erro ao iniciar campanha no servidor:', err);
            alert(`Erro ao iniciar campanha: ${err.message || 'Verifique o console'}`);
            setCampRunning(false);
          }
        };

        return (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-slate-900">
              <h2 className="text-2xl font-black mb-1">🚀 Campanha de Disparo</h2>
              <p className="text-orange-100 text-sm">Envie mensagens em massa com segurança. Use intervalos para evitar bloqueios.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna esquerda: Contatos */}
              <div className="bg-white rounded-2xl shadow-sm shadow-indigo-900/5 border border-slate-100 p-6">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">1. Escolha os Contatos</h3>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4 gap-1">
                  {[{ id: 'crm', label: '📋 Leads do CRM' }, { id: 'externa', label: '📄 Lista Externa' }, { id: 'ambos', label: '🔀 Ambos' }].map(t => (
                    <button key={t.id} onClick={() => setCampTab(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${campTab === t.id ? 'bg-white text-orange-600 shadow-sm shadow-indigo-900/5' : 'text-slate-500'}`}>{t.label}</button>
                  ))}
                </div>

                {(campTab === 'crm' || campTab === 'ambos') && (
                  <div className="mb-4">
                    <div className="flex gap-2 mb-3">
                      <select value={campFilter.coluna} onChange={e => setCampFilter(p => ({ ...p, coluna: e.target.value }))} className="flex-1 text-xs border border-slate-200 rounded-lg p-2 font-semibold">
                        <option value="all">Todas as colunas</option>
                        {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                      </select>
                      <select value={campFilter.temperatura} onChange={e => setCampFilter(p => ({ ...p, temperatura: e.target.value }))} className="flex-1 text-xs border border-slate-200 rounded-lg p-2 font-semibold">
                        <option value="all">Toda temperatura</option>
                        <option value="Quente">🔥 Quente</option>
                        <option value="Morno">☕ Morno</option>
                        <option value="Frio">❄️ Frio</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-500 font-semibold">{filteredLeads.length} leads encontrados</span>
                      <button onClick={handleSelectAll} className="text-xs font-bold text-orange-600 hover:text-orange-700">{campSelectedLeads.length === filteredLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {filteredLeads.map(lead => (
                        <label key={lead.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${campSelectedLeads.includes(lead.id) ? 'border-orange-300 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}>
                          <input type="checkbox" checked={campSelectedLeads.includes(lead.id)} onChange={() => handleToggleLead(lead.id)} className="accent-orange-500" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{lead.empresa}</p>
                            <p className="text-[10px] text-slate-500">{lead.contato} · {lead.telefone}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(campTab === 'externa' || campTab === 'ambos') && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">Cole os contatos no formato: <code className="bg-slate-100 px-1 rounded">TELEFONE|NOME</code> (um por linha)</p>
                    <textarea
                      value={campExternalList}
                      onChange={e => setCampExternalList(e.target.value)}
                      placeholder={'5511999999999|João Silva\n5521988888888|Maria Santos\n5531977777777|Pedro Costa'}
                      className="w-full h-40 text-xs border border-slate-200 rounded-lg p-3 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <p className="text-xs text-orange-600 font-semibold mt-1">{externalContacts.length} contatos externos válidos detectados</p>
                  </div>
                )}
              </div>

              {/* Coluna direita: Mensagem e Configurações */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm shadow-indigo-900/5 border border-slate-100 p-6">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">2. Escreva a Mensagem</h3>
                  <p className="text-[11px] text-slate-400 mb-2">Use <code className="bg-slate-100 px-1 rounded font-mono">{'{{nome}}'}</code> para personalizar com o nome do contato</p>
                  <textarea
                    value={campMsg}
                    onChange={e => setCampMsg(e.target.value)}
                    placeholder={'Olá {{nome}}! 👋\n\nTemos uma oferta especial para você hoje...'}
                    className="w-full h-40 text-sm border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 notranslate"
                    translate="no"
                  />
                  {campMsg && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl notranslate" translate="no">
                      <p className="text-[10px] font-bold text-green-700 mb-1 uppercase translate-yes" translate="yes">Pré-visualização</p>
                      <p className="text-xs text-green-800 whitespace-pre-wrap">{campMsg.replace(/\{\{nome\}\}/gi, 'João')}</p>
                    </div>
                  )}

                  {/* Anexo de Arquivo ou Áudio */}
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">📎 Anexar Documento ou Áudio</label>
                    <input
                      type="file"
                      id="campFile"
                      onChange={async (e) => {
                        const rawFile = e.target.files[0];
                        if (!rawFile) return;
                        
                        let file = rawFile;
                        if (rawFile.type.startsWith('image/')) {
                          file = await compressImage(rawFile);
                        }
                        
                        if (file.size > 5 * 1024 * 1024) {
                          alert("Por favor, selecione um arquivo de até 5MB.");
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          let type = 'document';
                          if (file.type.startsWith('audio/')) type = 'audio';
                          else if (file.type.startsWith('image/')) type = 'image';
                          else if (file.type.startsWith('video/')) type = 'video';
                          
                          setCampAttachment({
                            name: file.name,
                            size: file.size,
                            mimetype: file.type,
                            base64: reader.result,
                            type: type
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                      accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
                    />
                    
                    {!campAttachment ? (
                      <label
                        htmlFor="campFile"
                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-orange-50/20 transition-all text-center h-28 w-full"
                      >
                        <span className="text-2xl mb-1">📎</span>
                        <span className="text-xs font-bold text-slate-600">Enviar Arquivo</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PDF, Imagem, Vídeo (Max 5MB)</span>
                      </label>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl">
                              {campAttachment.type === 'image' ? '🖼️' : '📄'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{campAttachment.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {(campAttachment.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCampAttachment(null);
                              const fileInput = document.getElementById('campFile');
                              if (fileInput) fileInput.value = '';
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-black p-1 hover:bg-red-50 rounded"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm shadow-indigo-900/5 border border-slate-100 p-6">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">3. Configurações de Segurança</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Intervalo entre mensagens</label>
                      <div className="flex items-center gap-2">
                        <input type="range" min="10" max="60" value={campDelay} onChange={e => setCampDelay(Number(e.target.value))} className="flex-1 accent-orange-500" />
                        <span className="text-sm font-black text-orange-600 w-16">{campDelay}s</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">⚠️ Intervalos menores que 10s aumentam o risco de bloqueio pelo WhatsApp</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm shadow-indigo-900/5 border border-slate-100 p-6">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">4. Quando Disparar?</h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-4 gap-1">
                    {[{ id: 'agora', label: '🚀 Agora' }, { id: 'agendar', label: '⏰ Agendar' }].map(t => (
                      <button key={t.id} onClick={() => setCampMode(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${campMode === t.id ? 'bg-white text-orange-600 shadow-sm shadow-indigo-900/5' : 'text-slate-500'}`}>{t.label}</button>
                    ))}
                  </div>

                  {campMode === 'agendar' && (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Data e Hora do Disparo</label>
                      <input 
                        type="datetime-local" 
                        value={campDate} 
                        onChange={e => setCampDate(e.target.value)} 
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      {campMode === 'agendar' && campAttachment && (
                        <p className="text-[11px] text-red-500 font-bold mb-3">
                          ⚠️ Atenção: Não é possível agendar campanhas com anexo. Mude para 'Agora' ou remova o anexo.
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-2">O servidor fará o disparo automaticamente nesta data, mesmo com o PC desligado.</p>
                    </div>
                  )}
                </div>

                {/* Botão de disparo */}
                <button
                  onClick={handleFireCampaign}
                  disabled={campRunning || (campMode === 'agendar' && !!campAttachment)}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-orange-500/30 text-lg transform hover:-translate-y-0.5"
                >
                  {campRunning ? '⏳ Disparando...' : campMode === 'agendar' ? '⏰ Agendar Campanha' : '🚀 Disparar Campanha Agora'}
                </button>
              </div>
            </div>

            {/* Progresso */}
            {campProgress && (
              <div className="bg-white rounded-2xl shadow-sm shadow-indigo-900/5 border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Progresso da Campanha</h3>
                  <span className="text-2xl font-black text-orange-600">{campProgress.sent}/{campProgress.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500" style={{ width: `${(campProgress.sent / campProgress.total) * 100}%` }} />
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {campProgress.log.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
                      <span className="font-semibold text-slate-700">{item.nome} · {item.telefone}</span>
                      <span className="font-bold">{item.status}</span>
                    </div>
                  ))}
                </div>
                {!campRunning && campProgress.sent === campProgress.total && (
                  (() => {
                    const successCount = campProgress.log.filter(l => l.status.includes('✅')).length;
                    if (successCount > 0) {
                      return (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                          <p className="text-green-700 font-black">🎉 Campanha finalizada! {successCount} mensagem(ns) enviada(s) com sucesso.</p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                          <p className="text-red-700 font-black">⚠️ Campanha finalizada, mas nenhuma mensagem foi entregue.</p>
                          <p className="text-red-600 text-xs font-bold mt-1">Verifique se a sua conexão de WhatsApp está ativa no menu "💬 WhatsApp".</p>
                        </div>
                      );
                    }
                  })()
                )}
              </div>
            )}

            {/* 📅 FILA DE ENVIOS E CAMPANHAS AGENDADAS */}
            <div className="bg-white rounded-2xl shadow-sm shadow-indigo-900/5 border border-slate-100 p-6 mt-6">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    📅 Fila de Envios &amp; Campanhas Agendadas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Acompanhe os disparos programados, o andamento das entregas e gerencie suas campanhas.
                  </p>
                </div>
                <button
                  onClick={() => fetchCampaignQueue()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Atualizar fila"
                >
                  🔄 Atualizar Fila
                </button>
              </div>

              {campaignQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm font-bold text-slate-600">Nenhuma campanha na fila ou agendada</p>
                  <p className="text-xs text-slate-400 mt-1">Crie uma nova campanha acima para iniciar ou agendar disparos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaignQueue.map((camp) => {
                    let parsedText = '';
                    try {
                      const trimmed = (camp.message || '').trim();
                      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                        parsedText = JSON.parse(trimmed).text || camp.message;
                      } else {
                        parsedText = camp.message;
                      }
                    } catch (e) {
                      parsedText = camp.message;
                    }

                    const isScheduledFuture = camp.scheduled_for && new Date(camp.scheduled_for) > new Date();
                    const formattedDate = camp.scheduled_for ? new Date(camp.scheduled_for).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Imediato';
                    const contactsCount = camp.contacts ? camp.contacts.length : 0;
                    
                    let statusBadge = (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                        ⏳ Agendado
                      </span>
                    );
                    if (camp.status.startsWith('enviando')) {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-black rounded-lg uppercase tracking-wider animate-pulse flex items-center gap-1">
                          🚀 Disparando...
                        </span>
                      );
                    } else if (camp.status === 'concluido') {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                          ✅ Concluído
                        </span>
                      );
                    } else if (camp.status === 'cancelado') {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                          🚫 Cancelado
                        </span>
                      );
                    }

                    return (
                      <div key={camp.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {statusBadge}
                            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              👥 {contactsCount} destinatário{contactsCount > 1 ? 's' : ''}
                            </span>
                            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              ⏱️ {camp.delay || 20}s entre msgs
                            </span>
                          </div>

                          <p className="text-sm font-bold text-slate-800 truncate" title={parsedText}>
                            "{parsedText}"
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                            <span>📅 Disparo: <strong>{isScheduledFuture ? `Agendado para ${formattedDate}` : (camp.status === 'concluido' ? `Finalizado (${formattedDate})` : `Programado (${formattedDate})`)}</strong></span>
                          </div>
                        </div>

                        {(camp.status === 'pendente' || camp.status.startsWith('enviando')) && (
                          <button
                            onClick={() => handleCancelCampaign(camp.id)}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                            title="Cancelar/Excluir agendamento"
                          >
                            🗑️ Cancelar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {lossModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-5 mx-auto">
              <span className="text-2xl">💔</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 text-center mb-1">Motivo da Perda</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Por que <b>{lossModal.card.empresa}</b> foi perdido? Isso vai gerar relatórios valiosos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {LOSS_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setLossReason(reason)}
                  className={`p-3 rounded-xl border-2 text-sm font-bold text-left transition-all ${
                    lossReason === reason
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/50'
                  }`}
                >
                  {lossReason === reason ? '✓ ' : ''}{reason}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setLossModal(null); setLossReason(''); }}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmLoss}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-slate-900 font-bold transition-colors shadow-lg shadow-red-500/30"
              >
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Valor em Negociação por Etapa (R$)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(value) => `R$ ${value}`} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Bar dataKey="Valor" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Quantidade de Leads no Funil</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="Quantidade" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100 md:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Em Aberto vs Ganho (R$)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#10B981" />
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'superadmin' && <SuperAdminPanel />}

      {currentView === 'whatsapp' && (
        <div className="max-w-2xl mx-auto space-y-6 mt-8 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Conecte o seu WhatsApp</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">Para que a Nexale envie mensagens automaticamente para seus leads, você precisa conectar o número da sua empresa.</p>
            
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
              
              {waConnected ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Conectado com Sucesso!</h3>
                  <p className="text-slate-500 mb-2 font-medium">Sua conta ({waUser}) está vinculada à Nexale.</p>
                  <p className="text-sm text-slate-400 mb-8">As mensagens automáticas serão disparadas quando você mover cards no Kanban.</p>

                  <button 
                    onClick={() => setCurrentView('campanha')}
                    className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/30 transform hover:-translate-y-0.5 w-full max-w-sm flex items-center justify-center gap-3 text-lg mb-3"
                  >
                    <span>🚀 Ir para Campanhas</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('kanban')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-all w-full max-w-sm flex items-center justify-center gap-2 text-sm"
                  >
                    📋 Voltar ao Kanban
                  </button>

                  <button 
                    onClick={async () => {
                      if (window.confirm('Tem certeza que deseja desconectar o seu WhatsApp? Você terá que ler o QR Code novamente.')) {
                        try {
                          const activeInstance = userRole === 'superadmin' ? 'superadmin' : companyId;
                          await fetch(`/evolution/instance/logout/${activeInstance}`, {
                            method: 'DELETE',
                            headers: { 'apikey': '123' }
                          });
                        } catch(e) {
                          console.warn('Erro ao desconectar no servidor:', e);
                        }
                        setIsWahaConnected(false);
                        setWaConnected(false);
                        setWaUser('');
                        handleGenerateQR();
                      }
                    }}
                    className="mt-6 text-xs font-bold text-red-500 hover:text-red-700 transition-colors underline"
                  >
                    Desconectar WhatsApp
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">Passo a Passo</p>
                  <ol className="text-left text-sm text-slate-600 mb-8 space-y-3 font-medium max-w-sm mx-auto">
                    <li className="flex gap-3"><span className="bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span> Abra o WhatsApp no seu celular</li>
                    <li className="flex gap-3"><span className="bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span> Toque em Mais opções (⋮) ou Configurações</li>
                    <li className="flex gap-3"><span className="bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span> Toque em Dispositivos conectados e Conectar um dispositivo</li>
                  </ol>
                  
                  {!qrCodeImage ? (
                    <button 
                      onClick={handleGenerateQR}
                      disabled={isGeneratingQR}
                      className="bg-green-500 hover:bg-green-600 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-green-500/30 transform hover:-translate-y-0.5 w-full max-w-xs disabled:opacity-50"
                    >
                      {isGeneratingQR ? 'Gerando...' : 'Gerar QR Code de Conexão'}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="p-2 bg-white rounded-xl shadow-md shadow-indigo-900/10 border-4 border-white mb-4">
                        <img src={qrCodeImage} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">Escaneie o código com seu WhatsApp para conectar.</p>
                      <button 
                        onClick={() => setQrCodeImage(null)} 
                        className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Gerar novo código
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {currentView === 'ai_config' && (
        <div className="max-w-2xl mx-auto space-y-6 mt-8 animate-fade-in">
          {userRole === 'superadmin' && (
            <div className="bg-white p-6 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100 text-left space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase">Empresa a Configurar (Visão Master)</label>
              <select
                value={selectedConfigCompanyId}
                onChange={(e) => setSelectedConfigCompanyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                {allCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-white p-8 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100 text-left space-y-5">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              🤖 Inteligência Artificial (Atendente Virtual)
            </h2>
            <p className="text-sm text-slate-500">
              Configure a Inteligência Artificial para responder as mensagens do seu WhatsApp automaticamente utilizando o modelo Google Gemini.
            </p>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-900">Ativar Atendente Virtual (IA)</p>
                <p className="text-xs text-indigo-700/80">Se ativo, a IA responderá novas conversas recebidas e leads no funil com IA ativa.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">Chave da API do Gemini (Google AI Studio)</label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="Cole sua API Key do Gemini aqui (AIzaSy...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
              />
              <p className="text-[10px] text-slate-400">
                Obtenha uma chave gratuita acessando o <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">Google AI Studio</a>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">Frase Gatilho do WhatsApp</label>
              <input
                type="text"
                value={triggerPhrase}
                onChange={(e) => setTriggerPhrase(e.target.value)}
                placeholder="Ex: Olá, vi seu anúncio e gostaria de mais informações!"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
              />
              <p className="text-[10px] text-slate-400">
                O robô de atendimento só será ativado para novos contatos caso a mensagem deles contiver exatamente esta frase. Deixe em branco se quiser desativar a proteção (não recomendado).
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">Instruções de Comportamento (Prompt)</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Você é o atendente virtual da nossa empresa. Seja simpático, prestativo e fale de maneira resumida..."
                rows={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none notranslate transition-all"
                translate="no"
              />
              <p className="text-[10px] text-slate-400 mb-4">
                Descreva a persona: quem ela é, regras de preço, horário, e como agir caso o cliente faça perguntas difíceis.
              </p>

              {/* Botões de Sugestão de Prompts por Nicho */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">✨ Modelos Sugeridos por Nicho</span>
                  {templateLoadedMsg && (
                    <span className="text-[10px] font-bold text-emerald-600 animate-pulse flex items-center gap-1">
                      ✅ {templateLoadedMsg}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(AI_PROMPTS_TEMPLATES).map((key) => {
                    const isRecomendado = key === companyNiche;
                    const config = NICHOS_CONFIG[key] || NICHOS_CONFIG.geral;
                    const label = config.label.split('/')[0].split('&')[0].trim();
                    const emoji = key === 'geral' ? '📋' : key === 'imobiliaria' ? '🏠' : key === 'veiculos' ? '🚗' : key === 'b2b' ? '💼' : key === 'clinicas' ? '🏥' : key === 'escolas' ? '🎓' : key === 'eventos' ? '🎉' : key === 'advocacia' ? '⚖️' : key === 'seguros' ? '🛡️' : key === 'moveis' ? '🪚' : '📋';
                    
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleLoadPromptTemplate(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isRecomendado
                            ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-indigo-600'
                        }`}
                        title={isRecomendado ? 'Recomendado para o nicho atual da sua empresa' : `Carregar modelo para ${config.label}`}
                      >
                        <span>{emoji}</span> {label} {isRecomendado && <span className="text-[8px] uppercase bg-indigo-200 text-indigo-800 px-1 rounded">Recomendado</span>}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  ⚠️ Ao clicar em um modelo, o texto acima será substituído. Edite os campos entre colchetes <strong>[ ]</strong> com as informações reais do seu negócio antes de salvar.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveAiSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                💾 Salvar Configurações da IA
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm shadow-indigo-900/5 border border-slate-100 text-left space-y-5">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              🏢 Perfil e Nicho da Empresa
            </h2>
            <p className="text-sm text-slate-500">
              Configure o segmento de atuação da sua empresa para adaptar o formulário de cadastro de leads e resumos de cartões no Kanban.
            </p>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">Nicho de Atuação (Funil de Vendas)</label>
              <select
                value={companyNiche}
                onChange={(e) => handleUpdateCompanyNiche(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                {Object.entries(NICHOS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Isso altera dinamicamente os campos de captação na ficha dos Leads e a exibição de tags no funil.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-600 uppercase">Logotipo da Empresa</label>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center py-2">
                {/* Preview e Botão de Envio */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 shrink-0 overflow-hidden relative">
                    {companyLogoUrl ? (
                      <img src={companyLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-xl">🏢</span>
                    )}
                  </div>
                  
                  <div>
                    <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-colors inline-block">
                      {isUploadingLogo ? 'Enviando...' : '📤 Escolher Imagem (Upload)'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogo}
                        className="hidden"
                        disabled={isUploadingLogo}
                      />
                    </label>
                    {companyLogoUrl && (
                      <button
                        onClick={() => handleUpdateCompanyLogoUrl('')}
                        className="block mt-1.5 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remover logotipo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Opção para URL também */}
              <div className="space-y-1 pt-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Ou cole o link direto da imagem</span>
                <input
                  type="text"
                  placeholder="https://suaempresa.com/logo.png"
                  value={companyLogoUrl}
                  onChange={(e) => handleUpdateCompanyLogoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                Selecione uma imagem (PNG, JPG, SVG) com até 3MB. Ela aparecerá no topo da sua Landing Page de captação.
              </p>
            </div>


          </div>
        </div>
      )}

      {currentView === 'tutorials' && (
        <TutorialsPage />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row w-full max-h-[90vh] overflow-hidden ${editingCardId ? 'max-w-5xl' : 'max-w-md'}`}>
            
            <div className={`p-6 overflow-y-auto ${editingCardId ? 'w-full md:w-1/2 border-r border-slate-100' : 'w-full'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">{editingCardId ? 'Detalhes da Oportunidade' : 'Cadastrar Novo Lead'}</h3>
                {!editingCardId && (
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              {editingCardId && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Atendimento por IA Ativo</p>
                      <p className="text-[10px] text-slate-500">A IA responderá as mensagens recebidas deste lead.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={!activeCardAiPaused} 
                      onChange={async (e) => {
                        const val = !e.target.checked;
                        setActiveCardAiPaused(val);
                        setColumns(prev => prev.map(col => ({
                          ...col,
                          cards: col.cards.map(c => c.id === editingCardId ? { ...c, ai_paused: val } : c)
                        })));
                        await supabase.from('leads').update({ ai_paused: val }).eq('id', editingCardId);
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}

              <form onSubmit={handleSaveLead} className="space-y-5">
                {userRole === 'admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      {companyNiche === 'imobiliaria' ? 'Corretor Responsável' : companyNiche === 'estetica' ? 'Profissional Responsável' : 'Responsável pelo Lead'}
                    </label>
                    <select
                      value={formData.user_id || session?.user?.id || ''}
                      onChange={e => setFormData({...formData, user_id: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-semibold text-slate-700"
                    >
                      <option value={session.user.id}>Você ({session.user.email})</option>
                      {teamMembers.filter(m => m.id !== session.user.id).map(m => (
                        <option key={m.id} value={m.id}>{m.email}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa / Razão Social</label>
                  <input type="text" required value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contato (Pessoa)</label>
                    <input type="text" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp</label>
                    <input type="text" required value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Estimado (R$)</label>
                    <input type="number" required value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-indigo-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas Rápidas (Destaque)</label>
                    <input type="text" value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all" placeholder="Ex: Ligar na terça..." />
                  </div>
                </div>

                {companyNiche !== 'geral' && NICHOS_CONFIG[companyNiche] && NICHOS_CONFIG[companyNiche].fields.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      📊 Dados do Nicho: {NICHOS_CONFIG[companyNiche].label}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {NICHOS_CONFIG[companyNiche].fields.map(field => {
                        const val = formData.dados_nicho?.[field.key] || '';
                        const updateNicheVal = (newVal) => {
                          setFormData(prev => ({
                            ...prev,
                            dados_nicho: {
                              ...prev.dados_nicho,
                              [field.key]: newVal
                            }
                          }));
                        };
                        return (
                          <div key={field.key} className="text-left">
                            <label className="block text-xs font-bold text-slate-600 mb-1">{field.label}</label>
                            {field.type === 'select' ? (
                              <select
                                value={val}
                                onChange={e => updateNicheVal(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              >
                                <option value="">Selecione...</option>
                                {field.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type}
                                value={val}
                                onChange={e => updateNicheVal(e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-700 transition-colors">
                    {showAdvanced ? 'Ocultar campos avançados' : 'Mostrar campos avançados (E-mail, Tipo, etc.)'}
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {showAdvanced && (
                  <div className="space-y-5 border-t border-slate-100 pt-5 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Perfil do Cliente</label>
                        <input list="perfis" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Selecione..." />
                        <datalist id="perfis">
                          <option value="B2B">Empresa (B2B)</option>
                          <option value="Cliente Final">Cliente Final</option>
                          <option value="Revenda">Revenda / Lojista</option>
                          <option value="Parceiro">Parceiro Estratégico</option>
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temperatura</label>
                        <select value={formData.temperatura} onChange={e => setFormData({...formData, temperatura: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                          <option value="Frio">❄️ Frio (Início)</option>
                          <option value="Morno">☕ Morno (Avançando)</option>
                          <option value="Quente">🔥 Quente (Perto de fechar)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agendar Retorno</label>
                        <input type="datetime-local" value={formData.dataRetorno} onChange={e => setFormData({...formData, dataRetorno: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Longas</label>
                      <input type="text" value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Breve anotação sobre a origem ou necessidade..." />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 mt-6 border-t border-slate-100 w-full">
                  <div>
                    {editingCardId && (
                      <button type="button" onClick={() => handleDeleteLead(editingCardId)} className="px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                        🗑️ Excluir Cliente
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {editingCardId && (
                      <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Fechar</button>
                    )}
                    <button type="submit" className="px-6 py-2.5 text-sm font-bold text-slate-900 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-900/10 hover:shadow-lg cursor-pointer">{editingCardId ? 'Salvar Alterações' : 'Criar Novo Lead'}</button>
                  </div>
                </div>
              </form>
            </div>

            {editingCardId && (
              <div className="w-full md:w-1/2 bg-slate-50 p-6 flex flex-col h-[50vh] md:h-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    Histórico de Interações
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors md:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-indigo-900/5 mb-4">
                  <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full border-none focus:ring-0 text-sm resize-none mb-2"
                    rows="2"
                    placeholder="Escreva uma anotação, registre uma ligação..."
                  ></textarea>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-black text-slate-900 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Adicionar Nota
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 minimal-scrollbar">
                  {loadingNotes ? (
                    <p className="text-center text-slate-400 text-sm mt-10">Carregando histórico...</p>
                  ) : leadNotes.length === 0 ? (
                    <div className="text-center mt-10">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </div>
                      <p className="text-slate-500 text-sm font-medium">Nenhuma nota registrada</p>
                      <p className="text-slate-400 text-xs mt-1">Registre cada passo da sua negociação.</p>
                    </div>
                  ) : (
                    leadNotes.map(note => {
                      const member = teamMembers.find(m => m.id === note.user_id);
                      const authorEmail = member ? member.email : (note.user_id === session?.user?.id ? session?.user?.email : null);
                      return (
                        <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm shadow-indigo-900/5 relative group">
                          <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap pr-6">{note.nota}</p>
                          <div className="flex justify-between items-center mt-3">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {new Date(note.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                            {authorEmail && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                {authorEmail.split('@')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showScraperModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">⚡ Captação Híbrida B2B</h3>
            <p className="text-xs text-slate-500 mb-4">
              1. Acesse o <a href="https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">Casa dos Dados</a> e pesquise as empresas. <br/>
              2. Selecione e <strong>copie todo o texto</strong> da página de resultados e cole na caixa abaixo:
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Perfil dos Leads a Importar</label>
              <input list="perfis" value={scraperPerfil} onChange={e => setScraperPerfil(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" placeholder="Ex: B2B" />
            </div>
            <textarea 
              value={scraperText}
              onChange={(e) => setScraperText(e.target.value)}
              className="w-full h-32 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 font-mono text-xs"
              placeholder="Cole o texto aqui... O sistema vai caçar os CNPJs automaticamente!"
            ></textarea>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowScraperModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" disabled={isScraping}>Cancelar</button>
              <button type="button" onClick={handleScrape} className="px-4 py-2 text-sm font-medium text-slate-900 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm shadow-indigo-900/5 cursor-pointer flex items-center gap-2" disabled={isScraping}>
                {isScraping ? 'Enriquecendo dados...' : 'Extrair e Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-2">⚙️ Configurar Mensagens Automáticas</h3>
            <p className="text-xs text-slate-500 mb-4">
              Personalize a mensagem de WhatsApp enviada quando você arrastar um lead para a coluna. 
              Use <strong>{'{'}{'{'}nome{'}'}{'}'}</strong> para inserir o primeiro nome do cliente.
            </p>
            <div className="space-y-4">
              {[
                {id: 'contato', label: '1. Primeiro Contato'}, 
                {id: 'amostra', label: '2. Envio de Amostra/Apresentação'}, 
                {id: 'proposta', label: '3. Proposta Enviada'}, 
                {id: 'negociacao', label: '4. Negociação em Andamento'}, 
                {id: 'ganhou', label: '5. Negócio Fechado (Ganhou)'}
              ].map(col => (
                <div key={col.id}>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{col.label}</label>
                  <textarea 
                    value={messageTemplates[col.id] || ''}
                    onChange={(e) => setMessageTemplates(prev => ({...prev, [col.id]: e.target.value}))}
                    className="w-full h-16 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  ></textarea>
                </div>
              ))}

            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">Cancelar</button>
              <button type="button" onClick={saveTemplates} className="px-4 py-2 text-sm font-medium text-slate-900 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-900/5 cursor-pointer">
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
              🚀 Captação B2C — Landing Page Personalizada
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Compartilhe seu link exclusivo em anúncios, bio do Instagram ou WhatsApp. O lead preenche um formulário bonito e entra direto no seu Kanban!
            </p>

            {/* Como funciona */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Como funciona?</h4>
              <div className="flex gap-3 text-xs text-slate-600">
                <span className="bg-green-100 text-green-700 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                <p><strong>Copie seu link exclusivo</strong> abaixo e coloque na bio do Instagram, no WhatsApp ou como destino dos seus anúncios no Meta Ads / Google Ads.</p>
              </div>
              <div className="flex gap-3 text-xs text-slate-600">
                <span className="bg-green-100 text-green-700 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                <p>O lead acessa uma <strong>página profissional</strong> com o tema do nicho da sua empresa e preenche nome, telefone e informações específicas.</p>
              </div>
              <div className="flex gap-3 text-xs text-slate-600">
                <span className="bg-green-100 text-green-700 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">3</span>
                <p>O card entra <strong>automaticamente no Kanban</strong>, sem depender do WhatsApp receber mensagem. 100% confiável!</p>
              </div>
            </div>

            {/* Link da Landing Page */}
            <div className="space-y-2 mb-5">
              <label className="block text-xs font-bold text-slate-600 uppercase">Seu Link de Captação</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/captar/${session?.user?.id || ''}`}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-slate-50 text-slate-700 cursor-copy font-mono"
                  onClick={(e) => {
                    e.target.select();
                    navigator.clipboard.writeText(e.target.value);
                    alert('✅ Link copiado!');
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/captar/${session?.user?.id || ''}`);
                    alert('✅ Link copiado!');
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors shrink-0"
                >
                  Copiar
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Clique no link para copiar. Cada vendedor tem seu próprio link exclusivo.</p>
            </div>

            {/* Preview */}
            <div className="mb-5">
              <button
                onClick={() => window.open(`${window.location.origin}/captar/${session?.user?.id || ''}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-500 hover:text-green-600 font-semibold py-3 rounded-xl transition-all text-sm"
              >
                👁️ Pré-visualizar minha Landing Page
              </button>
            </div>

            {/* Nicho ativo */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3 mb-5">
              <span className="text-2xl">{NICHOS_CONFIG[companyNiche]?.emoji || '📋'}</span>
              <div>
                <p className="text-xs font-bold text-indigo-700">Nicho Ativo da Empresa</p>
                <p className="text-xs text-indigo-600">{NICHOS_CONFIG[companyNiche]?.label || 'Geral / Padrão'} — os campos do formulário já estão configurados para este segmento.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* WIDGET FLUTUANTE DE SAC COM IA (NEXA)       */}
      {/* ========================================== */}
      <div className="fixed bottom-6 right-6 z-[999]">
        {/* Botão de abrir/fechar */}
        <button
          onClick={() => setIsSacOpen(!isSacOpen)}
          className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer relative group border-2 border-indigo-200/50"
        >
          {isSacOpen ? (
            <span className="text-2xl font-bold">✕</span>
          ) : (
            <span className="text-2xl animate-pulse">💬</span>
          )}
          {!isSacOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 text-[9px] text-white font-extrabold items-center justify-center shadow-md">1</span>
            </span>
          )}
          <span className="absolute right-16 bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
            Suporte IA Nexale
          </span>
        </button>

        {/* Janela do Chat */}
        {isSacOpen && (
          <div className="absolute bottom-16 right-0 w-[350px] sm:w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 shadow-indigo-900/10">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-4 flex items-center gap-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner border border-white/10">🤖</div>
              <div>
                <h4 className="text-sm font-black flex items-center gap-1.5">
                  Nexa <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                </h4>
                <p className="text-[10px] text-indigo-100 font-semibold">Suporte Inteligente Nexale CRM</p>
              </div>
            </div>

            {/* Histórico de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
              {sacMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.content.split('\n').map((line, idx) => (
                      <span key={idx} className="block min-h-[4px]">{line}</span>
                    ))}
                  </div>
                </div>
              ))}
              {isSacSending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-400 font-semibold shadow-sm flex items-center gap-1.5 animate-pulse">
                    <span>🤖 Nexa está digitando</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendSacMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
              <input
                type="text"
                placeholder="Digite sua dúvida sobre o CRM..."
                value={sacInput}
                onChange={(e) => setSacInput(e.target.value)}
                disabled={isSacSending}
                className="flex-1 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl px-4 py-2 text-xs transition-colors bg-slate-50 text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isSacSending || !sacInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-black transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Enviar
              </button>
            </form>
            <div className="bg-slate-50 border-t border-slate-100 px-3 py-1.5 text-center">
              <p className="text-[9px] text-slate-400 font-bold tracking-wide">
                Suporte por e-mail: <a href="mailto:contato@nexalecrm.com.br" className="text-indigo-600 hover:underline">contato@nexalecrm.com.br</a>
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
