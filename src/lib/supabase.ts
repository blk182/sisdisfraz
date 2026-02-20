/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// SisDisfraz Perú — Cliente Supabase + funciones de datos
// src/lib/supabase.ts
// ============================================================

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================
// API — llamadas a Edge Functions
// ============================================================

export async function registrarAlquiler(dto: {
  cliente_id: string
  disfraz_id: string
  es_reserva: boolean
  fecha_retiro: string
  fecha_vencimiento: string
  monto_adelanto: number
  metodo_pago: string
  foto_dni_url?: string
  notas?: string
}) {
  const { data, error } = await supabase.functions.invoke('registrar-alquiler', { body: dto })
  if (error) throw error
  return data
}

export async function procesarDevolucion(dto: {
  alquiler_id: string
  piezas: Array<{
    pieza_id: string
    nombre_pieza: string
    estado: 'bueno' | 'daño_leve' | 'no_entrego'
    foto_daño_url: string | null
    costo_cobrado: number
  }>
  destino: 'lavanderia' | 'stock_directo'
  procesado_por: string
  metodo_pago?: string
}) {
  const { data, error } = await supabase.functions.invoke('procesar-devolucion', { body: dto })
  if (error) throw error
  return data
}

// ============================================================
// QUERIES
// ============================================================

export async function fetchDisfraces(soloDisponibles = false) {
  let query = supabase
    .from('disfraces')
    .select('*')
    .eq('activo', true)
    .order('danza', { ascending: true })

  if (soloDisponibles) {
    query = query.gt('stock_disponible', 0)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchAlquileresActivos() {
  const { data, error } = await (supabase as any)
    .from('alquileres')
    .select(`*, cliente:clientes(nombre, whatsapp, dni), disfraz:disfraces(nombre, danza, talla)`)
    .in('estado', ['activo', 'reserva'])
    .order('fecha_vencimiento', { ascending: true })

  if (error) throw error
  return (data ?? []) as any[]
}

export async function fetchCajaDiaria(fecha?: string) {
  const targetDate = fecha ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pagos')
    .select('metodo, monto, concepto, created_at')
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) throw error

  const pagos = (data ?? []) as any[]

  const resumen = pagos.reduce((acc: Record<string, { total: number; count: number }>, pago: any) => {
    const metodo = String(pago.metodo)
    if (!acc[metodo]) acc[metodo] = { total: 0, count: 0 }
    acc[metodo].total += Number(pago.monto)
    acc[metodo].count += 1
    return acc
  }, {})

  const totalDia = pagos.reduce((sum: number, p: any) => sum + Number(p.monto), 0)

  return { pagos, resumen, totalDia }
}

export async function fetchLavanderiaPendiente() {
  const { data, error } = await (supabase as any)
    .from('lavanderia')
    .select(`*, disfraz:disfraces(nombre, talla, danza)`)
    .neq('estado', 'listo')
    .order('es_urgente', { ascending: false })
    .order('fecha_ingreso', { ascending: true })

  if (error) throw error
  return (data ?? []) as any[]
}

export async function marcarLavanderiaListo(lavanderiaId: string, procesadoPor: string) {
  const { error } = await supabase
    .from('lavanderia')
    .update({ estado: 'listo' as any, procesado_por: procesadoPor } as any)
    .eq('id', lavanderiaId)

  if (error) throw error
}

export async function fetchDanzasRentables(desde?: string, hasta?: string) {
  let query = (supabase as any)
    .from('alquileres')
    .select(`total_cobrado, disfraz:disfraces(danza)`)
    .eq('estado', 'devuelto')

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as any[]

  const porDanza: Record<string, { total: number; count: number }> = rows.reduce((acc, a: any) => {
    const danza: string = a.disfraz?.danza ?? 'Desconocida'
    if (!acc[danza]) acc[danza] = { total: 0, count: 0 }
    acc[danza].total += Number(a.total_cobrado)
    acc[danza].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  return Object.entries(porDanza)
    .map(([danza, stats]: [string, { total: number; count: number }]) => ({ danza, ...stats }))
    .sort((a, b) => b.total - a.total)
}

export async function fetchAlertasDia() {
  const hoy = new Date().toISOString().split('T')[0]
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [vencenHoy, vencenManana, enRetraso, urgentesLavanderia] = await Promise.all([
    supabase.from('alquileres').select('id', { count: 'exact', head: true }).eq('fecha_vencimiento', hoy).eq('estado', 'activo'),
    supabase.from('alquileres').select('id', { count: 'exact', head: true }).eq('fecha_vencimiento', manana).eq('estado', 'activo'),
    supabase.from('alquileres').select('id', { count: 'exact', head: true }).lt('fecha_vencimiento', hoy).eq('estado', 'activo'),
    supabase.from('lavanderia').select('id', { count: 'exact', head: true }).eq('es_urgente', true).neq('estado', 'listo'),
  ])

  return {
    vencenHoy:          vencenHoy.count ?? 0,
    vencenManana:       vencenManana.count ?? 0,
    enRetraso:          enRetraso.count ?? 0,
    urgentesLavanderia: urgentesLavanderia.count ?? 0,
  }
}

// ============================================================
// REALTIME
// ============================================================

export function suscribirAlquileresActivos(callback: () => void) {
  return supabase
    .channel('alquileres-activos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alquileres' }, callback)
    .subscribe()
}

export function suscribirLavanderia(callback: () => void) {
  return supabase
    .channel('lavanderia-cambios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lavanderia' }, callback)
    .subscribe()
}

// ============================================================
// STORAGE
// ============================================================

export async function subirFotoDNI(file: File, clienteId: string): Promise<string> {
  const extension = file.name.split('.').pop()
  const path = `dni/${clienteId}_${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('fotos-dni').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('fotos-dni').getPublicUrl(path)
  return data.publicUrl
}

export async function subirFotoDanio(file: File, alquilerId: string, piezaNombre: string): Promise<string> {
  const path = `danos/${alquilerId}_${piezaNombre}_${Date.now()}.jpg`
  const { error } = await supabase.storage.from('fotos-danos').upload(path, file, { contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from('fotos-danos').getPublicUrl(path)
  return data.publicUrl
}
