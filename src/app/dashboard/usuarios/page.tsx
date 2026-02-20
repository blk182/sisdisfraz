'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Perfil {
  id: string
  nombre: string
  rol: string
  activo: boolean
}

const ROLES = [
  { value: 'administrador', label: 'Administrador', desc: 'Acceso total' },
  { value: 'operador', label: 'Operador', desc: 'Alquileres y clientes' },
  { value: 'solo_lectura', label: 'Solo Lectura', desc: 'Solo ver' },
]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [emailNuevo, setEmailNuevo] = useState('')
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [rolNuevo, setRolNuevo] = useState('operador')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true })

    if (!error && data) {
      setUsuarios(data as Perfil[])
    }
    setLoading(false)
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailNuevo,
        password: passwordNuevo,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      const { error: perfilError } = await supabase
        .from('perfiles')
        .insert({
          id: authData.user.id,
          nombre: nombreNuevo,
          rol: rolNuevo,
          activo: true,
        })

      if (perfilError) throw perfilError

      setMensaje('Usuario creado correctamente')
      setEmailNuevo('')
      setNombreNuevo('')
      setPasswordNuevo('')
      setMostrarModal(false)
      cargarUsuarios()
    } catch (err: any) {
      setMensaje(err.message || 'Error al crear usuario')
    }

    setGuardando(false)
  }

  async function cambiarRol(usuarioId: string, nuevoRol: string) {
    const { error } = await supabase
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('id', usuarioId)

    if (!error) {
      cargarUsuarios()
    }
  }

  async function toggleActivo(usuarioId: string, activo: boolean) {
    const { error } = await supabase
      .from('perfiles')
      .update({ activo: !activo })
      .eq('id', usuarioId)

    if (!error) {
      cargarUsuarios()
    }
  }

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .page-title { font-family: 'Cinzel', serif; font-size: 24px; font-weight: 700; color: #E8E0D0; letter-spacing: 1px; }
        .page-sub { font-family: 'Crimson Text', serif; font-size: 14px; color: rgba(201,168,76,0.5); margin-top: 4px; }
        .btn { padding: 12px 20px; background: linear-gradient(135deg, #C9A84C 0%, #A8873C 100%); border: none; border-radius: 2px; color: #080808; font-family: 'Cinzel', serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .btn:hover { background: linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%); }
        .table-wrap { background: #141210; border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { padding: 14px 16px; text-align: left; font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.03); border-bottom: 1px solid rgba(201,168,76,0.08); }
        .table td { padding: 14px 16px; font-family: 'Crimson Text', serif; font-size: 14px; color: #E8E0D0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .table tr:last-child td { border-bottom: none; }
        .table tr:hover td { background: rgba(201,168,76,0.02); }
        .rol-select { padding: 6px 10px; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 13px; cursor: pointer; }
        .btn-sm { padding: 6px 12px; font-size: 10px; }
        .btn-outline { background: transparent; border: 1px solid rgba(201,168,76,0.2); color: #E8E0D0; }
        .btn-outline:hover { background: rgba(201,168,76,0.1); }
        .btn-danger { background: rgba(192,57,43,0.15); border: 1px solid rgba(192,57,43,0.3); color: #E74C3C; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: #141210; border: 1px solid rgba(201,168,76,0.2); border-radius: 4px; padding: 32px; width: 100%; max-width: 420px; }
        .modal-title { font-family: 'Cinzel', serif; font-size: 18px; color: #C9A84C; margin-bottom: 24px; }
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.7); margin-bottom: 8px; }
        .form-input, .form-select { width: 100%; padding: 12px; background: #0D0B08; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 14px; outline: none; }
        .form-input:focus, .form-select:focus { border-color: rgba(201,168,76,0.5); }
        .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
        .modal-actions .btn { flex: 1; }
        .mensaje { padding: 12px; border-radius: 2px; margin-bottom: 16px; font-size: 13px; text-align: center; }
        .mensaje-ok { background: rgba(39,174,96,0.15); color: #27AE60; }
        .mensaje-error { background: rgba(192,57,43,0.15); color: #E74C3C; }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; height: 16px; }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @media (max-width: 768px) {
          .table-wrap { overflow-x: auto; }
          .table { min-width: 500px; }
          .page-header { flex-direction: column; }
          .btn { width: 100%; }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-sub">{usuarios.length} usuarios registrados</p>
        </div>
        <button className="btn" onClick={() => setMostrarModal(true)}>+ Nuevo Usuario</button>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ marginBottom: 12, height: 20 }} />)}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                  <td>
                    <select
                      value={u.rol}
                      onChange={e => cambiarRol(u.id, e.target.value)}
                      className="rol-select"
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: 2px, 
                      fontSize: 11,
                      background: u.activo ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)',
                      color: u.activo ? '#27AE60' : '#E74C3C'
                    }}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleActivo(u.id, u.activo)}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'rgba(232,224,208,0.3)', padding: 40 }}>
                    No hay usuarios registrados. Crea el primero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nuevo Usuario</h2>
            {mensaje && <div className={`mensaje ${mensaje.includes('correctamente') ? 'mensaje-ok' : 'mensaje-error'}`}>{mensaje}</div>}
            <form onSubmit={crearUsuario}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-input" value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={emailNuevo} onChange={e => setEmailNuevo(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-input" value={passwordNuevo} onChange={e => setPasswordNuevo(e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-select" value={rolNuevo} onChange={e => setRolNuevo(e.target.value)}>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label} - {r.desc}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn" disabled={guardando}>
                  {guardando ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
