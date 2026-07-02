import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { supabase } from './supabaseClient'

function Root() {
  const [session, setSession] = useState(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (_event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      }
    })

    if (window.location.hash.includes('type=recovery')) {
      setRecoveryMode(true)
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      alert(error.message)
    } else {
      alert('Senha atualizada com sucesso!')
      setRecoveryMode(false)
      window.location.hash = ''
    }
  }

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleUpdatePassword} className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img src="/favicon.svg" alt="Nexale Logo" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-800">Criar Nova Senha</h2>
          <p className="text-sm text-slate-500 mb-6">Digite sua nova senha abaixo para acessar sua conta.</p>
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            placeholder="Sua nova senha"
            required
            minLength={6}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    )
  }

  if (!session) {
    return <Auth onLogin={setSession} />
  }

  return <App session={session} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
