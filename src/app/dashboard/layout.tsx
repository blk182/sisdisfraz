'use client'
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
  { href: '/dashboard',            icon: '⚡', label: 'Alertas del Día',    roles: ['administrador', 'operador', 'solo_lectura'] },
  { href: '/dashboard/alquileres', icon: '🎭', label: 'Alquileres',         roles: ['administrador', 'operador', 'solo_lectura'] },
  { href: '/dashboard/devolucion', icon: '↩️', label: 'Devoluciones',       roles: ['administrador', 'operador'] },
  { href: '/dashboard/lavanderia', icon: '🧺', label: 'Lavandería',         roles: ['administrador', 'operador'] },
  { href: '/dashboard/catalogo',   icon: '📦', label: 'Catálogo',           roles: ['administrador', 'operador', 'solo_lectura'] },
  { href: '/dashboard/clientes',   icon: '👥', label: 'Clientes',           roles: ['administrador', 'operador'] },
  { href: '/dashboard/proveedores',icon: '🔍', label: 'Proveedores',        roles: ['administrador'] },
  { href: '/dashboard/reportes',   icon: '📊', label: 'Reportes',           roles: ['administrador'] },
  { href: '/dashboard/usuarios',   icon: '🔑', label: 'Usuarios',           roles: ['administrador'] },
]

const ROL_LABELS: Record<Rol, string> = {
  administrador: 'Administrador',
  operador:      'Operador',
  solo_lectura:  'Solo Lectura',
}

const ROL_COLORS: Record<Rol, string> = {
  administrador: '#C9A84C',
  operador:      '#2980B9',
  solo_lectura:  '#27AE60',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil]   = useState<{ nombre: string; rol: Rol } | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()

      if (!data) { router.push('/login'); return }
      setPerfil(data as { nombre: string; rol: Rol })
      setLoading(false)
    }
    checkAuth()
  }, [router])

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

  const rol = perfil?.rol ?? 'solo_lectura'
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(rol))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; }

        .layout { display: flex; min-height: 100vh; }

        /* SIDEBAR */
        .sidebar {
          width: ${collapsed ? '72px' : '240px'};
          background: #0D0B08;
          border-right: 1px solid rgba(201,168,76,0.12);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 100;
          transition: width 0.25s ease;
          overflow: hidden;
        }

        .sidebar-header {
          padding: ${collapsed ? '20px 0' : '24px 20px'};
          border-bottom: 1px solid rgba(201,168,76,0.08);
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: ${collapsed ? 'center' : 'flex-start'};
        }

        .sidebar-logo { font-size: 28px; flex-shrink: 0; }

        .sidebar-brand {
          overflow: hidden;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.2s;
          white-space: nowrap;
        }

        .brand-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          color: #C9A84C;
          letter-spacing: 1px;
        }

        .brand-sub {
          font-family: 'Crimson Text', serif;
          font-style: italic;
          font-size: 11px;
          color: rgba(201,168,76,0.4);
        }

        .nav-section {
          flex: 1;
          padding: 16px 0;
          overflow-y: auto;
        }

        .nav-label {
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.25);
          padding: 8px 20px 4px;
          display: ${collapsed ? 'none' : 'block'};
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: ${collapsed ? '12px 0' : '11px 20px'};
          justify-content: ${collapsed ? 'center' : 'flex-start'};
          color: rgba(232,224,208,0.5);
          text-decoration: none;
          font-family: 'Crimson Text', serif;
          font-size: 15px;
          transition: all 0.15s;
          position: relative;
          cursor: pointer;
        }

        .nav-item:hover {
          color: #E8E0D0;
          background: rgba(201,168,76,0.05);
        }

        .nav-item.active {
          color: #C9A84C;
          background: rgba(201,168,76,0.08);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: #C9A84C;
        }

        .nav-icon { font-size: 18px; flex-shrink: 0; }

        .nav-text {
          white-space: nowrap;
          overflow: hidden;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.2s;
        }

        .sidebar-footer {
          padding: ${collapsed ? '16px 0' : '16px 20px'};
          border-top: 1px solid rgba(201,168,76,0.08);
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          justify-content: ${collapsed ? 'center' : 'flex-start'};
        }

        .user-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(201,168,76,0.15);
          border: 1px solid rgba(201,168,76,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .user-info {
          overflow: hidden;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.2s;
          white-space: nowrap;
        }

        .user-name {
          font-family: 'Crimson Text', serif;
          font-size: 14px;
          color: #E8E0D0;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .user-rol {
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: ${ROL_COLORS[rol]};
        }

        .btn-logout {
          width: 100%;
          padding: ${collapsed ? '8px 0' : '8px 12px'};
          background: rgba(192,57,43,0.08);
          border: 1px solid rgba(192,57,43,0.2);
          border-radius: 2px;
          color: rgba(192,57,43,0.7);
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-logout:hover {
          background: rgba(192,57,43,0.15);
          color: #E74C3C;
          border-color: rgba(192,57,43,0.4);
        }

        .btn-collapse {
          position: absolute;
          top: 24px; right: -12px;
          width: 24px; height: 24px;
          background: #1C1A14;
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 50%;
          color: #C9A84C;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px;
          z-index: 101;
          transition: all 0.2s;
        }

        .btn-collapse:hover {
          background: rgba(201,168,76,0.1);
        }

        /* MAIN */
        .main {
          margin-left: ${collapsed ? '72px' : '240px'};
          flex: 1;
          transition: margin-left 0.25s ease;
          min-height: 100vh;
          background: #0A0A0A;
        }

        .topbar {
          height: 56px;
          background: rgba(13,11,8,0.8);
          border-bottom: 1px solid rgba(201,168,76,0.08);
          display: flex;
          align-items: center;
          padding: 0 28px;
          backdrop-filter: blur(8px);
          position: sticky; top: 0; z-index: 50;
        }

        .page-content {
          padding: 28px;
        }

        .rol-badge {
          padding: 4px 10px;
          border-radius: 2px;
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          background: ${ROL_COLORS[rol]}18;
          border: 1px solid ${ROL_COLORS[rol]}40;
          color: ${ROL_COLORS[rol]};
          margin-left: auto;
        }
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <button className="btn-collapse" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '›' : '‹'}
          </button>

          <div className="sidebar-header">
            <span className="sidebar-logo">🎭</span>
            <div className="sidebar-brand">
              <div className="brand-name">SisDisfraz</div>
              <div className="brand-sub">Sistema de Alquiler</div>
            </div>
          </div>

          <nav className="nav-section">
            <div className="nav-label">Menú principal</div>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">
                {perfil?.rol === 'administrador' ? '🔑' : perfil?.rol === 'operador' ? '🛍️' : '👁️'}
              </div>
              <div className="user-info">
                <div className="user-name">{perfil?.nombre}</div>
                <div className="user-rol">{ROL_LABELS[rol]}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              <span>⏻</span>
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">
          <div className="topbar">
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: 'rgba(201,168,76,0.4)', textTransform: 'uppercase' }}>
              {navItems.find(i => i.pathname === pathname)?.label ?? 'Dashboard'}
            </span>
            <span className="rol-badge">
              {ROL_LABELS[rol]}
            </span>
          </div>
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
