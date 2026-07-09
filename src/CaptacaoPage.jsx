import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// ─── Configuração de Nichos ───────────────────────────────────────────────────
const NICHOS_CONFIG = {
  geral: {
    label: 'Geral / Padrão', emoji: '📋', fields: [],
    tema: {
      bg: 'from-indigo-950 via-slate-900 to-indigo-950',
      btn: 'bg-indigo-500 hover:bg-indigo-400',
      accent: '#6366f1', icon: '🤝',
      hero: 'Fale Conosco',
      subtitle: 'Preencha o formulário e entraremos em contato em breve!',
    }
  },
  imobiliaria: {
    label: 'Imobiliária & Corretores', emoji: '🏠',
    fields: [
      { key: 'tipo_imovel', label: 'Tipo de Imóvel', type: 'select', options: ['Casa', 'Apartamento', 'Terreno', 'Sobrado', 'Comercial'] },
      { key: 'valor_pretendido', label: 'Valor do Imóvel que Procura (R$)', type: 'number', placeholder: 'Ex: 450000' },
      { key: 'renda_cliente', label: 'Sua Renda Mensal (R$)', type: 'number', placeholder: 'Ex: 8000' },
      { key: 'quartos', label: 'Quantidade de Quartos', type: 'text', placeholder: 'Ex: 3 quartos' },
    ],
    tema: {
      bg: 'from-blue-950 via-slate-900 to-blue-950',
      btn: 'bg-blue-400 hover:bg-blue-300',
      accent: '#60a5fa', icon: '🏠',
      hero: 'Encontre o Imóvel dos Seus Sonhos',
      subtitle: 'Preencha as informações abaixo e um especialista entrará em contato para encontrar o imóvel perfeito para você!',
    }
  },
  veiculos: {
    label: 'Concessionária / Loja de Carros', emoji: '🚗',
    fields: [
      { key: 'carro_interesse', label: 'Veículo de Interesse', type: 'text', placeholder: 'Ex: Honda Civic, Toyota Corolla...' },
      { key: 'ano_modelo', label: 'Ano / Modelo', type: 'text', placeholder: 'Ex: 2022/2023' },
      { key: 'carro_troca', label: 'Possui Veículo para Troca?', type: 'select', options: ['Não', 'Sim (Mesmo valor)', 'Sim (Menor valor)', 'Sim (Maior valor)'] },
      { key: 'valor_entrada', label: 'Valor de Entrada Disponível (R$)', type: 'number', placeholder: 'Ex: 20000' },
    ],
    tema: {
      bg: 'from-gray-950 via-red-950 to-gray-950',
      btn: 'bg-red-500 hover:bg-red-400',
      accent: '#f87171', icon: '🚗',
      hero: 'Seu Próximo Carro Está Aqui',
      subtitle: 'Diga o que você procura e nosso especialista vai encontrar o veículo ideal para o seu perfil e orçamento!',
    }
  },
  b2b: {
    label: 'Vendas B2B / Serviços', emoji: '💼',
    fields: [
      { key: 'cargo_contato', label: 'Seu Cargo na Empresa', type: 'text', placeholder: 'Ex: Diretor Comercial, CEO...' },
      { key: 'tamanho_empresa', label: 'Tamanho da Empresa', type: 'select', options: ['1-10 func.', '11-50 func.', '51-200 func.', '200+ func.'] },
      { key: 'faturamento', label: 'Faturamento Anual Aproximado', type: 'text', placeholder: 'Ex: Até R$ 1 milhão' },
    ],
    tema: {
      bg: 'from-indigo-950 via-cyan-950 to-indigo-950',
      btn: 'bg-cyan-500 hover:bg-cyan-400',
      accent: '#22d3ee', icon: '🏢',
      hero: 'Vamos Crescer Juntos?',
      subtitle: 'Conte-nos sobre sua empresa e descubra como podemos impulsionar seus resultados!',
    }
  },
  clinicas: {
    label: 'Clínicas / Estética / Consultórios', emoji: '🏥',
    fields: [
      { key: 'procedimento', label: 'Procedimento de Interesse', type: 'select', options: ['Botox', 'Preenchimento', 'Fisioterapia', 'Consulta Médica', 'Nutrição', 'Odontologia', 'Outros'] },
      { key: 'profissional', label: 'Profissional Preferido (opcional)', type: 'text', placeholder: 'Ex: Dr. Silva' },
      { key: 'data_consulta', label: 'Melhor Dia/Horário para Contato', type: 'text', placeholder: 'Ex: Terça à tarde' },
    ],
    tema: {
      bg: 'from-pink-950 via-rose-900 to-pink-950',
      btn: 'bg-pink-400 hover:bg-pink-300',
      accent: '#f472b6', icon: '🌸',
      hero: 'Cuide-se com Quem Entende',
      subtitle: 'Agende sua consulta ou procedimento. Nossa equipe entrará em contato para confirmar seu horário!',
    }
  },
  escolas: {
    label: 'Escolas / Cursos / Educação', emoji: '🎓',
    fields: [
      { key: 'curso_interesse', label: 'Curso ou Área de Interesse', type: 'text', placeholder: 'Ex: Inglês Intensivo, MBA...' },
      { key: 'periodo', label: 'Período Preferido', type: 'select', options: ['Manhã', 'Tarde', 'Noite', 'Sábado', 'EAD / Online'] },
      { key: 'aluno_nome', label: 'Nome do Aluno (se diferente)', type: 'text', placeholder: 'Deixe em branco se for você mesmo' },
    ],
    tema: {
      bg: 'from-emerald-950 via-teal-900 to-emerald-950',
      btn: 'bg-emerald-400 hover:bg-emerald-300',
      accent: '#34d399', icon: '🎓',
      hero: 'Invista no Seu Futuro',
      subtitle: 'Preencha o formulário e um consultor educacional vai apresentar as melhores opções para você!',
    }
  },
  eventos: {
    label: 'Eventos / Festas / Buffet', emoji: '🎉',
    fields: [
      { key: 'tipo_evento', label: 'Tipo de Evento', type: 'select', options: ['Casamento', 'Aniversário', 'Corporativo', 'Formatura', 'Infantil', 'Outros'] },
      { key: 'data_evento', label: 'Data Prevista do Evento', type: 'text', placeholder: 'Ex: Dezembro/2026' },
      { key: 'qtd_convidados', label: 'Estimativa de Convidados', type: 'number', placeholder: 'Ex: 150' },
    ],
    tema: {
      bg: 'from-purple-950 via-violet-900 to-purple-950',
      btn: 'bg-violet-400 hover:bg-violet-300',
      accent: '#a78bfa', icon: '🎊',
      hero: 'Seu Evento Inesquecível Começa Aqui',
      subtitle: 'Conte-nos sobre o seu sonho e nossa equipe criará uma experiência única para você!',
    }
  },
  advocacia: {
    label: 'Advocacia / Escritório Jurídico', emoji: '⚖️',
    fields: [
      { key: 'area_juridica', label: 'Área do Direito', type: 'select', options: ['Civil', 'Trabalhista', 'Família', 'Previdenciário', 'Tributário', 'Penal', 'Outros'] },
      { key: 'numero_processo', label: 'Número do Processo (se houver)', type: 'text', placeholder: 'Ex: 5001234-xx' },
      { key: 'parte_contraria', label: 'Parte Contrária (se houver)', type: 'text', placeholder: 'Ex: Banco XYZ' },
    ],
    tema: {
      bg: 'from-slate-950 via-blue-950 to-slate-950',
      btn: 'bg-blue-500 hover:bg-blue-400',
      accent: '#93c5fd', icon: '⚖️',
      hero: 'Seus Direitos em Boas Mãos',
      subtitle: 'Descreva brevemente sua situação e um advogado especialista entrará em contato!',
    }
  },
  seguros: {
    label: 'Seguros / Financiamentos / Consórcio', emoji: '🛡️',
    fields: [
      { key: 'tipo_produto', label: 'Produto de Interesse', type: 'select', options: ['Seguro Auto', 'Seguro de Vida', 'Seguro Residencial', 'Consórcio Imobiliário', 'Consórcio Veículos', 'Financiamento Auto', 'Outros'] },
      { key: 'valor_credito', label: 'Valor do Crédito / Apólice (R$)', type: 'number', placeholder: 'Ex: 150000' },
      { key: 'seguradora_parceira', label: 'Seguradora/Administradora de Preferência', type: 'text', placeholder: 'Ex: Porto Seguro (opcional)' },
    ],
    tema: {
      bg: 'from-green-950 via-teal-950 to-green-950',
      btn: 'bg-teal-400 hover:bg-teal-300',
      accent: '#2dd4bf', icon: '🛡️',
      hero: 'Proteção que Você Pode Confiar',
      subtitle: 'Nosso especialista preparará a melhor proposta para proteger o que é mais importante para você!',
    }
  },
  moveis: {
    label: 'Móveis Planejados / Construção / Reformas', emoji: '🪚',
    fields: [
      { key: 'ambientes', label: 'Ambientes a Planejar / Reformar', type: 'text', placeholder: 'Ex: Cozinha, Closet, Banheiro...' },
      { key: 'planta_disponivel', label: 'Possui Planta do Ambiente?', type: 'select', options: ['Sim', 'Não', 'Em Desenvolvimento'] },
      { key: 'prazo_desejado', label: 'Prazo Desejado para Início', type: 'text', placeholder: 'Ex: 30-45 dias' },
    ],
    tema: {
      bg: 'from-orange-950 via-amber-900 to-orange-950',
      btn: 'bg-amber-400 hover:bg-amber-300',
      accent: '#fbbf24', icon: '🛋️',
      hero: 'Transforme Seu Espaço',
      subtitle: 'Conte-nos sobre o projeto dos seus sonhos e nosso time vai criar um ambiente incrível para você!',
    }
  },
};

