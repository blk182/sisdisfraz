'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Cliente {
  id: string
  nombre: string
  dni: string
  whatsapp: string
}

interface Disfraz {
  id: string
  nombre: string
  danza: string
  talla: string
  precio_base: number
  precio_temporada: number
  stock_disponible: number
}

const METODOS_PAGO = ['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta']

export default function NuevoAlquilerPage() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', dni: '', whatsapp: '' })
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)

  const [disfraces, setDisfraces] = useState<Disfraz[]>([])
  const [disfrazSeleccionado, setDisfrazSeleccionado] = useState<Disfraz | null>(null)
  const [busquedaDisfraz, setBusquedaDisfraz] = useState('')

  const [fechaRetiro, setFechaRetiro] = useState('')
  const [fechaVence, setFechaVence] = useState('')
  const [esReserva, setEsReserva] = useState(false)
  const [esTemporada, setEsTemporada] = useState(false)
  const [montoAdelanto, setMontoAdelanto] = useState(0)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    cargarDisfraces()
  }, [])

  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      buscarClientes()
    }
  }, [busquedaCliente])

  useEffect(() => {
    if (disfrazSeleccionado && fechaRetiro) {
      const retiro = new Date(fechaRetiro)
      const vence = new Date(retiro)
      vence.setDate(vence.getDate() + 3)
      setFechaVence(vence.toISOString().split('T')[0])
      
      const mes = retiro.getMonth()
      const esTemp = mes >= 5 && mes <= 8
      setEsTemporada(esTemp)
    }
  }, [fechaRetiro, disfrazSeleccionado])

  async function cargarDisfraces() {
    const { data } = await supabase
      .from('disfraces')
      .select('*')
      .eq('activo', true)
      .gt('stock_disponible', 0)
      .order('nombre')

    if (data) setDisfraces(data)
  }

  async function buscarClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${busquedaCliente}%,dni.ilike.%${busquedaCliente}%`)
      .limit(10)

    if (data) setClientes(data)
  }

  async function crearCliente() {
    if (!nuevoCliente.nombre || !nuevoCliente.dni || !nuevoCliente.whatsapp) {
      setMensaje('Completa todos los campos')
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        nombre: nuevoCliente.nombre,
        dni: nuevoCliente.dni,
        whatsapp: nuevoCliente.whatsapp,
      }])
      .select()
      .single()

    if (error) {
      setMensaje(error.message)
      setLoading(false)
      return
    }

    setClienteSeleccionado(data)
    setMostrarNuevoCliente(false)
    setLoading(false)
  }

  const precioTotal = disfrazSeleccionado 
    ? (esTemporada ? disfrazSeleccionado.precio_temporada : disfrazSeleccionado.precio_base)
    : 0

  async function guardarAlquiler() {
    if (!clienteSeleccionado || !disfrazSeleccionado || !fechaRetiro || !fechaVence) {
      setMensaje('Completa todos los campos')
      return
    }

    setLoading(true)
    setMensaje('')

    try {
      const { error } = await supabase
        .from('alquileres')
        .insert([{
          cliente_id: clienteSeleccionado.id,
          disfraz_id: disfrazSeleccionado.id,
          fecha_retiro: fechaRetiro,
          fecha_vencimiento: fechaVence,
          estado: esReserva ? 'reserva' : 'activo',
          total_cobrado: precioTotal,
          monto_adelanto: montoAdelanto,
          notas: notas || null,
        }])

      if (error) throw error

      if (montoAdelanto > 0) {
        await supabase.from('pagos').insert([{
          cliente_id: clienteSeleccionado.id,
          alquiler_id: (await supabase.from('alquileres').select('id').order('created_at', { ascending: false }).limit(1).single()).data?.id,
          monto: montoAdelanto,
          metodo: metodoPago,
          concepto: 'adelanto',
        }])
      }

      setMensaje('Alquiler guardado correctamente')
      setTimeout(() => router.push('/dashboard/alquileres'), 1500)
    } catch (err: any) {
      setMensaje(err.message || 'Error al guardar')
    }

    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        .page-header { margin-bottom: 28px; }
        .page-title { font-family: 'Cinzel', serif; font-size: 24px; font-weight: 700; color: #E8E0D0; letter-spacing: 1px; }
        .steps { display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; }
        .step { flex: 1; min-width: 100px; padding: 16px; background: #141210; border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .step.active { border-color: #C9A84C; background: rgba(201,168,76,0.1); }
        .step.completed { border-color: #27AE60; background: rgba(39,174,96,0.1); }
        .step-num { font-family: 'Cinzel', serif; font-size: 20px; color: #C9A84C; margin-bottom: 4px; }
        .step-label { font-family: 'Crimson Text', serif; font-size: 12px; color: rgba(232,224,208,0.5); }
        .card { background: #141210; border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; padding: 24px; margin-bottom: 24px; }
        .card-title { font-family: 'Cinzel', serif; font-size: 14px; color: #C9A84C; margin-bottom: 16px; letter-spacing: 1px; }
        .search-input { width: 100%; padding: 14px 16px; background: #0D0B08; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 15px; outline: none; margin-bottom: 12px; }
        .search-input:focus { border-color: rgba(201,168,76,0.5); }
        .result-item { padding: 14px; background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.1); border-radius: 2px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
        .result-item:hover { background: rgba(201,168,76,0.1); border-color: #C9A84C; }
        .result-item.selected { background: rgba(201,168,76,0.15); border-color: #C9A84C; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(201,168,76,0.7); margin-bottom: 8px; }
        .form-input, .form-select { width: 100%; padding: 12px; background: #0D0B08; border: 1px solid rgba(201,168,76,0.15); border-radius: 2px; color: #E8E0D0; font-family: 'Crimson Text', serif; font-size: 14px; outline: none; }
        .form-input:focus, .form-select:focus { border-color: rgba(201,168,76,0.5); }
        .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-family: 'Crimson Text', serif; color: #E8E0D0; }
        .checkbox-label input { width: 18px; height: 18px; }
        .disfraz-card { display: flex; gap: 16px; padding: 16px; background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.1); border-radius: 3px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
        .disfraz-card:hover { background: rgba(201,168,76,0.1); }
        .disfraz-card.selected { border-color: #C9A84C; background: rgba(201,168,76,0.15); }
        .disfraz-img { width: 80px; height: 80px; background: #1a1814; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .disfraz-info { flex: 1; }
        .disfraz-nombre { font-family: 'Cinzel', serif; font-size: 16px; color: #E8E0D0; margin-bottom: 4px; }
        .disfraz-datos { font-family: 'Crimson Text', serif; font-size: 13px; color: rgba(232,224,208,0.5); }
        .disfraz-precio { font-family: 'Cinzel', serif; font-size: 20px; color: #C9A84C; font-weight: 700; }
        .precio-box { background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2); border-radius: 3px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .precio-label { font-family: 'Crimson Text', serif; font-size: 13px; color: rgba(232,224,208,0.5); margin-bottom: 4px; }
        .precio-valor { font-family: 'Cinzel', serif; font-size: 36px; color: #C9A84C; font-weight: 700; }
        .btn { padding: 14px 24px; background: linear-gradient(135deg, #C9A84C 0%, #A8873C 100%); border: none; border-radius: 2px; color: #080808; font-family: 'Cinzel', serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .btn:hover { background: linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%); }
        .btn-outline { background: transparent; border: 1px solid rgba(201,168,76,0.2); color: #E8E0D0; }
        .btn-outline:hover { background: rgba(201,168,76,0.1); }
        .btn-back { background: transparent; border: 1px solid rgba(201,168,76,0.2); color: #E8E0D0; }
        .actions { display: flex; gap: 12px; margin-top: 24px; }
        .mensaje { padding: 12px; border-radius: 2px; margin-bottom: 16px; font-size: 14px; text-align: center; }
        .mensaje-ok { background: rgba(39,174,96,0.15); color: #27AE60; }
        .mensaje-error { background: rgba(192,57,43,0.15); color: #E74C3C; }
        @media (max-width: 768px) {
          .form-row { grid-template-columns: 1fr; }
          .steps { flex-direction: column; }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Nuevo Alquiler</h1>
      </div>

      <div className="steps">
        <div className={`step ${paso === 1 ? 'active' : paso > 1 ? 'completed' : ''}`}>
          <div className="step-num">1</div>
          <div className="step-label">Cliente</div>
        </div>
        <div className={`step ${paso === 2 ? 'active' : paso > 2 ? 'completed' : ''}`}>
          <div className="step-num">2</div>
          <div className="step-label">Disfraz</div>
        </div>
        <div className={`step ${paso === 3 ? 'active' : ''}`}>
          <div className="step-num">3</div>
          <div className="step-label">Cobro</div>
        </div>
      </div>

      {mensaje && <div className={`mensaje ${mensaje.includes('correctamente') ? 'mensaje-ok' : 'mensaje-error'}`}>{mensaje}</div>}

      {paso === 1 && (
        <div className="card">
          <div className="card-title">Seleccionar Cliente</div>
          
          {clienteSeleccionado ? (
            <div className="result-item selected">
              <strong>{clienteSeleccionado.nombre}</strong>
              <br />
              <small>DNI: {clienteSeleccionado.dni} · WhatsApp: {clienteSeleccionado.whatsapp}</small>
            </div>
          ) : (
            <>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar por nombre o DNI..." 
                value={busquedaCliente}
                onChange={e => setBusquedaCliente(e.target.value)}
              />
              
              {clientes.map(c => (
                <div 
                  key={c.id} 
                  className="result-item"
                  onClick={() => { setClienteSeleccionado(c); setBusquedaCliente(''); }}
                >
                  <strong>{c.nombre}</strong>
                  <br />
                  <small>DNI: {c.dni} · WhatsApp: {c.whatsapp}</small>
                </div>
              ))}

              <button className="btn btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)}>
                + Crear Nuevo Cliente
              </button>

              {mostrarNuevoCliente && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(201,168,76,0.05)', borderRadius: 4 }}>
                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-input" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">DNI</label>
                      <input type="text" className="form-input" value={nuevoCliente.dni} onChange={e => setNuevoCliente({...nuevoCliente, dni: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">WhatsApp</label>
                      <input type="text" className="form-input" value={nuevoCliente.whatsapp} onChange={e => setNuevoCliente({...nuevoCliente, whatsapp: e.target.value})} />
                    </div>
                  </div>
                  <button className="btn" onClick={crearCliente} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Cliente'}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="actions">
            <button className="btn" disabled={!clienteSeleccionado} onClick={() => setPaso(2)}>Siguiente →</button>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="card">
          <div className="card-title">Seleccionar Disfraz</div>
          
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar disfraz..." 
            value={busquedaDisfraz}
            onChange={e => setBusquedaDisfraz(e.target.value)}
          />

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {disfraces
              .filter(d => d.nombre.toLowerCase().includes(busquedaDisfraz.toLowerCase()) || d.danza.toLowerCase().includes(busquedaDisfraz.toLowerCase()))
              .map(d => (
                <div 
                  key={d.id} 
                  className={`disfraz-card ${disfrazSeleccionado?.id === d.id ? 'selected' : ''}`}
                  onClick={() => setDisfrazSeleccionado(d)}
                >
                  <div className="disfraz-img">🎭</div>
                  <div className="disfraz-info">
                    <div className="disfraz-nombre">{d.nombre}</div>
                    <div className="disfraz-datos">{d.danza} · {d.talla}</div>
                    <div className="disfraz-datos">Stock: {d.stock_disponible}</div>
                  </div>
                  <div className="disfraz-precio">S/ {d.precio_base}</div>
                </div>
              ))
            }
          </div>

          <div className="actions">
            <button className="btn btn-back" onClick={() => setPaso(1)}>← Atrás</button>
            <button className="btn" disabled={!disfrazSeleccionado} onClick={() => setPaso(3)}>Siguiente →</button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="card">
          <div className="card-title">Datos del Alquiler</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha de Retiro</label>
              <input type="date" className="form-input" value={fechaRetiro} onChange={e => setFechaRetiro(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Vencimiento</label>
              <input type="date" className="form-input" value={fechaVence} onChange={e => setFechaVence(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={esReserva} onChange={e => setEsReserva(e.target.checked)} />
              Es una reserva (no se entrega aún)
            </label>
          </div>

          <div className="precio-box">
            <div className="precio-label">Precio Total {esTemporada ? '(Temporada Alta)' : ''}</div>
            <div className="precio-valor">S/ {precioTotal}</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto Adelanto (S/)</label>
              <input type="number" className="form-input" value={montoAdelanto} onChange={e => setMontoAdelanto(Number(e.target.value))} min={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Método de Pago</label>
              <select className="form-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={3} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>

          <div className="actions">
            <button className="btn btn-back" onClick={() => setPaso(2)}>← Atrás</button>
            <button className="btn" onClick={guardarAlquiler} disabled={loading}>
              {loading ? 'Guardando...' : 'Confirmar Alquiler'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
