import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function SuperAdminPanel() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDates, setEditDates] = useState({});

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    // Para contornar o RLS do lado do cliente, o superadmin precisa de uma RPC ou policy que o permita ler tudo.
    // Presumindo que RLS permite superadmin ler tudo:
    const { data, error } = await supabase.from('companies').select('*, user_roles(email, role)').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      alert('Erro ao carregar empresas. Verifique permissões RLS.');
    } else {
      setCompanies(data || []);
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
    
    // Chama a função RPC no Supabase que apaga tudo ignorando o RLS e FK em cascata
    const { error } = await supabase.rpc('delete_company_cascade', { target_company_id: id });
    
    if (error) {
      alert('Erro ao excluir empresa no banco de dados: ' + error.message);
    } else {
      fetchCompanies();
    }
  };


  if (loading) return <div className="p-8 text-center">Carregando painel master...</div>;

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8">
      <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-6xl mx-auto animate-fade-in mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              👑 Gestão de Assinantes
            </h2>
            <p className="text-sm text-slate-500 mt-1">Gerencie acessos, planos e assinaturas de todas as empresas cadastradas.</p>
          </div>
          <button onClick={fetchCompanies} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm" title="Atualizar dados">
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
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status do Acesso</th>
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
                            <span key={idx} className="text-xs text-slate-500 flex items-center gap-1.5" title={`Função: ${ur.role}`}>
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
                      <a href={`https://wa.me/55${c.phone.replace(/\D/g, '')}?text=Ol%C3%A1%2C%20vi%20que%20voc%C3%AA%20criou%20uma%20conta%20no%20Nexale%20CRM!`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        WhatsApp
                      </a>
                    ) : <span className="text-slate-300 text-xs italic font-medium">Não informado</span>}
                  </td>
                  
                  <td className="py-4 px-6 text-center">
                    <select 
                      value={c.subscription_status || 'trial'} 
                      onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 cursor-pointer focus:outline-none transition-colors appearance-none text-center ${
                        c.subscription_status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300' : 
                        c.subscription_status === 'blocked' ? 'bg-red-50 border-red-200 text-red-700 hover:border-red-300' :
                        'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-300'
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
                        title="Alterar data exata"
                      />
                      {editDates[c.id] !== undefined && editDates[c.id] !== (c.trial_ends_at ? c.trial_ends_at.split('T')[0] : '') && (
                        <button onClick={() => handleSetTrialEnd(c.id)} className="p-1.5 bg-emerald-100 border border-emerald-200 rounded text-emerald-700 hover:bg-emerald-200 transition-colors shadow-sm ml-2" title="Salvar nova data">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => handleDeleteCompany(c.id, c.name)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Excluir Cliente Permanentemente">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3">📭</span>
                      <p className="text-slate-500 text-sm font-medium">Nenhuma empresa encontrada no sistema.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
