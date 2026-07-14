import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  
  // Novos estados para Multi-Tenant
  const [signupType, setSignupType] = useState('manager'); // 'manager' ou 'seller'
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Pequenos Negócios');

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      alert('Link de recuperação enviado para seu e-mail! Verifique sua caixa de entrada.');
      setIsForgot(false);
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.session);
      } else {
        // Lógica de Cadastro com Metadados
        const metadata = {};
        if (signupType === 'manager') {
          if (!companyName) throw new Error("O nome da empresa é obrigatório para gerentes.");
          if (!phone) throw new Error("O número de WhatsApp é obrigatório.");
          metadata.company_name = companyName;
          metadata.phone = phone;
          metadata.plan = selectedPlan;
        } else {
          if (!inviteCode) throw new Error("O código de convite é obrigatório para vendedores.");
          metadata.invite_code = inviteCode;
        }

        const { error, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: metadata
          }
        });
        
        if (error) throw error;

        // Dispara boas-vindas automáticas via WhatsApp para novos gerentes (trial)
        if (signupType === 'manager' && phone) {
          // Busca o companyId recém-criado para passar ao worker
          // Usa o e-mail como identificador — o worker buscará no banco
          fetch('/enviar-boas-vindas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone:     phone.replace(/\D/g, ''),
              nome:      companyName,
              companyId: 'superadmin', // instância principal do Evolution API
              tipo:      'trial'
            })
          }).catch(() => {}); // silencioso — não bloqueia o cadastro
        }

        alert('Cadastro realizado com sucesso! Você já pode acessar o sistema.');
        if (data.session) onLogin(data.session);
      }
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img src="/logo-nexale.jpg" alt="Nexale Logo" className="w-full h-full object-cover rounded-2xl shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nexale CRM</h1>

          <p className="text-sm text-slate-500 mt-2">
            {isForgot ? 'Recupere o acesso à sua conta' : (isLogin ? 'Faça login para acessar sua empresa' : 'Crie sua conta para começar')}
          </p>
        </div>

        <form onSubmit={isForgot ? handleForgot : handleAuth} className="space-y-4">
          
          {!isLogin && !isForgot && (
            <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setSignupType('manager')}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors ${signupType === 'manager' ? 'bg-white shadow-sm shadow-indigo-900/5 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sou Gerente
              </button>
              <button
                type="button"
                onClick={() => setSignupType('seller')}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors ${signupType === 'seller' ? 'bg-white shadow-sm shadow-indigo-900/5 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sou Vendedor
              </button>
            </div>
          )}

          {!isLogin && signupType === 'manager' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome da Sua Empresa</label>
              <input 
                type="text" 
                required={signupType === 'manager'}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
                placeholder="Ex: ACME Corp"
              />
              <p className="text-[10px] text-slate-400 mt-1">Sua equipe será vinculada a esta empresa.</p>
            </div>
          )}

          {!isLogin && signupType === 'manager' && (
            <div className="animate-fade-in mt-4">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp (Celular)</label>
              <input 
                type="text" 
                required={signupType === 'manager'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                placeholder="(11) 99999-9999"
              />
            </div>
          )}

          {!isLogin && signupType === 'manager' && (
            <div className="animate-fade-in mt-4">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Escolha seu Plano (14 dias Grátis)</label>
              <div className="space-y-2">
                {[
                  { name: 'Vendedor Solo', price: 'R$ 49/mês', desc: '1 Usuário' },
                  { name: 'Pequenos Negócios', price: 'R$ 79/mês', desc: 'Até 3 Usuários' },
                  { name: 'Equipe Pro', price: 'R$ 99/mês', desc: 'Até 10 Usuários' }
                ].map((plan) => (
                  <label key={plan.name} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${selectedPlan === plan.name ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="plan" 
                        value={plan.name} 
                        checked={selectedPlan === plan.name}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{plan.name}</p>
                        <p className="text-xs text-slate-500">{plan.desc}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-700">{plan.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isLogin && !isForgot && signupType === 'seller' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Código de Convite da Equipe</label>
              <input 
                type="text" 
                required={signupType === 'seller' && !isLogin && !isForgot}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-purple-50"
                placeholder="Ex: EMP-A1B2C3"
              />
              <p className="text-[10px] text-slate-400 mt-1">Peça este código ao seu gerente.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="seu@email.com"
            />
          </div>
          {!isForgot && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Senha</label>
                {isLogin && (
                  <button type="button" onClick={() => setIsForgot(true)} className="text-[10px] text-indigo-600 font-bold hover:underline">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.52 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Aguarde...' : (isForgot ? 'Link de recuperação' : (isLogin ? 'Entrar no Sistema' : 'Criar Minha Conta'))}
          </button>
        </form>

        <div className="mt-6 text-center">
          {isForgot ? (
            <button 
              onClick={() => setIsForgot(false)} 
              className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Voltar para o login
            </button>
          ) : (
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              {isLogin ? 'Nova empresa ou Vendedor? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
