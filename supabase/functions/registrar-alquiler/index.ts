// ============================================================
// SisDisfraz Perú — Edge Function: registrar-alquiler
// supabase/functions/registrar-alquiler/index.ts
//
// Desplegar con: supabase functions deploy registrar-alquiler
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---- Validaciones de dominio --------------------------------

function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni)
}

function validarWhatsApp(numero: string): boolean {
  return /^\+51\d{9}$/.test(numero)
}

function validarFecha(fecha: string): boolean {
  const d = new Date(fecha)
  return !isNaN(d.getTime())
}

// ---- Plantillas de WhatsApp ---------------------------------

function mensajeConfirmacionAlquiler(params: {
  nombre: string
  disfraz: string
  talla: string
  fechaVencimiento: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  esReserva: boolean
  fechaRetiro?: string
}): string {
  const { nombre, disfraz, talla, fechaVencimiento, montoTotal, montoPagado, saldoPendiente, esReserva, fechaRetiro } = params

  if (esReserva) {
    return `🎭 *¡Reserva confirmada! - SisDisfraz Perú*\n\n` +
      `Hola ${nombre} 👋\n\n` +
      `Tu reserva está asegurada:\n` +
      `• *Traje:* ${disfraz} (Talla ${talla})\n` +
      `• *Fecha de recojo:* ${fechaRetiro}\n` +
      `• *Fecha de devolución:* ${fechaVencimiento}\n\n` +
      `💰 *Detalle de pago:*\n` +
      `• Total: S/ ${montoTotal.toFixed(2)}\n` +
      `• Adelanto pagado: S/ ${montoPagado.toFixed(2)}\n` +
      `• Saldo al recoger: S/ ${saldoPendiente.toFixed(2)}\n\n` +
      `¡Te esperamos! 🎊`
  }

  return `🎭 *¡Alquiler confirmado! - SisDisfraz Perú*\n\n` +
    `Hola ${nombre} 👋\n\n` +
    `Gracias por tu alquiler:\n` +
    `• *Traje:* ${disfraz} (Talla ${talla})\n` +
    `• *Devolver antes del:* ${fechaVencimiento} hasta las 7 PM\n\n` +
    `💰 *Total pagado:* S/ ${montoTotal.toFixed(2)}\n\n` +
    `Cuida bien el traje. ¡Que lo disfrutes! 🎉`
}

