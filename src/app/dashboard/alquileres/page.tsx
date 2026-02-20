'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Alquiler {
  id: string
  cliente_id: string
  disfraz_id: string
  fecha_retiro: string
  fecha_vencimiento: string
  estado: string
  total_cobrado: number
  monto_adelanto: number
  clientes?: { nombre: string; whatsapp: string }
  disfraces?: { nombre: string }
}

export default function AlquileresPage() {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const router = useRouter()

  useEffect(() => {
    cargarAlquileres()
  }, [])

  async function cargarAlquileres() {
    const { data, error } = await supabase
      .from('alquileres')
      .select('*, clientes(nombre, whatsapp), disfraces(nombre)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAlquileres(data as Alquiler[])
    }
    setLoading(false)
  }

  const filtered = alquileres.filter(a => {
    const matchEstado = !filtroEstado || a.estado === filtroEstado
    const nombreCliente = (a.clientes as any)?.nombre?.toLowerCase() || ''
    const nombreDisfraz = (a.disfraces as any)?.nombre?.toLowerCase() || ''
    const matchBusqueda = !busqueda || 
      nombreCliente.includes(busqueda.toLowerCase()) || 
      nombreDisfraz.includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, { bg: string; color: string; label: string }> = {
      activo: { bg: 'rgba(39,174,96,0.15)', color: '#27AE60', label: 'Activo' },
      reserva: { bg: 'rgba(41,128,185,0.15)', color: '#2980B9', label: 'Reserva' },
      devuelto: { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C', label: 'Devuelto' },
      cancelado: { bg: 'rgba(192,57,43,0.15)', color: '#E74C3C', label: 'Cancelado' },
    }
    const e = estilos[estado] || estilos.activo
    return { bg: e.bg, color: e.color, label: e.label }
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
        .filters { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; padding: 12px 16px; background: #141210; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 15px; outline: none; }
        .search-input:focus { border-color: rgba(201,168,76,0.5); }
        .filter-select { padding: 12px 16px; background: #141210; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 15px; outline: none; cursor: pointer; }
        .table-wrap { background: #141210; border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { padding: 14px 16px; text-align: left; font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.03); border-bottom: 1px solid rgba(201,168,76,0.08); white-space: nowrap; }
        .table td { padding: 14px 16px; font-family: 'Crimson Text', serif; font-size: 14px; color: #E8E0D0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .table tr:last-child td { border-bottom: none; }
        .table tr:hover td { background: rgba(201,168,76,0.02); }
        .estado-badge { display: inline-flex; padding: 4px 10px; border-radius: 2px; font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
        .btn-sm { padding: 6px 12px; font-size: 10px; }
        .btn-outline { background: transparent; border: 1px solid rgba(201,168,76,0.2); color: #E8E0D0; }
        .btn-outline:hover { background: rgba(201,168,76,0.1); }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; height: 16px; }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @media (max-width: 1024px) {
          .table-wrap { overflow-x: auto; }
          .table { min-width: 800px; }
        }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; }
          .btn { width: 100%; }
          .filters { flex-direction: column; }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Alquileres</h1>
          <p className="page-sub">{filtered.length} alquileres</p>
        </div>
        <button className="btn" onClick={() => router.push('/dashboard/alquileres/nuevo')}>+ Nuevo Alquiler</button>
      </div>

      <div className="filters">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Buscar cliente o disfraz..." 
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select 
          className="filter-select" 
          value={filtroEstado} 
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="reserva">Reserva</option>
          <option value="devuelto">Devuelto</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ marginBottom: 12, height: 20 }} />)}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Disfraz</th>
                <th>Retiro</th>
                <th>Vence</th>
                <th>Total</th>
                <th>Adelanto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const e = getEstadoBadge(a.estado)
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{(a.clientes as any)?.nombre || '—'}</td>
                    <td>{(a.disfraces as any)?.nombre || '—'}</td>
                    <td>{a.fecha_retiro ? new Date(a.fecha_retiro).toLocaleDateString('es-PE') : '—'}</td>
                    <td>{a.fecha_vencimiento ? new Date(a.fecha_vencimiento).toLocaleDateString('es-PE') : '—'}</td>
                    <td style={{ color: '#C9A84C' }}>S/ {a.total_cobrado || 0}</td>
                    <td>S/ {a.monto_adelanto || 0}</td>
                    <td>
                      <span className="estado-badge" style={{ background: e.bg, color: e.color }}>
                        {e.label}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline">Ver</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'rgba(232,224,208,0.3)', padding: 40 }}>
                    No hay alquileres con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
