import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const SA_INITIAL_COLUMNS = [
  { id: 'leads',      title: 'Prospects' },
  { id: 'contato',   title: 'Primeiro Contato' },
  { id: 'amostra',   title: 'Demonstração' },
  { id: 'proposta',  title: 'Proposta Enviada' },
  { id: 'negociacao',title: 'Negociação' },
  { id: 'ganhou',    title: 'Assinante Ativo' },
  { id: 'perdido',   title: 'Churn' },
];

const TEMP_COLORS = {
  'Quente':  'bg-red-100 text-red-700',
  'Morno':   'bg-yellow-100 text-yellow-700',
  'Frio':    'bg-blue-100 text-blue-700',
};

const STATUS_COLORS = {
  'active':   'bg-green-100 text-green-700',
  'trial':    'bg-indigo-100 text-indigo-700',
  'inactive': 'bg-slate-100 text-slate-500',
  'canceled': 'bg-red-100 text-red-600',
};

export default function SuperAdminKanban({ session }) {
  const EVOLUTION_INSTANCE = 'superadmin';

  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('sa_kanban_titles');
      if (saved) {
        const titles = JSON.parse(saved);
        return SA_INITIAL_COLUMNS.map(c => ({ ...c, title: titles[c.id] || c.title, cards: [] }));
      }
    } catch (_) {}
    return SA_INITIAL_COLUMNS.map(c => ({ ...c, cards: [] }));
  });

  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null); // { cardId, fromColId }
  const [dragOverCol, setDragOverCol] = useState(null);
  const [editingColId, setEditingColId] = useState(null);
  const [editingColTitle, setEditingColTitle] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardForm, setCardForm] = useState({});
  const [sendingWa, setSendingWa] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [waConnected, setWaConnected] = useState(false);

  useEffect(() => {
    fetchCompanies();
    checkWa();

    const handleRefresh = () => fetchCompanies();
    window.addEventListener('sa-companies-changed', handleRefresh);
    return () => window.removeEventListener('sa-companies-changed', handleRefresh);
  }, []);

  const checkWa = async () => {
    try {
      const res = await fetch(`/evolution/instance/connectionState/${EVOLUTION_INSTANCE}`, {
        headers: { apikey: '123' }
      });
      const data = await res.json();
      setWaConnected(data?.instance?.state === 'open');
    } catch (_) { setWaConnected(false); }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, phone, plan, subscription_status, trial_ends_at, sa_stage, sa_temperatura, sa_valor, sa_obs, created_at, user_roles(email, role)')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    const cols = columns.map(c => ({ ...c, cards: [] }));
    (data || []).forEach(company => {
      const stage = company.sa_stage || 'leads';
      const col = cols.find(c => c.id === stage) || cols[0];
      const adminEmail = (company.user_roles || []).find(r => r.role === 'admin')?.email || '—';
      col.cards.push({
        id: company.id,
        empresa: company.name,
        contato: adminEmail,
        telefone: company.phone || '',
        plano: company.plan || '—',
        status: company.subscription_status || 'inactive',
        trialEndsAt: company.trial_ends_at,
        temperatura: company.sa_temperatura || 'Frio',
        valor: Number(company.sa_valor) || 0,
        observacao: company.sa_obs || '',
        dataCriacao: new Date(company.created_at).toLocaleDateString('pt-BR'),
      });
    });
    setColumns(cols);
    setLoading(false);
  };

  /* ---- drag & drop ---- */
  const handleDragStart = (cardId, fromColId) => setDragging({ cardId, fromColId });
  const handleDragEnd = () => { setDragging(null); setDragOverCol(null); };

  const handleDrop = async (toColId) => {
    if (!dragging || dragging.fromColId === toColId) { setDragging(null); setDragOverCol(null); return; }

    const fromCol = columns.find(c => c.id === dragging.fromColId);
    const card = fromCol?.cards.find(c => c.id === dragging.cardId);
    if (!card) return;

    // Optimistic UI
    setColumns(prev => prev.map(col => {
      if (col.id === dragging.fromColId) return { ...col, cards: col.cards.filter(c => c.id !== card.id) };
      if (col.id === toColId) return { ...col, cards: [{ ...card }, ...col.cards] };
      return col;
    }));

    setDragging(null); setDragOverCol(null);

    // Persist
    await supabase.from('companies').update({ sa_stage: toColId }).eq('id', card.id);

    // WhatsApp automático ao mover (apenas se conectado)
    if (waConnected && card.telefone) {
      const toCol = columns.find(c => c.id === toColId);
      const msg = `Olá, ${card.empresa}! 👋 Estamos entrando em contato referente à sua assinatura Nexale CRM. Como podemos te ajudar?`;
      try {
        await sendWa(card.telefone, msg);
      } catch (e) { console.warn('Falha ao enviar WA ao mover card:', e.message); }
    }
  };

  /* ---- WhatsApp ---- */
  const sendWa = async (phone, text) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) clean = '55' + clean;
    const res = await fetch(`/evolution/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: '123' },
      body: JSON.stringify({ number: clean, text }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res;
  };

  const handleSendManual = async () => {
    if (!waMsg.trim() || !selectedCard?.telefone) return;
    setSendingWa(true);
    try {
      await sendWa(selectedCard.telefone, waMsg);
      alert('✅ Mensagem enviada!');
      setWaMsg('');
    } catch (e) { alert('Erro: ' + e.message); }
    setSendingWa(false);
  };

  /* ---- card editing ---- */
  const openCard = (card) => { setSelectedCard(card); setCardForm({ ...card }); setWaMsg(''); setShowCardModal(true); };

  const saveCard = async () => {
    const { id } = cardForm;
    await supabase.from('companies').update({
      name: cardForm.empresa,
      phone: cardForm.telefone,
      sa_temperatura: cardForm.temperatura,
      sa_valor: Number(cardForm.valor) || 0,
      sa_obs: cardForm.observacao,
    }).eq('id', id);
    setShowCardModal(false);
    fetchCompanies();
  };

  /* ---- column title editing ---- */
  const saveColTitle = (colId) => {
    if (!editingColTitle.trim()) { setEditingColId(null); return; }
    const updated = columns.map(c => c.id === colId ? { ...c, title: editingColTitle } : c);
    setColumns(updated);
    const titles = {};
    updated.forEach(c => { titles[c.id] = c.title; });
    localStorage.setItem('sa_kanban_titles', JSON.stringify(titles));
    setEditingColId(null);
  };

  /* ---- total ---- */
  const totalVal = columns.reduce((acc, col) => acc + col.cards.reduce((a, c) => a + (c.valor || 0), 0), 0);

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Carregando assinantes...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            👑 CRM de Assinantes Nexale
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Gerencie o relacionamento com seus assinantes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${waConnected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${waConnected ? 'bg-green-500' : 'bg-slate-400'}`} />
            {waConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </div>
          <div className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1.5 rounded-full">
            MRR: R$ {totalVal.toLocaleString('pt-BR')}
          </div>
          <button onClick={fetchCompanies} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Atualizar">
            🔄
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div
            key={col.id}
            className={`flex-shrink-0 w-72 bg-slate-50 rounded-xl border-2 transition-all ${dragOverCol === col.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100'}`}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
            onDrop={() => handleDrop(col.id)}
            onDragLeave={() => setDragOverCol(null)}
          >
            {/* Column header */}
            <div className="p-3 flex items-center justify-between border-b border-slate-200">
              {editingColId === col.id ? (
                <input
                  autoFocus
                  value={editingColTitle}
                  onChange={e => setEditingColTitle(e.target.value)}
                  onBlur={() => saveColTitle(col.id)}
                  onKeyDown={e => e.key === 'Enter' && saveColTitle(col.id)}
                  className="text-sm font-bold text-slate-700 bg-white border border-indigo-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              ) : (
                <button
                  onClick={() => { setEditingColId(col.id); setEditingColTitle(col.title); }}
                  className="text-sm font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1.5 text-left"
                >
                  {col.title}
                  <span className="text-[10px] opacity-0 group-hover:opacity-100">✏️</span>
                </button>
              )}
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                {col.cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-2 flex flex-col gap-2 min-h-[120px]">
              {col.cards.map(card => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id, col.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => openCard(card)}
                  className={`bg-white rounded-xl border border-slate-100 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-200 transition-all ${dragging?.cardId === card.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-black text-slate-800 leading-tight">{card.empresa}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${TEMP_COLORS[card.temperatura] || 'bg-slate-100 text-slate-500'}`}>
                      {card.temperatura}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1 truncate">📧 {card.contato}</p>
                  {card.telefone && <p className="text-xs text-slate-500 mb-2">📱 {card.telefone}</p>}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[card.status] || 'bg-slate-100 text-slate-500'}`}>
                      {card.status}
                    </span>
                    {card.plano && card.plano !== '—' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {card.plano}
                      </span>
                    )}
                    {card.valor > 0 && (
                      <span className="text-[10px] font-bold text-slate-600">
                        R$ {card.valor.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de card */}
      {showCardModal && selectedCard && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowCardModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">{selectedCard.empresa}</h3>
              <button onClick={() => setShowCardModal(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Empresa</label>
                  <input value={cardForm.empresa || ''} onChange={e => setCardForm(p => ({ ...p, empresa: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                  <input value={cardForm.telefone || ''} onChange={e => setCardForm(p => ({ ...p, telefone: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Temperatura</label>
                  <select value={cardForm.temperatura || 'Frio'} onChange={e => setCardForm(p => ({ ...p, temperatura: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option>Quente</option><option>Morno</option><option>Frio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Valor MRR (R$)</label>
                  <input type="number" value={cardForm.valor || ''} onChange={e => setCardForm(p => ({ ...p, valor: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Observações</label>
                <textarea value={cardForm.observacao || ''} onChange={e => setCardForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>

              {/* Info só-leitura */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex flex-wrap gap-3">
                <span><b>Status:</b> {selectedCard.status}</span>
                <span><b>Plano:</b> {selectedCard.plano}</span>
                <span><b>Admin:</b> {selectedCard.contato}</span>
                <span><b>Cadastro:</b> {selectedCard.dataCriacao}</span>
              </div>

              {/* Enviar WhatsApp */}
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  💬 Enviar WhatsApp
                  {!waConnected && <span className="text-red-500 font-normal">(desconectado — conecte na aba WhatsApp)</span>}
                </label>
                <textarea
                  value={waMsg}
                  onChange={e => setWaMsg(e.target.value)}
                  placeholder={`Mensagem para ${selectedCard.empresa}...`}
                  rows={3}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  disabled={!waConnected}
                />
                <button
                  onClick={handleSendManual}
                  disabled={!waConnected || sendingWa || !waMsg.trim()}
                  className="mt-2 w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2 rounded-xl transition-colors text-sm"
                >
                  {sendingWa ? 'Enviando...' : '📤 Enviar Mensagem'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCardModal(false)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                  Cancelar
                </button>
                <button onClick={saveCard} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl transition-colors text-sm">
                  💾 Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
