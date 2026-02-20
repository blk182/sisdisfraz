'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Disfraz {
  id: string
  nombre: string
  danza: string
  talla: string
  precio_base: number
  precio_temporada: number
  stock_total: number
  stock_disponible: number
  foto_url: string
  activo: boolean
}

const DANZAS = [
  'Diablada', 'Tinkuy', 'Tonda', 'Carnavalito', 'Huayra', 'Sikuri', 'Diablada Infantil',
  'Negrería', 'Morenada', 'Carnaval', 'Otro'
]

export default function CatalogoAdminPage() {
  const [disfraces, setDisfraces] = useState<Disfraz[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Disfraz | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  
  const [form, setForm] = useState({
    nombre: '',
    danza: 'Diablada',
    talla: '',
    precio_base: 0,
    precio_temporada: 0,
    stock_total: 1,
    foto_url: '',
  })

  useEffect(() => {
    cargarDisfraces()
  }, [])

  async function cargarDisfraces() {
    const { data, error } = await supabase
      .from('disfraces')
      .select('*')
      .order('danza', { ascending: true })
      .order('nombre', { ascending: true })

    if (!error) {
      setDisfraces(data || [])
    }
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({
      nombre: '',
      danza: 'Diablada',
      talla: '',
      precio_base: 0,
      precio_temporada: 0,
      stock_total: 1,
      foto_url: '',
    })
    setMensaje('')
    setMostrarModal(true)
  }

  function abrirEditar(d: Disfraz) {
    setEditando(d)
    setForm({
      nombre: d.nombre,
      danza: d.danza,
      talla: d.talla,
      precio_base: d.precio_base,
      precio_temporada: d.precio_temporada,
      stock_total: d.stock_total,
      foto_url: d.foto_url || '',
    })
    setMensaje('')
    setMostrarModal(true)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    try {
      const data = {
        nombre: form.nombre,
        danza: form.danza,
        talla: form.talla,
        precio_base: form.precio_base,
        precio_temporada: form.precio_temporada,
        stock_total: form.stock_total,
        stock_disponible: editando ? undefined : form.stock_total,
        foto_url: form.foto_url || null,
        activo: true,
      }

      if (editando) {
        const { error } = await supabase
          .from('disfraces')
          .update(data)
          .eq('id', editando.id)
        
        if (error) throw error
        setMensaje('Disfraz actualizado')
      } else {
        const { error } = await supabase
          .from('disfraces')
          .insert([data])
        
        if (error) throw error
        setMensaje('Disfraz creado')
      }

      setTimeout(() => {
        setMostrarModal(false)
        cargarDisfraces()
      }, 1000)
    } catch (err: any) {
      setMensaje(err.message || 'Error al guardar')
    }

    setGuardando(false)
  }

  async function toggleActivo(id: string, activo: boolean) {
    const { error } = await supabase
      .from('disfraces')
      .update({ activo: !activo })
      .eq('id', id)

    if (!error) {
      cargarDisfraces()
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Estás seguro de eliminar este disfraz?')) return
    
    const { error } = await supabase
      .from('disfraces')
      .delete()
      .eq('id', id)

    if (!error) {
      cargarDisfraces()
    }
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
        .btn-sm { padding: 8px 14px; font-size: 10px; }
        .btn-outline { background: transparent; border: 1px solid rgba(201,168,76,0.2); color: #E8E0D0; }
        .btn-outline:hover { background: rgba(201,168,76,0.1); }
        .btn-danger { background: rgba(192,57,43,0.15); border: 1px solid rgba(192,57,43,0.3); color: #E74C3C; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #141210; border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; overflow: hidden; }
        .card-img { width: 100%; height: 180px; background: #1a1814; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .card-img img { width: 100%; height: 180px; object-fit: cover; }
        .card-body { padding: 16px; }
        .card-title { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 700; color: #E8E0D0; margin-bottom: 4px; }
        .card-danza { font-family: 'Crimson Text', serif; font-size: 12px; color: rgba(201,168,76,0.6); margin-bottom: 8px; }
        .card-price { font-family: 'Cinzel', serif; font-size: 18px; font-weight: 700; color: #C9A84C; }
        .card-stock { font-family: 'Crimson Text', serif; font-size: 11px; color: rgba(232,224,208,0.5); }
        .card-actions { display: flex; gap: 8px; margin-top: 12px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; overflow-y: auto; }
        .modal { background: #141210; border: 1px solid rgba(201,168,76,0.2); border-radius: 4px; padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-family: 'Cinzel', serif; font-size: 18px; color: #C9A84C; margin-bottom: 20px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.7); margin-bottom: 6px; }
        .form-input, .form-select { width: 100%; padding: 10px; background: #0D0B08; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 14px; outline: none; }
        .form-input:focus, .form-select:focus { border-color: rgba(201,168,76,0.5); }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .modal-actions .btn { flex: 1; }
        .mensaje { padding: 10px; border-radius: 2px; margin-bottom: 16px; font-size: 13px; text-align: center; }
        .mensaje-ok { background: rgba(39,174,96,0.15); color: #27AE60; }
        .mensaje-error { background: rgba(192,57,43,0.15); color: #E74C3C; }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; height: 20px; }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; }
          .btn { width: 100%; }
          .grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Disfraces</h1>
          <p className="page-sub">{disfraces.length} disfraces registrados</p>
        </div>
        <button className="btn" onClick={abrirNuevo}>+ Nuevo Disfraz</button>
      </div>

      <div className="grid">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 180 }} />
              <div className="card-body">
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '50%' }} />
              </div>
            </div>
          ))
        ) : (
          disfraces.map(d => (
            <div key={d.id} className="card">
              <div className="card-img">
                {d.foto_url ? <img src={d.foto_url} alt={d.nombre} /> : '🎭'}
              </div>
              <div className="card-body">
                <h3 className="card-title">{d.nombre}</h3>
                <p className="card-danza">{d.danza} · {d.talla}</p>
                <div className="card-price">S/ {d.precio_base}</div>
                <p className="card-stock">Stock: {d.stock_disponible}/{d.stock_total}</p>
                <div className="card-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(d)}>Editar</button>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleActivo(d.id, d.activo)}>
                    {d.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => eliminar(d.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {disfraces.length === 0 && !loading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(232,224,208,0.3)' }}>
          No hay disfraces. Crea el primero.
        </div>
      )}

      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editando ? 'Editar Disfraz' : 'Nuevo Disfraz'}</h2>
            {mensaje && (
              <div className={`mensaje ${mensaje.includes('Error') ? 'mensaje-error' : 'mensaje-ok'}`}>
                {mensaje}
              </div>
            )}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Danza</label>
                <select className="form-select" value={form.danza} onChange={e => setForm({...form, danza: e.target.value})}>
                  {DANZAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tallas (separadas por coma)</label>
                <input type="text" className="form-input" placeholder="S, M, L, XL" value={form.talla} onChange={e => setForm({...form, talla: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Precio Base (S/)</label>
                  <input type="number" className="form-input" value={form.precio_base} onChange={e => setForm({...form, precio_base: Number(e.target.value)})} required min={0} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Temporada (S/)</label>
                  <input type="number" className="form-input" value={form.precio_temporada} onChange={e => setForm({...form, precio_temporada: Number(e.target.value)})} required min={0} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stock Total</label>
                <input type="number" className="form-input" value={form.stock_total} onChange={e => setForm({...form, stock_total: Number(e.target.value)})} required min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">URL de Foto</label>
                <input type="url" className="form-input" placeholder="https://..." value={form.foto_url} onChange={e => setForm({...form, foto_url: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
