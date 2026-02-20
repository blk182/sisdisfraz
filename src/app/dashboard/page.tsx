'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Alertas {
  vencenHoy: number
  vencenManana: number
  enRetraso: number
  urgentesLavanderia: number
}

interface AlquilerActivo {
  id: string
  cliente: { nombre: string; whatsapp: string }
  disfraz: { nombre: string; talla: string }
  fecha_vencimiento: string
  estado: string
}

export default function DashboardPage() {
  const [alertas, setAlertas] = useState<Alertas>({ vencenHoy: 0, vencenManana: 0, enRetraso: 0, urgentesLavanderia: 0 })
  const [alquileres, setAlquileres] = useState<AlquilerActivo[]>([])
  const [loading, setLoading] = useState(true)
  const [hora, setHora] = useState('')

  useEffect(() => {
    const updateHora = () => {
      setHora(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }))
    }
    updateHora()
    const interval = setInterval(updateHora, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function cargar() {
      const hoy    = new Date().toISOString().split('T')[0]
      const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      const [r1, r2, r3, r4, rAlq] = await Promise.all([
        supabase.from('alquileres').select('id', { count: 'exact', head: true }).eq('fecha_vencimiento', hoy).eq('estado', 'activo'),
        supabase.from('alquileres').select('id', { count: 'exact', head: true }).eq('fecha_vencimiento', manana).eq('estado', 'activo'),
        supabase.from('alquileres').select('id', { count: 'exact', head: true }).lt('fecha_vencimiento', hoy).eq('estado', 'activo'),
        supabase.from('lavanderia').select('id', { count: 'exact', head: true }).eq('es_urgente', true).neq('estado', 'listo'),
        (supabase as any).from('alquileres')
          .select('id, fecha_vencimiento, estado, cliente:clientes(nombre, whatsapp), disfraz:disfraces(nombre, talla)')
          .in('estado', ['activo', 'reserva'])
          .order('fecha_vencimiento', { ascending: true })
          .limit(10),
      ])

      setAlertas({
        vencenHoy:          r1.count ?? 0,
        vencenManana:       r2.count ?? 0,
        enRetraso:          r3.count ?? 0,
        urgentesLavanderia: r4.count ?? 0,
      })
      setAlquileres((rAlq.data ?? []) as AlquilerActivo[])
      setLoading(false)
    }
    cargar()
  }, [])

  const hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const cards = [
    { label: 'Vencen Hoy',        value: alertas.vencenHoy,          icon: '⏰', color: '#E67E22', urgent: alertas.vencenHoy > 0 },
    { label: 'Recordatorio 24h',  value: alertas.vencenManana,       icon: '🔔', color: '#2980B9', urgent: false },
    { label: 'En Retraso',        value: alertas.enRetraso,          icon: '🚨', color: '#C0392B', urgent: alertas.enRetraso > 0 },
    { label: 'Urgentes Lavandería',value: alertas.urgentesLavanderia, icon: '⚡', color: '#8E44AD', urgent: alertas.urgentesLavanderia > 0 },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

        .dash-header { margin-bottom: 28px; }

        .dash-date {
          font-family: 'Crimson Text', serif;
          font-style: italic;
          font-size: 14px;
          color: rgba(201,168,76,0.4);
          text-transform: capitalize;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .dash-title {
          font-family: 'Cinzel', serif;
          font-size: 24px;
          font-weight: 700;
          color: #E8E0D0;
          letter-spacing: 1px;
        }

        .dash-hora {
          font-family: 'Cinzel', serif;
          font-size: 13px;
          color: rgba(201,168,76,0.5);
          margin-top: 2px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        @media (max-width: 900px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .alert-card {
          background: #141210;
          border-radius: 3px;
          padding: 22px 20px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
        }

        .alert-card:hover { transform: translateY(-2px); }

        .alert-card-border {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }

        .alert-card-glow {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.04;
        }

        .card-icon {
          font-size: 28px;
          margin-bottom: 12px;
          display: block;
        }

        .card-value {
          font-family: 'Cinzel', serif;
          font-size: 42px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 6px;
        }

        .card-label {
          font-family: 'Crimson Text', serif;
          font-size: 13px;
          color: rgba(232,224,208,0.4);
          letter-spacing: 0.5px;
        }

        .section-title {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.5);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(201,168,76,0.1);
        }

        .table-wrap {
          background: #141210;
          border: 1px solid rgba(201,168,76,0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .alq-table {
          width: 100%;
          border-collapse: collapse;
        }

        .alq-table th {
          padding: 12px 16px;
          text-align: left;
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.4);
          background: rgba(201,168,76,0.03);
          border-bottom: 1px solid rgba(201,168,76,0.08);
        }

        .alq-table td {
          padding: 13px 16px;
          font-family: 'Crimson Text', serif;
          font-size: 15px;
          color: #E8E0D0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .alq-table tr:last-child td { border-bottom: none; }

        .alq-table tr:hover td { background: rgba(201,168,76,0.02); }

        .estado-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 2px;
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .estado-activo  { background: rgba(39,174,96,0.12);  border: 1px solid rgba(39,174,96,0.25);  color: #27AE60; }
        .estado-reserva { background: rgba(41,128,185,0.12); border: 1px solid rgba(41,128,185,0.25); color: #2980B9; }
        .estado-vencido { background: rgba(192,57,43,0.12);  border: 1px solid rgba(192,57,43,0.25);  color: #C0392B; }

        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          height: 20px;
        }

        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }

        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>

      {/* Header */}
      <div className="dash-header">
        <div className="dash-date">{hoy}</div>
        <div className="dash-title">Panel de Control</div>
        <div className="dash-hora">🕐 {hora} hrs · Lima, Perú</div>
      </div>

      {/* Tarjetas de alerta */}
      <div className="cards-grid">
        {cards.map(card => (
          <div key={card.label} className="alert-card">
            <div className="alert-card-border" style={{ background: card.color }} />
            <div className="alert-card-glow" style={{ background: card.color }} />
            <span className={`card-icon ${card.urgent ? 'pulse' : ''}`}>{card.icon}</span>
            <div className="card-value" style={{ color: loading ? 'transparent' : card.urgent && card.value > 0 ? card.color : '#E8E0D0' }}>
              {loading ? <span className="skeleton" style={{ width: 60, height: 42, display: 'block' }} /> : card.value}
            </div>
            <div className="card-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de alquileres activos */}
      <div className="section-title">Alquileres Activos</div>
      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ marginBottom: 12, height: 16, width: `${70 + i * 5}%` }} />
            ))}
          </div>
        ) : alquileres.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(232,224,208,0.2)', fontFamily: 'Crimson Text, serif', fontStyle: 'italic', fontSize: 16 }}>
            No hay alquileres activos en este momento
          </div>
        ) : (
          <table className="alq-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Disfraz</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {alquileres.map(a => {
                const vence     = new Date(a.fecha_vencimiento)
                const hoyDate   = new Date()
                const diasDiff  = Math.ceil((vence.getTime() - hoyDate.getTime()) / 86400000)
                const venceStr  = vence.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
                const esRetraso = diasDiff < 0

                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{(a.cliente as any)?.nombre ?? '—'}</td>
                    <td style={{ color: 'rgba(232,224,208,0.6)' }}>
                      {(a.disfraz as any)?.nombre} · {(a.disfraz as any)?.talla}
                    </td>
                    <td>
                      <span style={{ color: esRetraso ? '#C0392B' : diasDiff <= 1 ? '#E67E22' : 'inherit' }}>
                        {venceStr}
                        {esRetraso && <span style={{ marginLeft: 6, fontSize: 11, color: '#C0392B' }}>({Math.abs(diasDiff)}d retraso)</span>}
                      </span>
                    </td>
                    <td>
                      <span className={`estado-badge estado-${esRetraso ? 'vencido' : a.estado}`}>
                        {esRetraso ? '🚨 Retraso' : a.estado === 'reserva' ? '📅 Reserva' : '✅ Activo'}
                      </span>
                    </td>
                    <td>
                      <a
                        href={`https://wa.me/${((a.cliente as any)?.whatsapp ?? '').replace('+', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#25D366', textDecoration: 'none', fontSize: 13 }}
                      >
                        💬 Contactar
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
