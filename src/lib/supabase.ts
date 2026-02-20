// ============================================================
// SisDisfraz Perú — Cliente Supabase + Hooks principales
// src/lib/supabase.ts  +  src/hooks/useAlquileres.ts
// ============================================================

// ---- src/lib/supabase.ts ------------------------------------

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// Las variables de entorno van en .env.local (nunca en el repo)
// NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ---- src/lib/api.ts -----------------------------------------
// Wrapper tipado para llamar a las Edge Functions

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
  const { data, error } = await supabase.functions.invoke('registrar-alquiler', {
    body: dto,
  })
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
  const { data, error } = await supabase.functions.invoke('procesar-devolucion', {
    body: dto,
  })
  if (error) throw error
  return data
}


// ============================================================
// HOOKS — src/hooks/
// ============================================================

// ---- useAuth.ts ----------------------------------------------

export function useAuth() {
  // Llama a supabase.auth.getUser() y expone el perfil completo
  // Incluye el rol para controlar qué ve cada usuario en la UI
  /*
  import { useEffect, useState } from 'react'
  import { supabase } from '../lib/supabase'
  import type { Perfil } from '../types/database.types'

  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setPerfil(data)
      setLoading(false)
    })
  }, [])

  return { perfil, loading, esAdmin: perfil?.rol === 'administrador' }
  */
}

// ---- useDisfraces.ts ----------------------------------------
/*
  Uso en componente:
  const { disfraces, loading } = useDisfraces({ soloDisponibles: true })
*/
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
  return data
}

// ---- useAlquileresActivos.ts --------------------------------
/*
  Obtiene todos los alquileres activos con join de cliente y disfraz.
  Usa Realtime para actualización en vivo.

  Uso:
  const { alquileres, loading } = useAlquileresActivos()
*/
export async function fetchAlquileresActivos() {
  const { data, error } = await supabase
    .from('alquileres')
    .select(`
      *,
      cliente:clientes(nombre, whatsapp, dni),
      disfraz:disfraces(nombre, danza, talla)
    `)
    .in('estado', ['activo', 'reserva'])
    .order('fecha_vencimiento', { ascending: true })

  if (error) throw error
  return data
}

// ---- useCajaDiaria.ts ---------------------------------------
export async function fetchCajaDiaria(fecha?: string) {
  const targetDate = fecha ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pagos')
    .select('metodo, monto, concepto, created_at')
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Agrupar por método de pago
  const resumen = (data ?? []).reduce((acc, pago: any) => {
    const metodo = pago.metodo as string
    if (!acc[metodo]) acc[metodo] = { total: 0, count: 0 }
    acc[metodo].total += Number(pago.monto)
    acc[metodo].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  const totalDia = (data ?? []).reduce((sum: number, p: any) => sum + Number(p.monto), 0)

  return { pagos: data, resumen, totalDia }
}

// ---- useLavanderiaPendiente.ts ------------------------------
export async function fetchLavanderiaPendiente() {
  const { data, error } = await supabase
    .from('lavanderia')
    .select(`
      *,
      disfraz:disfraces(nombre, talla, danza)
    `)
    .neq('estado', 'listo')
    .order('es_urgente', { ascending: false })
    .order('fecha_ingreso', { ascending: true })

  if (error) throw error
  return data
}

export async function marcarLavanderiaListo(lavanderiaId: string, procesadoPor: string) {
  const { error } = await (supabase
    .from('lavanderia') as any)
    .update({ estado: 'listo', procesado_por: procesadoPor })
    .eq('id', lavanderiaId)

  if (error) throw error
}

// ---- useReportes.ts -----------------------------------------
export async function fetchDanzasRentables(desde?: string, hasta?: string) {
  let query = supabase
    .from('alquileres')
    .select(`
      total_cobrado,
      disfraz:disfraces(danza)
    `)
    .eq('estado', 'devuelto')

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data, error } = await query
  if (error) throw error

  // Agrupar por danza
  const porDanza = data?.reduce((acc, a) => {
    const danza = (a.disfraz as any)?.danza ?? 'Desconocida'
    if (!acc[danza]) acc[danza] = { total: 0, count: 0 }
    acc[danza].total += a.total_cobrado
    acc[danza].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  return Object.entries(porDanza ?? {})
    .map(([danza, stats]) => ({ danza, ...stats }))
    .sort((a, b) => b.total - a.total)
}

// ---- Alertas del dashboard (apertura del día) ---------------
export async function fetchAlertasDia() {
  const hoy = new Date().toISOString().split('T')[0]
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [vencenHoy, vencenManana, enRetraso, urgentesLavanderia] = await Promise.all([
    // Alquileres que vencen hoy
    supabase.from('alquileres')
      .select('id', { count: 'exact' })
      .eq('fecha_vencimiento', hoy)
      .eq('estado', 'activo'),

    // Alquileres que vencen mañana (para recordatorio 24h)
    supabase.from('alquileres')
      .select('id', { count: 'exact' })
      .eq('fecha_vencimiento', manana)
      .eq('estado', 'activo'),

    // Alquileres en retraso
    supabase.from('alquileres')
      .select('id', { count: 'exact' })
      .lt('fecha_vencimiento', hoy)
      .eq('estado', 'activo'),

    // Trajes urgentes en lavandería
    supabase.from('lavanderia')
      .select('id', { count: 'exact' })
      .eq('es_urgente', true)
      .neq('estado', 'listo'),
  ])

  return {
    vencenHoy:           vencenHoy.count ?? 0,
    vencenManana:        vencenManana.count ?? 0,
    enRetraso:           enRetraso.count ?? 0,
    urgentesLavanderia:  urgentesLavanderia.count ?? 0,
  }
}


// ============================================================
// REALTIME — Suscripciones para actualización en vivo
// ============================================================

export function suscribirAlquileresActivos(callback: () => void) {
  return supabase
    .channel('alquileres-activos')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'alquileres',
    }, callback)
    .subscribe()
}

export function suscribirLavanderia(callback: () => void) {
  return supabase
    .channel('lavanderia-cambios')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lavanderia',
    }, callback)
    .subscribe()
}


// ============================================================
// STORAGE — Subir fotos de DNI y daños
// ============================================================

export async function subirFotoDNI(file: File, clienteId: string): Promise<string> {
  const extension = file.name.split('.').pop()
  const path = `dni/${clienteId}_${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from('fotos-dni')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('fotos-dni')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function subirFotoDaño(file: File, alquilerId: string, piezaNombre: string): Promise<string> {
  const path = `daños/${alquilerId}_${piezaNombre}_${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from('fotos-daños')
    .upload(path, file, { contentType: 'image/jpeg' })

  if (error) throw error

  const { data } = supabase.storage
    .from('fotos-daños')
    .getPublicUrl(path)

  return data.publicUrl
}
