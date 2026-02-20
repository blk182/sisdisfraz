// ============================================================
// SisDisfraz Perú — Types TypeScript
// Generados del esquema de Supabase
// src/types/database.types.ts
// ============================================================

// --- Enums ---------------------------------------------------

export type RolUsuario       = 'administrador' | 'operador' | 'solo_lectura'
export type EstadoAlquiler   = 'activo' | 'reserva' | 'devuelto' | 'cancelado' | 'vencido'
export type EstadoLavanderia = 'ingresado' | 'en_proceso' | 'urgente' | 'listo'
export type EstadoPieza      = 'bueno' | 'daño_leve' | 'no_entrego'
export type EstadoProveedor  = 'buscando' | 'conseguido' | 'no_disponible'
export type MetodoPago       = 'efectivo' | 'yape' | 'plin' | 'transferencia_bcp' | 'transferencia_ibk' | 'tarjeta'
export type TemporadaTipo    = 'normal' | 'alta'
export type EstadoDisfraz    = 'nuevo' | 'bueno' | 'desgaste_leve' | 'necesita_reparacion'

// --- Tablas --------------------------------------------------

export interface Perfil {
  id:         string
  nombre:     string
  rol:        RolUsuario
  activo:     boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id:               string
  nombre:           string
  dni:              string
  whatsapp:         string
  foto_dni_url:     string | null
  total_alquileres: number
  total_gastado:    number
  created_at:       string
  updated_at:       string
}

export interface Disfraz {
  id:                    string
  nombre:                string
  danza:                 string
  talla:                 string
  descripcion:           string | null
  foto_url:              string | null
  precio_base:           number
  precio_temporada_alta: number
  estado_conservacion:   EstadoDisfraz
  stock_total:           number
  stock_disponible:      number
  stock_alquilado:       number
  stock_lavanderia:      number
  activo:                boolean
  created_at:            string
  updated_at:            string
}

export interface PiezaDisfraz {
  id:          string
  disfraz_id:  string
  nombre:      string
  obligatoria: boolean
  orden:       number
}

export interface Temporada {
  id:           string
  nombre:       string
  tipo:         TemporadaTipo
  fecha_inicio: string
  fecha_fin:    string
  activa:       boolean
}

export interface Alquiler {
  id:                 string
  cliente_id:         string
  disfraz_id:         string
  operador_id:        string
  es_reserva:         boolean
  estado:             EstadoAlquiler
  temporada_aplicada: TemporadaTipo
  fecha_retiro:       string
  fecha_vencimiento:  string
  fecha_devolucion:   string | null
  precio_calculado:   number
  monto_adelanto:     number
  saldo_pendiente:    number
  multa_acumulada:    number
  cobro_daños:        number
  total_cobrado:      number
  foto_dni_url:       string | null
  notas:              string | null
  created_at:         string
  updated_at:         string
}

export interface AlquilerPieza {
  id:             string
  alquiler_id:    string
  pieza_id:       string
  nombre_pieza:   string
  estado_salida:  EstadoPieza | null
  estado_retorno: EstadoPieza | null
  foto_daño_url:  string | null
  costo_cobrado:  number
}

export interface Pago {
  id:             string
  alquiler_id:    string
  operador_id:    string
  metodo:         MetodoPago
  monto:          number
  concepto:       string
  referencia:     string | null
  ultimos_4:      string | null
  numero_origen:  string | null
  created_at:     string
}

export interface Lavanderia {
  id:            string
  alquiler_id:   string
  disfraz_id:    string
  estado:        EstadoLavanderia
  es_urgente:    boolean
  procesado_por: string | null
  fecha_ingreso: string
  fecha_listo:   string | null
}

export interface Proveedor {
  id:                       string
  nombre:                   string
  whatsapp:                 string | null
  especialidad:             string[]
  total_solicitudes:        number
  solicitudes_exitosas:     number
  dias_respuesta_promedio:  number | null
  activo:                   boolean
  created_at:               string
}

export interface SolicitudProveedor {
  id:                string
  cliente_id:        string
  disfraz_buscar:    string
  talla:             string | null
  fecha_necesaria:   string | null
  proveedor_id:      string | null
  estado:            EstadoProveedor
  precio_conseguido: number | null
  fecha_respuesta:   string | null
  notas:             string | null
  created_at:        string
  updated_at:        string
}

