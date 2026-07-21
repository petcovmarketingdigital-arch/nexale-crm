import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function SuperAdminPanel() {
  const [activeSubTab, setActiveSubTab] = useState('subscribers'); // 'subscribers' | 'tutorials'
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDates, setEditDates] = useState({});

  // States para os Tutoriais
  const [tutorials, setTutorials] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newCategory, setNewCategory] = useState('WhatsApp');
  const [newOrder, setNewOrder] = useState(0);

  useEffect(() => {
    if (activeSubTab === 'subscribers') {
      fetchCompanies();
    } else {
      fetchTutorials();
    }
  }, [activeSubTab]);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*, user_roles(email, role)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error(error);
      alert('Erro ao carregar empresas. Verifique permissões RLS.');
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  const fetchTutorials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert('Erro ao carregar tutoriais.');
    } else {
      setTutorials(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!window.confirm(`Deseja alterar o status para ${newStatus}?`)) return;
    const { error } = await supabase.from('companies').update({ subscription_status: newStatus }).eq('id', id);
    if (error) alert(error.message);
    else fetchCompanies();
  };

  const handleSetTrialEnd = async (id) => {
    const newDateStr = editDates[id];
    if (!newDateStr) return;
    if (!window.confirm(`Deseja definir o prazo para ${new Date(newDateStr + 'T12:00:00Z').toLocaleDateString('pt-BR')}?`)) return;
    const { error } = await supabase.from('companies').update({ trial_ends_at: newDateStr + 'T23:59:59Z' }).eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      setEditDates(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchCompanies();
    }
  };

  const handleDeleteCompany = async (id, name) => {
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir a empresa "${name}"? Essa ação apagará a empresa e todos os dados vinculados a ela.`)) return;
    const { error } = await supabase.rpc('delete_company_cascade', { target_company_id: id });
    if (error) {
      alert('Erro ao excluir empresa no banco de dados: ' + error.message);
    } else {
      fetchCompanies();
    }
  };

  // CRUD de Tutoriais
  const handleAddTutorial = async (e) => {
    e.preventDefault();
    if (!newTitle || !newVideoUrl) {
      alert('Preencha pelo menos o Título e o Link do Vídeo.');
      return;
    }

    const { error } = await supabase.from('tutorials').insert({
      title: newTitle,
      description: newDescription,
      video_url: newVideoUrl,
      category: newCategory,
      display_order: parseInt(newOrder) || 0
    });

    if (error) {
      alert('Erro ao salvar tutorial: ' + error.message);
    } else {
      setNewTitle('');
      setNewDescription('');
      setNewVideoUrl('');
      setNewCategory('WhatsApp');
      setNewOrder(0);
      fetchTutorials();
    }
  };

  const handleDeleteTutorial = async (id, title) => {
    if (!window.confirm(`Deseja realmente excluir o tutorial "${title}"?`)) return;
    const { error } = await supabase.from('tutorials').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir tutorial: ' + error.message);
    } else {
      fetchTutorials();
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Menu de Sub-abas */}
        <div className="flex gap-4 mb-6 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveSubTab('subscribers')}
            className={`pb-3 text-sm font-bold transition-all px-2 border-b-2 ${
              activeSubTab === 'subscribers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            👑 Gestão de Assinantes
          </button>
          <button
            onClick={() => setActiveSubTab('tutorials')}
            className={`pb-3 text-sm font-bold transition-all px-2 border-b-2 ${
              activeSubTab === 'tutorials'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📺 Gerenciar Tutoriais
          </button>
        </div>

        {loading && <div className="p-8 text-center text-slate-500 font-medium">Carregando dados...</div>}

        {!loading && activeSubTab === 'subscribers' && (
          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  👑 Gestão de Assinantes
                </h2>
                <p className="text-xs text-slate-500 mt-1">Gerencie acessos, planos e assinaturas de todas as empresas.</p>
              </div>
              <button onClick={fetchCompanies} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa / Admin</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Contato</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Opções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{c.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 mt-0.5">CÓD: {c.invite_code}</span>
                          {c.user_roles && c.user_roles.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                              {c.user_roles.map((ur, idx) => (
                                <span key={idx} className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                  {ur.email} {ur.role === 'admin' ? <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ml-1">Admin</span> : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {c.phone ? (
                          <a href={`https://wa.me/55${c.phone.replace(/\D/g, '')}?text=Ol%C3%A1`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                            WhatsApp
                          </a>
                        ) : <span className="text-slate-300 text-xs italic font-medium">Não informado</span>}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <select 
                          value={c.subscription_status || 'trial'} 
                          onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 cursor-pointer focus:outline-none transition-colors appearance-none text-center ${
                            c.subscription_status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                            c.subscription_status === 'blocked' ? 'bg-red-50 border-red-200 text-red-700' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          <option value="trial">Em Teste (Trial)</option>
                          <option value="active">🟢 Acesso Ativo</option>
                          <option value="blocked">🔴 Bloqueado</option>
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-fit">
                          <input 
                            type="date" 
                            value={editDates[c.id] !== undefined ? editDates[c.id] : (c.trial_ends_at ? c.trial_ends_at.split('T')[0] : '')} 
                            onChange={(e) => setEditDates({ ...editDates, [c.id]: e.target.value })}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer p-1"
                          />
                          {editDates[c.id] !== undefined && editDates[c.id] !== (c.trial_ends_at ? c.trial_ends_at.split('T')[0] : '') && (
                            <button onClick={() => handleSetTrialEnd(c.id)} className="p-1.5 bg-emerald-100 border border-emerald-200 rounded text-emerald-700 hover:bg-emerald-200 shadow-sm ml-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => handleDeleteCompany(c.id, c.name)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeSubTab === 'tutorials' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Form de Adicionar */}
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 lg:col-span-1">
              <h3 className="text-lg font-black text-slate-900 mb-4">📺 Novo Vídeo</h3>
              <form onSubmit={handleAddTutorial} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título do Vídeo</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Como conectar seu WhatsApp"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição Curta</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Breve resumo do que é ensinado neste vídeo..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors h-20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Link do Vídeo (YouTube ou Loom)</label>
                  <input
                    type="url"
                    required
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch... ou https://www.loom.com/share..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoria</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Primeiros Passos">Primeiros Passos</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Inteligência Artificial">IA (Sofia)</option>
                      <option value="Prospecção B2B">Prospecção B2B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ordem de Exibição</label>
                    <input
                      type="number"
                      value={newOrder}
                      onChange={(e) => setNewOrder(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-100"
                >
                  🚀 Salvar Tutorial
                </button>
              </form>
            </div>

            {/* Lista dos Tutoriais */}
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 lg:col-span-2">
              <h3 className="text-lg font-black text-slate-900 mb-4">📺 Vídeos Disponíveis ({tutorials.length})</h3>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px]">
                {tutorials.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 border border-slate-200/60 rounded-xl hover:border-slate-300 transition-all gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800">{t.title}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-slate-200/50">
                          {t.category || 'geral'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 mt-1 truncate max-w-sm md:max-w-md">{t.video_url}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTutorial(t.id, t.title)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Excluir Tutorial"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                {tutorials.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-sm font-medium">
                    Nenhum vídeo cadastrado no momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

