'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; font-family: 'Crimson Text', serif; }
        .login-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #080808; position: relative; overflow: hidden; }
        .bg-pattern { position: absolute; inset: 0; background-image: repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(201,168,76,0.03) 40px, rgba(201,168,76,0.03) 41px); }
        .glow-orb { position: absolute; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .card { position: relative; width: 420px; background: rgba(20, 18, 14, 0.95); border: 1px solid rgba(201,168,76,0.25); border-radius: 2px; padding: 52px 48px; box-shadow: 0 0 0 1px rgba(201,168,76,0.05), 0 40px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,168,76,0.1); animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .corner { position: absolute; width: 16px; height: 16px; border-color: rgba(201,168,76,0.5); border-style: solid; }
        .corner-tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
        .corner-tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
        .corner-bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
        .corner-br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
        .logo-area { text-align: center; margin-bottom: 44px; }
        .logo-icon { font-size: 44px; display: block; margin-bottom: 14px; filter: drop-shadow(0 0 20px rgba(201,168,76,0.4)); animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .logo-title { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; color: #C9A84C; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }
        .logo-sub { font-family: 'Crimson Text', serif; font-style: italic; font-size: 15px; color: rgba(201,168,76,0.5); letter-spacing: 1px; }
        .divider { width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent); margin: 16px auto 0; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.7); margin-bottom: 8px; }
        .form-input { width: 100%; padding: 13px 16px; background: rgba(0,0,0,0.4); border: 1px solid rgba(201,168,76,0.15); border-radius: 1px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 16px; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: rgba(201,168,76,0.5); box-shadow: 0 0 0 3px rgba(201,168,76,0.05); }
        .form-input::placeholder { color: rgba(232,224,208,0.2); }
        .error-msg { background: rgba(192,57,43,0.1); border: 1px solid rgba(192,57,43,0.3); padding: 10px 14px; color: #E74C3C; font-size: 14px; margin-bottom: 20px; text-align: center; }
        .btn-login { width: 100%; padding: 15px; background: linear-gradient(135deg, #C9A84C 0%, #A8873C 100%); border: none; border-radius: 1px; color: #080808; font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .btn-login:hover:not(:disabled) { background: linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%); box-shadow: 0 8px 24px rgba(201,168,76,0.3); transform: translateY(-1px); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
        .roles-info { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(201,168,76,0.1); }
        .roles-title { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.3); text-align: center; margin-bottom: 12px; }
        .roles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .role-badge { text-align: center; padding: 8px 4px; border: 1px solid rgba(201,168,76,0.1); border-radius: 2px; background: rgba(201,168,76,0.03); }
        .role-badge .icon { font-size: 16px; display: block; margin-bottom: 4px; }
        .role-badge .name { font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 1px; text-transform: uppercase; color: rgba(201,168,76,0.5); }
        .role-badge .desc { font-size: 10px; color: rgba(232,224,208,0.3); margin-top: 2px; font-style: italic; }
      `}</style>

      <div className="login-root">
        <div className="bg-pattern" />
        <div className="glow-orb" />
        <div className="card">
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />
          <div className="logo-area">
            <span className="logo-icon">🎭</span>
            <div className="logo-title">SisDisfraz</div>
            <div className="logo-sub">Sistema de Alquiler · Perú</div>
            <div className="divider" />
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input type="email" className="form-input" placeholder="usuario@tienda.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar al Sistema'}
            </button>
          </form>
          <div className="roles-info">
            <div className="roles-title">Niveles de acceso</div>
            <div className="roles-grid">
              <div className="role-badge"><span className="icon">🔑</span><div className="name">Admin</div><div className="desc">Acceso total</div></div>
              <div className="role-badge"><span className="icon">🛍️</span><div className="name">Operador</div><div className="desc">Alquileres</div></div>
              <div className="role-badge"><span className="icon">👁️</span><div className="name">Lectura</div><div className="desc">Solo ver</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