// ─── Máscara de Telefone ──────────────────────────────────────────────────────
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function CaptacaoPage({ vendedorId }) {
  const [vendedor, setVendedor] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [nicho, setNicho] = useState('geral');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nichoFields, setNichoFields] = useState({});
  const [formError, setFormError] = useState('');

  // Carrega dados do vendedor e empresa via user_roles
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: userRole, error: pErr } = await supabase
        .from('user_roles')
        .select('id, email, role, company_id')
        .eq('id', vendedorId)
        .single();

      if (pErr || !userRole) {
        console.error('[CaptacaoPage] Erro ao buscar user_roles:', pErr, 'vendedorId:', vendedorId);
        setNotFound(true); setLoading(false); return;
      }
      setVendedor(userRole);

      if (userRole.company_id) {
        const { data: comp, error: cErr } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userRole.company_id)
          .single();

        console.log('[CaptacaoPage] company result:', comp, cErr);
        if (comp) { setEmpresa(comp); setNicho(comp.nicho || 'geral'); }
      }
      setLoading(false);
    }
    load();

  }, [vendedorId]);

  const config = NICHOS_CONFIG[nicho] || NICHOS_CONFIG.geral;
  const tema = config.tema;

  // Envio do formulário
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!nome.trim()) return setFormError('Por favor, informe seu nome.');
    if (telefone.replace(/\D/g, '').length < 10) return setFormError('Por favor, informe um telefone válido com DDD.');

    setSubmitting(true);
    try {
      const rawPhone = telefone.replace(/\D/g, '');
      const { error } = await supabase.from('leads').insert({
        company_id: empresa?.id || null,
        user_id: vendedorId || null,
        contato: nome.trim(),
        telefone: rawPhone,
        empresa: nome.trim(),
        tipo: 'B2C',
        coluna_id: 'leads',
        origem: 'Landing Page',
        status_amostra: 'Morno',
        dados_nicho: nichoFields,
      });


      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setFormError('Erro ao enviar. Tente novamente em alguns instantes.');
    } finally {
      setSubmitting(false);
    }
  }

  function openWhatsApp() {
    const phone = empresa?.phone ? `55${empresa.phone.replace(/\D/g, '')}` : '';
    const msg = encodeURIComponent(`Olá! Me cadastrei no formulário e gostaria de mais informações. Meu nome é ${nome}.`);
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  // Loading
  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${tema.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não encontrado
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-white text-2xl font-bold mb-2">Link inválido</h1>
          <p className="text-white/50 text-sm">Este link de captação não foi encontrado ou está expirado.</p>
        </div>
      </div>
    );
  }

  // Tela de Sucesso
  if (submitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${tema.bg} flex items-center justify-center p-4`}>
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${tema.accent}25`, border: `2px solid ${tema.accent}60` }}>
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: tema.accent }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white text-3xl font-black mb-3">Recebemos seu contato!</h2>
          <p className="text-white/70 text-base mb-2">Olá, <strong className="text-white">{nome}</strong>! 🎉</p>
          <p className="text-white/60 text-sm mb-8">
            Nossa equipe da <strong className="text-white">{empresa?.name || 'empresa'}</strong> entrará em contato em breve.
            Para agilizar, você também pode nos chamar agora pelo WhatsApp!
          </p>
          {empresa?.phone && (
            <button onClick={openWhatsApp}
              className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-green-900/40 text-base active:scale-95">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.126 1.533 5.858L0 24l6.335-1.51A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.031-1.388l-.36-.214-3.732.89.938-3.63-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
              </svg>
              Falar pelo WhatsApp Agora
            </button>
          )}
          <p className="text-white/30 text-xs mt-6">Powered by Nexale CRM</p>
        </div>
      </div>
    );
  }

  // Formulário Principal
  return (
    <div className={`min-h-screen bg-gradient-to-br ${tema.bg} relative overflow-hidden`}>
      {/* Orbs de fundo decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: tema.accent }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: tema.accent }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg">

          {/* Header da empresa */}
          <div className="text-center mb-8">
            {empresa?.logo_url ? (
              <img src={empresa.logo_url} alt={empresa.name}
                className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4 shadow-xl border border-white/20" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl border border-white/20"
                style={{ background: `${tema.accent}20` }}>
                {tema.icon}
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-3"
              style={{ background: `${tema.accent}15`, color: tema.accent, borderColor: `${tema.accent}40` }}>
              {config.emoji} {config.label}
            </div>
            <h1 className="text-white text-3xl font-black leading-tight mb-2">{tema.hero}</h1>
            {empresa?.name && (
              <p className="text-white/50 text-sm font-medium">
                {empresa.name}{vendedor?.name && ` · ${vendedor.name}`}
              </p>
            )}
            <p className="text-white/60 text-sm mt-3 leading-relaxed">{tema.subtitle}</p>
          </div>

          {/* Card do formulário */}
          <form onSubmit={handleSubmit}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 md:p-8 shadow-2xl space-y-4">

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-white/70 text-xs font-semibold uppercase tracking-wider">Nome Completo *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                required />
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <label className="text-white/70 text-xs font-semibold uppercase tracking-wider">WhatsApp / Telefone *</label>
              <input type="tel" value={telefone} onChange={e => setTelefone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                required />
            </div>

            {/* Campos do nicho */}
            {config.fields.length > 0 && (
              <div className="border-t border-white/10 pt-4 space-y-4">
                <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Informações Específicas</p>
                {config.fields.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-white/70 text-xs font-semibold uppercase tracking-wider">{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={nichoFields[field.key] || ''}
                        onChange={e => setNichoFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none">
                        <option value="" className="text-slate-900">Selecione...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt} className="text-slate-900">{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input type={field.type} value={nichoFields[field.key] || ''}
                        onChange={e => setNichoFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Erro */}
            {formError && (
              <div className="bg-red-500/20 border border-red-400/40 rounded-xl p-3">
                <p className="text-red-300 text-sm text-center">{formError}</p>
              </div>
            )}

            {/* Botão submit */}
            <button type="submit" disabled={submitting}
              className={`w-full ${tema.btn} text-slate-900 font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-base mt-2`}>
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Enviando...
                </span>
              ) : '🚀 Quero ser Atendido!'}
            </button>

            <p className="text-white/30 text-xs text-center pt-1">Seus dados estão seguros. Não fazemos spam. 🔒</p>
          </form>

          <p className="text-white/20 text-xs text-center mt-6">
            Powered by <span className="text-white/40 font-semibold">Nexale CRM</span>
          </p>
        </div>
      </div>
    </div>
  );
}
