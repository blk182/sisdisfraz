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

export default function CatalogoPage() {
  const [disfraces, setDisfraces] = useState<Disfraz[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroDanza, setFiltroDanza] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('disfraces')
        .select('*')
        .eq('activo', true)
        .order('danza', { ascending: true })
        .order('nombre', { ascending: true })

      if (!error) {
        setDisfraces(data || [])
      }
      setLoading(false)
    }
    cargar()
  }, [])

  const danzas = [...new Set(disfraces.map(d => d.danza))]

  const filtered = disfraces.filter(d => {
    const matchBusqueda = d.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                          d.danza.toLowerCase().includes(busqueda.toLowerCase())
    const matchDanza = !filtroDanza || d.danza === filtroDanza
    return matchBusqueda && matchDanza
  })

  const getStockBadge = (d: Disfraz) => {
    const pct = d.stock_disponible / d.stock_total
    if (pct === 0) return { color: '#C0392B', label: 'Sin stock' }
    if (pct <= 0.3) return { color: '#F39C12', label: 'Poco stock' }
    return { color: '#27AE60', label: 'Disponible' }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        .page-header { margin-bottom: 28px; }
        .page-title { font-family: 'Cinzel', serif; font-size: 24px; font-weight: 700; color: #E8E0D0; letter-spacing: 1px; }
        .page-sub { font-family: 'Crimson Text', serif; font-size: 14px; color: rgba(201,168,76,0.5); margin-top: 4px; }
        .filters { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; padding: 12px 16px; background: #141210; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 15px; outline: none; }
        .search-input:focus { border-color: rgba(201,168,76,0.5); }
        .search-input::placeholder { color: rgba(232,224,208,0.2); }
        .filter-select { padding: 12px 16px; background: #141210; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 15px; outline: none; cursor: pointer; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .card { background: #141210; border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
        .card-img { width: 100%; height: 200px; background: #1a1814; display: flex; align-items: center; justify-content: center; font-size: 48px; }
        .card-img img { width: 100%; height: 200px; object-fit: cover; }
        .card-body { padding: 20px; }
        .card-title { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; color: #E8E0D0; margin-bottom: 8px; }
        .card-danza { font-family: 'Crimson Text', serif; font-size: 13px; color: rgba(201,168,76,0.6); margin-bottom: 12px; }
        .card-tallas { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .talla-badge { padding: 4px 10px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 1px; color: rgba(232,224,208,0.5); }
        .card-precios { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
        .precio-base { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; color: #C9A84C; }
        .precio-temp { font-family: 'Crimson Text', serif; font-size: 12px; color: rgba(232,224,208,0.4); }
        .stock-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 2px; font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Catálogo de Disfraces</h1>
        <p className="page-sub">{filtered.length} disfraces disponibles</p>
      </div>

      <div className="filters">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Buscar disfraz..." 
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select 
          className="filter-select" 
          value={filtroDanza} 
          onChange={e => setFiltroDanza(e.target.value)}
        >
          <option value="">Todas las danzas</option>
          {danzas.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 200 }} />
              <div className="card-body">
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 24, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(232,224,208,0.3)', fontFamily: 'Crimson Text, serif', fontSize: 16 }}>
          No se encontraron disfraces con los filtros seleccionados
        </div>
      ) : (
        <div className="grid">
          {filtered.map(d => {
            const stock = getStockBadge(d)
            return (
              <div key={d.id} className="card">
                <div className="card-img">
                  {d.foto_url ? <img src={d.foto_url} alt={d.nombre} /> : '🎭'}
                </div>
                <div className="card-body">
                  <h3 className="card-title">{d.nombre}</h3>
                  <p className="card-danza">{d.danza}</p>
                  <div className="card-tallas">
                    {d.talla.split(',').map((t: string) => (
                      <span key={t} className="talla-badge">{t.trim()}</span>
                    ))}
                  </div>
                  <div className="card-precios">
                    <div>
                      <div className="precio-base">S/ {d.precio_base}</div>
                      <div className="precio-temp">Temporada: S/ {d.precio_temporada}</div>
                    </div>
                    <span className="stock-badge" style={{ background: `${stock.color}20`, border: `1px solid ${stock.color}40`, color: stock.color }}>
                      {stock.label} ({d.stock_disponible}/{d.stock_total})
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