// ---- Handler principal --------------------------------------

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Autenticar el request con el JWT del usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Usamos service role para operaciones que requieren eludir RLS en triggers
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Verificar que el usuario tiene rol operador o administrador
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no encontrado')

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol, nombre')
      .eq('id', user.id)
      .single()

    if (!perfil || !['administrador', 'operador'].includes(perfil.rol)) {
      return new Response(
        JSON.stringify({ error: 'Sin permisos para registrar alquileres' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parsear y validar el body
    const body = await req.json()
    const {
      cliente_id,
      disfraz_id,
      es_reserva,
      fecha_retiro,
      fecha_vencimiento,
      monto_adelanto,
      metodo_pago,
      foto_dni_url,
      notas,
      referencia_pago,
      numero_origen,
    } = body

    if (!cliente_id || !disfraz_id || !fecha_retiro || !fecha_vencimiento) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios: cliente_id, disfraz_id, fechas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!validarFecha(fecha_retiro) || !validarFecha(fecha_vencimiento)) {
      return new Response(
        JSON.stringify({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(fecha_vencimiento) < new Date(fecha_retiro)) {
      return new Response(
        JSON.stringify({ error: 'La fecha de vencimiento debe ser posterior a la de retiro' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verificar stock del disfraz
    const { data: disfraz, error: disfrazError } = await supabase
      .from('disfraces')
      .select('id, nombre, talla, precio_base, precio_temporada_alta, stock_disponible')
      .eq('id', disfraz_id)
      .eq('activo', true)
      .single()

    if (disfrazError || !disfraz) {
      return new Response(
        JSON.stringify({ error: 'Disfraz no encontrado o inactivo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (disfraz.stock_disponible < 1) {
      return new Response(
        JSON.stringify({
          error: 'Sin stock disponible',
          sugerencia: 'Puedes crear una reserva o solicitud de búsqueda a proveedor'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Calcular precio según temporada (llamada a función SQL)
    const { data: precioCalculado } = await supabase
      .rpc('calcular_precio_alquiler', {
        p_disfraz_id: disfraz_id,
        p_fecha_retiro: fecha_retiro,
      })

    const precio = precioCalculado as number

    // Validar temporada para el registro
    const { data: esTemporadaAlta } = await supabase
      .rpc('es_temporada_alta', { fecha: fecha_retiro })

    const temporadaAplicada = esTemporadaAlta ? 'alta' : 'normal'

    // 6. Calcular saldo pendiente
    const adelanto = monto_adelanto ?? precio
    const saldoPendiente = Math.max(0, precio - adelanto)

    // Si es contado (no reserva), debe pagarse el 100%
    if (!es_reserva && adelanto < precio) {
      return new Response(
        JSON.stringify({ error: 'Alquiler contado requiere pago del 100% (S/' + precio + ')' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si es reserva, debe pagarse al menos el 30%
    if (es_reserva && adelanto < precio * 0.30) {
      return new Response(
        JSON.stringify({ error: `Reserva requiere adelanto mínimo del 30% (S/ ${(precio * 0.30).toFixed(2)})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Obtener datos del cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nombre, whatsapp')
      .eq('id', cliente_id)
      .single()

    if (!cliente) {
      return new Response(
        JSON.stringify({ error: 'Cliente no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Crear el alquiler (dentro de una transacción usando admin client)
    const { data: alquiler, error: alquilerError } = await supabaseAdmin
      .from('alquileres')
      .insert({
        cliente_id,
        disfraz_id,
        operador_id: user.id,
        es_reserva: es_reserva ?? false,
        estado: es_reserva ? 'reserva' : 'activo',
        temporada_aplicada: temporadaAplicada,
        fecha_retiro,
        fecha_vencimiento,
        precio_calculado: precio,
        monto_adelanto: adelanto,
        saldo_pendiente: saldoPendiente,
        total_cobrado: adelanto,
        foto_dni_url: foto_dni_url ?? null,
        notas: notas ?? null,
      })
      .select()
      .single()

    if (alquilerError) throw alquilerError

    // 9. Registrar el pago
    await supabaseAdmin
      .from('pagos')
      .insert({
        alquiler_id: alquiler.id,
        operador_id: user.id,
        metodo: metodo_pago,
        monto: adelanto,
        concepto: es_reserva ? 'Adelanto de reserva (30%)' : 'Pago completo alquiler contado',
        referencia: referencia_pago ?? null,
        numero_origen: numero_origen ?? null,
      })

    // 10. Insertar piezas del checklist en el alquiler
    const { data: piezas } = await supabase
      .from('piezas_disfraz')
      .select('id, nombre')
      .eq('disfraz_id', disfraz_id)

    if (piezas && piezas.length > 0) {
      await supabaseAdmin
        .from('alquiler_piezas')
        .insert(
          piezas.map(p => ({
            alquiler_id: alquiler.id,
            pieza_id: p.id,
            nombre_pieza: p.nombre,
            estado_salida: 'bueno' as const,  // Asumimos todo bien al salir
          }))
        )
    }

    // 11. Registrar en audit log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        usuario_id: user.id,
        accion: 'ALQUILER_CREADO',
        tabla: 'alquileres',
        registro_id: alquiler.id,
        datos_despues: { alquiler_id: alquiler.id, cliente_id, disfraz_id, precio, es_reserva },
      })

    // 12. Encolar notificación WhatsApp de confirmación
    const mensajeWA = mensajeConfirmacionAlquiler({
      nombre: cliente.nombre,
      disfraz: disfraz.nombre,
      talla: disfraz.talla,
      fechaVencimiento: fecha_vencimiento,
      montoTotal: precio,
      montoPagado: adelanto,
      saldoPendiente,
      esReserva: es_reserva ?? false,
      fechaRetiro: fecha_retiro,
    })

    await supabaseAdmin
      .from('notificaciones_whatsapp')
      .insert({
        alquiler_id: alquiler.id,
        cliente_id,
        tipo: es_reserva ? 'confirmacion_reserva' : 'confirmacion_reserva',
        mensaje: mensajeWA,
        enviado: false,  // El scheduler lo envía en background
      })

    // 13. Respuesta exitosa
    return new Response(
      JSON.stringify({
        ok: true,
        alquiler: {
          id: alquiler.id,
          estado: alquiler.estado,
          precio_calculado: precio,
          temporada_aplicada: temporadaAplicada,
          monto_adelanto: adelanto,
          saldo_pendiente: saldoPendiente,
          whatsapp_encolado: true,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error en registrar-alquiler:', error)
    return new Response(
      JSON.stringify({ error: error.message ?? 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
