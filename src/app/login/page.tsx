'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1C1C1C', padding: 40, borderRadius: 12, width: 360, border: '1px solid #2A2A2A' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40 }}>🎭</div>
          <h1 style={{ color: '#C9A84C', fontSize: 22, margin: '8px 0 4px' }}>SisDisfraz Perú</h1>
          <p style={{ color: '#8A8070', fontSize: 13 }}>Sistema de Alquiler</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#E8E0D0', fontSize: 13, display: 'block', marginBottom: 6 }}>Correo</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required style={{ width: '100%', padding: '10px 12px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 6, color: '#E8E0D0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#E8E0D0', fontSize: 13, display: 'block', marginBottom: 6 }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required style={{ width: '100%', padding: '10px 12px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 6, color: '#E8E0D0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#8A7040' : '#C9A84C', color: '#0D0D0D', fontWeight: 'bold', fontSize: 15, border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
