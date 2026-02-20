'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Rol = 'administrador' | 'operador' | 'solo_lectura'

interface NavItem {
  href: string
  icon: string
  label: string
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: '⚡', label: 'Alertas', roles: ['administrador', 'operador', 'solo_lectura'] },
  { href: '/dashboard/alquileres', icon: '🎭', label: 'Alquileres', roles: ['administrador', 'operador', 'solo_lectura'] },
  { href: '/dashboard/devolucion', icon: '↩️', label: 'Devoluciones', roles: ['administrador', 'operador'] },
  { href: '/dashboard/lavanderia', icon: '🧺', label: 'Lavandería', roles: ['administrador', 'operador'] },
  { href: '/dashboard/catalogo', icon: '📦', label: 'Catálogo', roles: ['administrador', 'operador', 'solo_lectura'] },
  { href: '/dashboard/clientes', icon: '👥', label: 'Clientes', roles: ['administrador', 'operador'] },
  { href: '/dashboard/proveedores', icon: '🔍', label: 'Proveedores', roles: ['administrador'] },
  { href: '/dashboard/reportes', icon: '📊', label: 'Reportes', roles: ['administrador'] },
  { href: '/dashboard/usuarios', icon: '🔑', label: 'Usuarios', roles: ['administrador'] },
]

const ROL_LABELS: Record<Rol, string> = {
  administrador: 'Admin',
  operador: 'Operador',
  solo_lectura: 'Lectura',
}

const ROL_COLORS: Record<Rol, string> = {
  administrador: '#C9A84C',
  operador: '#2980B9',
  solo_lectura: '#27AE60',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<{ nombre: string; rol: Rol } | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }
      
      setUser(currentUser)
      
      const { data } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', currentUser.id)
        .single()

      if (data) {
        setPerfil(data as { nombre: string; rol: Rol })
      } else {
        setPerfil({ nombre: currentUser.email?.split('@')[0] || 'Usuario', rol: 'administrador' })
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 2s linear infinite', display: 'inline-block' }}>🎭</div>
          <p style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', letterSpacing: 2 }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const rol = perfil?.rol ?? 'administrador'
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(rol))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; }
        
        .mobile-header { display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px; background: #0D0B08; border-bottom: 1px solid rgba(201,168,76,0.12); z-index: 200; padding: 0 16px; align-items: center; justify-content: space-between; }
        .mobile-menu-btn { background: none; border: none; color: #C9A84C; font-size: 24px; cursor: pointer; padding: 8px; }
        
        .layout { display: flex; min-height: 100vh; }
        
        .sidebar { 
          width: 240px; background: #0D0B08; border-right: 1px solid rgba(201,168,76,0.12); 
          display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; 
          transition: transform 0.3s ease;
        }
        .sidebar.collapsed { width: 72px; }
        
        .sidebar-header { padding: 24px 20px; border-bottom: 1px solid rgba(201,168,76,0.08); display: flex; align-items: center; gap: 12px; }
        .sidebar-logo { font-size: 28px; }
        .sidebar-brand { overflow: hidden; white-space: nowrap; }
        .brand-name { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 700; color: #C9A84C; letter-spacing: 1px; }
        .brand-sub { font-family: 'Crimson Text', serif; font-style: italic; font-size: 11px; color: rgba(201,168,76,0.4); }
        
        .nav-section { flex: 1; padding: 16px 0; overflow-y: auto; }
        .nav-label { font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.25); padding: 8px 20px 4px; }
        
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 20px; color: rgba(232,224,208,0.5); text-decoration: none; font-family: 'Crimson Text', serif; font-size: 15px; transition: all 0.15s; position: relative; cursor: pointer; }
        .nav-item:hover { color: #E8E0D0; background: rgba(201,168,76,0.05); }
        .nav-item.active { color: #C9A84C; background: rgba(201,168,76,0.08); }
        .nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: #C9A84C; }
        .nav-icon { font-size: 18px; }
        
        .sidebar-footer { padding: 16px 20px; border-top: 1px solid rgba(201,168,76,0.08); }
        .user-card { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .user-name { font-family: 'Crimson Text', serif; font-size: 14px; color: #E8E0D0; }
        .user-rol { font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 1px; text-transform: uppercase; color: ${ROL_COLORS[rol]}; }
        
        .btn-logout { width: 100%; padding: 8px 12px; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); border-radius: 2px; color: rgba(192,57,43,0.7); font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; }
        
        .btn-collapse { display: none; }
        
        .main { margin-left: 240px; flex: 1; min-height: 100vh; background: #0A0A0A; }
        .topbar { height: 56px; background: rgba(13,11,8,0.8); border-bottom: 1px solid rgba(201,168,76,0.08); display: flex; align-items: center; padding: 0 28px; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 50; }
        .page-content { padding: 28px; }
        .rol-badge { padding: 4px 10px; border-radius: 2px; font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; background: ${ROL_COLORS[rol]}18; border: 1px solid ${ROL_COLORS[rol]}40; color: ${ROL_COLORS[rol]}; margin-left: auto; }

        @media (max-width: 768px) {
          .mobile-header { display: flex; }
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar.collapsed { width: 240px; }
          .btn-collapse { display: block; position: absolute; top: 16px; right: -16px; width: 32px; height: 32px; background: #1C1A14; border: 1px solid rgba(201,168,76,0.2); border-radius: 50%; color: #C9A84C; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .main { margin-left: 0; padding-top: 56px; }
          .topbar { padding: 0 16px; }
          .page-content { padding: 16px; }
        }
      `}</style>

      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <span style={{ fontFamily: 'Cinzel', color: '#C9A84C', fontSize: 14 }}>SisDisfraz</span>
        <span style={{ width: 24 }}></span>
      </div>

      <div className="layout">
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <button className="btn-collapse" onClick={() => setMobileMenuOpen(false)}>✕</button>
          <div className="sidebar-header">
            <span className="sidebar-logo">🎭</span>
            <div className="sidebar-brand">
              <div className="brand-name">SisDisfraz</div>
              <div className="brand-sub">Sistema</div>
            </div>
          </div>
          <nav className="nav-section">
            <div className="nav-label">Menú</div>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">🔑</div>
              <div>
                <div className="user-name">{perfil?.nombre || 'Usuario'}</div>
                <div className="user-rol">{ROL_LABELS[rol]}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Cerrar Sesión</button>
          </div>
        </aside>
        <main className="main">
          <div className="topbar">
            <span style={{ fontFamily: 'Cinzel', fontSize: 11, letterSpacing: 2, color: 'rgba(201,168,76,0.4)', textTransform: 'uppercase' }}>
              {navItems.find(i => i.href === pathname)?.label ?? 'Dashboard'}
            </span>
            <span className="rol-badge">{ROL_LABELS[rol]}</span>
          </div>
          <div className="page-content">{children}</div>
        </main>
      </div>
    </>
  )
}