export interface NotificacionWhatsApp {
  id:          string
  alquiler_id: string | null
  cliente_id:  string
  tipo:        TipoNotificacion
  mensaje:     string
  enviado:     boolean
  error:       string | null
  enviado_at:  string | null
  created_at:  string
}

export type TipoNotificacion =
  | 'recordatorio_24h'
  | 'vencimiento_hoy'
  | 'retraso_1d'
  | 'retraso_3d_mas'
  | 'confirmacion_reserva'
  | 'proveedor_conseguido'

// --- DTOs (Data Transfer Objects) para las Edge Functions ---

export interface RegistrarAlquilerDTO {
  cliente_id:        string
  disfraz_id:        string
  es_reserva:        boolean
  fecha_retiro:      string   // ISO date: YYYY-MM-DD
  fecha_vencimiento: string
  monto_adelanto:    number
  metodo_pago:       MetodoPago
  foto_dni_url?:     string
  notas?:            string
  // Para pago con tarjeta/transferencia:
  referencia_pago?:  string
  numero_origen?:    string
}

export interface ProcesarDevolucionDTO {
  alquiler_id:   string
  piezas:        ChecklistPiezaDTO[]
  destino:       'lavanderia' | 'stock_directo'
  procesado_por: string
  // Si hay cobro extra:
  metodo_pago?:  MetodoPago
  referencia?:   string
}

export interface ChecklistPiezaDTO {
  pieza_id:      string
  nombre_pieza:  string
  estado:        EstadoPieza
  foto_daño_url: string | null
  costo_cobrado: number
}

export interface RegistrarPagoDTO {
  alquiler_id:    string
  metodo:         MetodoPago
  monto:          number
  concepto:       string
  referencia?:    string
  ultimos_4?:     string
  numero_origen?: string
}

// --- Vistas (respuestas enriquecidas) -------------------------

export interface AlquilerActivo extends Alquiler {
  cliente:  Pick<Cliente, 'nombre' | 'whatsapp' | 'dni'>
  disfraz:  Pick<Disfraz, 'nombre' | 'danza' | 'talla'>
  dias_retraso: number
}

export interface ResumenCajaDiaria {
  fecha:             string
  metodo:            MetodoPago
  num_transacciones: number
  total:             number
}

// --- Database type (para el cliente de Supabase) --------------

export type Database = {
  public: {
    Tables: {
      perfiles:              { Row: Perfil;              Insert: Omit<Perfil, 'created_at' | 'updated_at'>; Update: Partial<Perfil> }
      clientes:              { Row: Cliente;             Insert: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'total_alquileres' | 'total_gastado'>; Update: Partial<Cliente> }
      disfraces:             { Row: Disfraz;             Insert: Omit<Disfraz, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Disfraz> }
      piezas_disfraz:        { Row: PiezaDisfraz;        Insert: Omit<PiezaDisfraz, 'id'>; Update: Partial<PiezaDisfraz> }
      temporadas:            { Row: Temporada;           Insert: Omit<Temporada, 'id'>; Update: Partial<Temporada> }
      alquileres:            { Row: Alquiler;            Insert: Omit<Alquiler, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Alquiler> }
      alquiler_piezas:       { Row: AlquilerPieza;       Insert: Omit<AlquilerPieza, 'id'>; Update: Partial<AlquilerPieza> }
      pagos:                 { Row: Pago;                Insert: Omit<Pago, 'id' | 'created_at'>; Update: never }
      lavanderia:            { Row: Lavanderia;          Insert: Omit<Lavanderia, 'id'>; Update: Partial<Lavanderia> }
      proveedores:           { Row: Proveedor;           Insert: Omit<Proveedor, 'id' | 'created_at'>; Update: Partial<Proveedor> }
      solicitudes_proveedor: { Row: SolicitudProveedor;  Insert: Omit<SolicitudProveedor, 'id' | 'created_at' | 'updated_at'>; Update: Partial<SolicitudProveedor> }
      notificaciones_whatsapp: { Row: NotificacionWhatsApp; Insert: Omit<NotificacionWhatsApp, 'id' | 'created_at'>; Update: Partial<NotificacionWhatsApp> }
    }
    Functions: {
      es_temporada_alta:        { Args: { fecha: string };                            Returns: boolean }
      calcular_precio_alquiler: { Args: { p_disfraz_id: string; p_fecha_retiro: string }; Returns: number }
      dias_retraso:             { Args: { p_alquiler_id: string };                    Returns: number }
    }
  }
}
