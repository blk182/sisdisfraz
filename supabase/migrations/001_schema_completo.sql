-- ============================================================
-- SisDisfraz Perú — Esquema completo de base de datos
-- Supabase / PostgreSQL
-- Versión 1.0 · Febrero 2026
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase en este orden.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- Para jobs automáticos (WhatsApp scheduler)


-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE rol_usuario       AS ENUM ('administrador', 'operador', 'solo_lectura');
CREATE TYPE estado_alquiler   AS ENUM ('activo', 'reserva', 'devuelto', 'cancelado', 'vencido');
CREATE TYPE estado_lavanderia AS ENUM ('ingresado', 'en_proceso', 'urgente', 'listo');
CREATE TYPE estado_pieza      AS ENUM ('bueno', 'daño_leve', 'no_entrego');
CREATE TYPE estado_proveedor  AS ENUM ('buscando', 'conseguido', 'no_disponible');
CREATE TYPE metodo_pago       AS ENUM ('efectivo', 'yape', 'plin', 'transferencia_bcp', 'transferencia_ibk', 'tarjeta');
CREATE TYPE temporada_tipo    AS ENUM ('normal', 'alta');
CREATE TYPE estado_disfraz    AS ENUM ('nuevo', 'bueno', 'desgaste_leve', 'necesita_reparacion');


-- ============================================================
-- 2. PERFILES DE USUARIO
-- Extiende auth.users de Supabase con datos del negocio
-- ============================================================

CREATE TABLE perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  rol         rol_usuario NOT NULL DEFAULT 'operador',
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE perfiles IS 'Perfil de cada usuario del sistema (extiende auth.users)';
COMMENT ON COLUMN perfiles.rol IS 'administrador: acceso total | operador: registro y devoluciones | solo_lectura: solo consulta';


-- ============================================================
-- 3. CLIENTES
-- ============================================================

CREATE TABLE clientes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          TEXT NOT NULL,
  dni             CHAR(8) NOT NULL UNIQUE,
  whatsapp        TEXT NOT NULL,                         -- Formato: +51XXXXXXXXX
  foto_dni_url    TEXT,                                  -- URL en Supabase Storage
  total_alquileres INT NOT NULL DEFAULT 0,
  total_gastado   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dni_formato CHECK (dni ~ '^\d{8}$'),
  CONSTRAINT whatsapp_formato CHECK (whatsapp ~ '^\+51\d{9}$')
);

CREATE INDEX idx_clientes_dni      ON clientes(dni);
CREATE INDEX idx_clientes_whatsapp ON clientes(whatsapp);

COMMENT ON TABLE clientes IS 'Clientes que alquilan disfraces';
COMMENT ON COLUMN clientes.whatsapp IS 'Número con prefijo +51, ej: +51987654321';


-- ============================================================
-- 4. CATÁLOGO DE DISFRACES
-- Cada fila = un tipo único (danza + talla)
-- ============================================================

CREATE TABLE disfraces (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                TEXT NOT NULL,                  -- Ej: "Diablada Puneña"
  danza                 TEXT NOT NULL,                  -- Ej: "Diablada", "Caporales", "Marinera"
  talla                 TEXT NOT NULL,                  -- Ej: "S", "M", "L", "XL", "Único"
  descripcion           TEXT,
  foto_url              TEXT,
  precio_base           NUMERIC(10,2) NOT NULL,         -- Precio temporada normal (Soles)
  precio_temporada_alta NUMERIC(10,2) NOT NULL,         -- Precio temporada alta (Soles)
  estado_conservacion   estado_disfraz NOT NULL DEFAULT 'bueno',
  stock_total           INT NOT NULL DEFAULT 0,
  stock_disponible      INT NOT NULL DEFAULT 0,
  stock_alquilado       INT NOT NULL DEFAULT 0,
  stock_lavanderia      INT NOT NULL DEFAULT 0,
  activo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stock_coherente CHECK (
    stock_total = stock_disponible + stock_alquilado + stock_lavanderia
  ),
  CONSTRAINT precios_positivos CHECK (
    precio_base > 0 AND precio_temporada_alta >= precio_base
  ),
  UNIQUE (danza, talla)
);

CREATE INDEX idx_disfraces_danza ON disfraces(danza);
CREATE INDEX idx_disfraces_disponible ON disfraces(stock_disponible) WHERE activo = true;

COMMENT ON TABLE disfraces IS 'Catálogo: cada fila es una combinación única danza+talla';


-- ============================================================
-- 5. PIEZAS POR DISFRAZ
-- Lista de componentes de cada traje
-- ============================================================

CREATE TABLE piezas_disfraz (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disfraz_id  UUID NOT NULL REFERENCES disfraces(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,       -- Ej: "Máscara", "Capa", "Pantalón"
  obligatoria BOOLEAN NOT NULL DEFAULT true,
  orden       INT NOT NULL DEFAULT 0,

  UNIQUE (disfraz_id, nombre)
);

CREATE INDEX idx_piezas_disfraz ON piezas_disfraz(disfraz_id);


-- ============================================================
-- 6. TEMPORADAS
-- El sistema detecta la temporada automáticamente
-- ============================================================

CREATE TABLE temporadas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,       -- Ej: "Carnaval de Puno 2026"
  tipo        temporada_tipo NOT NULL DEFAULT 'alta',
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activa       BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT fechas_validas CHECK (fecha_fin > fecha_inicio)
);

COMMENT ON TABLE temporadas IS 'Calendario de temporadas que afectan el precio';

-- Temporadas 2026 precargadas
INSERT INTO temporadas (nombre, tipo, fecha_inicio, fecha_fin) VALUES
  ('Carnaval de Puno + Candelaria 2026', 'alta', '2026-01-15', '2026-03-15'),
  ('Semana Santa 2026',                  'alta', '2026-03-29', '2026-04-05'),
  ('Fiestas Patrias 2026',               'alta', '2026-07-15', '2026-08-10'),
  ('Carnaval de Puno + Candelaria 2027', 'alta', '2027-01-15', '2027-03-15'),
  ('Fiestas Patrias 2027',               'alta', '2027-07-15', '2027-08-10');


-- ============================================================
-- 7. ALQUILERES
-- ============================================================

CREATE TABLE alquileres (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id),
  disfraz_id          UUID NOT NULL REFERENCES disfraces(id),
  operador_id         UUID NOT NULL REFERENCES perfiles(id),

  -- Tipo y estado
  es_reserva          BOOLEAN NOT NULL DEFAULT false,
  estado              estado_alquiler NOT NULL DEFAULT 'activo',
  temporada_aplicada  temporada_tipo NOT NULL DEFAULT 'normal',

  -- Fechas
  fecha_retiro        DATE NOT NULL,          -- Cuándo el cliente recoge el traje
  fecha_vencimiento   DATE NOT NULL,          -- Cuándo debe devolver
  fecha_devolucion    TIMESTAMPTZ,            -- Cuándo devolvió realmente (NULL = aún fuera)

  -- Dinero (todo en Soles)
  precio_calculado    NUMERIC(10,2) NOT NULL, -- Precio base del alquiler
  monto_adelanto      NUMERIC(10,2) NOT NULL DEFAULT 0,  -- 30% si es reserva, 100% si contado
  saldo_pendiente     NUMERIC(10,2) NOT NULL DEFAULT 0,
  multa_acumulada     NUMERIC(10,2) NOT NULL DEFAULT 0,
  cobro_daños         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cobrado       NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Evidencia
  foto_dni_url        TEXT,
  notas               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fechas_alquiler_validas CHECK (fecha_vencimiento >= fecha_retiro),
  CONSTRAINT montos_positivos CHECK (
    precio_calculado > 0 AND monto_adelanto >= 0 AND saldo_pendiente >= 0
  )
);

CREATE INDEX idx_alquileres_cliente   ON alquileres(cliente_id);
CREATE INDEX idx_alquileres_disfraz   ON alquileres(disfraz_id);
CREATE INDEX idx_alquileres_estado    ON alquileres(estado);
CREATE INDEX idx_alquileres_vencimiento ON alquileres(fecha_vencimiento) WHERE estado = 'activo';

COMMENT ON TABLE alquileres IS 'Registro de cada alquiler o reserva';


-- ============================================================
-- 8. CHECKLIST DE PIEZAS POR ALQUILER
-- Estado de cada pieza al momento de la devolución
-- ============================================================

CREATE TABLE alquiler_piezas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alquiler_id     UUID NOT NULL REFERENCES alquileres(id) ON DELETE CASCADE,
  pieza_id        UUID NOT NULL REFERENCES piezas_disfraz(id),
  nombre_pieza    TEXT NOT NULL,   -- Snapshot del nombre al momento del alquiler
  estado_salida   estado_pieza,    -- Estado al entregar (NULL hasta devolución)
  estado_retorno  estado_pieza,    -- Estado al devolver
  foto_daño_url   TEXT,            -- Foto del daño si aplica
  costo_cobrado   NUMERIC(10,2) NOT NULL DEFAULT 0,

  UNIQUE (alquiler_id, pieza_id)
);

CREATE INDEX idx_alquiler_piezas ON alquiler_piezas(alquiler_id);


-- ============================================================
-- 9. PAGOS
-- Cada transacción de dinero queda registrada
-- ============================================================

CREATE TABLE pagos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alquiler_id     UUID NOT NULL REFERENCES alquileres(id) ON DELETE CASCADE,
  operador_id     UUID NOT NULL REFERENCES perfiles(id),
  metodo          metodo_pago NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  concepto        TEXT NOT NULL,   -- Ej: "Adelanto reserva", "Saldo final", "Multa retraso"

  -- Datos de verificación según método
  referencia      TEXT,            -- Número de operación (transferencia/tarjeta)
  ultimos_4       CHAR(4),         -- Últimos 4 dígitos (tarjeta)
  numero_origen   TEXT,            -- Número Yape/Plin del cliente

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_pagos_alquiler ON pagos(alquiler_id);
CREATE INDEX idx_pagos_fecha    ON pagos(created_at);

COMMENT ON TABLE pagos IS 'Cada transacción de dinero. Un alquiler puede tener múltiples pagos.';


-- ============================================================
-- 10. LAVANDERÍA
-- ============================================================

CREATE TABLE lavanderia (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alquiler_id     UUID NOT NULL REFERENCES alquileres(id),
  disfraz_id      UUID NOT NULL REFERENCES disfraces(id),
  estado          estado_lavanderia NOT NULL DEFAULT 'ingresado',
  es_urgente      BOOLEAN NOT NULL DEFAULT false,
  procesado_por   TEXT,            -- Nombre del operador o lavandería externa
  fecha_ingreso   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_listo     TIMESTAMPTZ,

  CONSTRAINT fecha_listo_valida CHECK (
    fecha_listo IS NULL OR fecha_listo >= fecha_ingreso
  )
);

CREATE INDEX idx_lavanderia_estado   ON lavanderia(estado);
CREATE INDEX idx_lavanderia_urgente  ON lavanderia(es_urgente) WHERE estado != 'listo';

COMMENT ON TABLE lavanderia IS 'Ciclo de lavado entre devolución y vuelta al stock';


-- ============================================================
-- 11. PROVEEDORES Y SOLICITUDES DE BÚSQUEDA
-- ============================================================

CREATE TABLE proveedores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          TEXT NOT NULL,
  whatsapp        TEXT,
  especialidad    TEXT[],          -- Arreglo de danzas: ["Diablada", "Caporales"]
  total_solicitudes INT NOT NULL DEFAULT 0,
  solicitudes_exitosas INT NOT NULL DEFAULT 0,
  dias_respuesta_promedio NUMERIC(4,1),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE solicitudes_proveedor (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id),
  disfraz_buscar  TEXT NOT NULL,   -- Descripción libre (puede no existir en catálogo)
  talla           TEXT,
  fecha_necesaria DATE,
  proveedor_id    UUID REFERENCES proveedores(id),
  estado          estado_proveedor NOT NULL DEFAULT 'buscando',
  precio_conseguido NUMERIC(10,2),
  fecha_respuesta TIMESTAMPTZ,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solicitudes_estado ON solicitudes_proveedor(estado);


-- ============================================================
-- 12. LOG DE AUDITORÍA
-- Quién hizo qué y cuándo — inmutable
-- ============================================================

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID REFERENCES perfiles(id),
  accion      TEXT NOT NULL,       -- Ej: 'ALQUILER_CREADO', 'DEVOLUCION_PROCESADA'
  tabla       TEXT NOT NULL,
  registro_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_tabla   ON audit_log(tabla, registro_id);
CREATE INDEX idx_audit_fecha   ON audit_log(created_at);

COMMENT ON TABLE audit_log IS 'Registro inmutable de todas las acciones del sistema';


-- ============================================================
-- 13. NOTIFICACIONES WHATSAPP
-- Historial de mensajes enviados
-- ============================================================

CREATE TABLE notificaciones_whatsapp (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alquiler_id     UUID REFERENCES alquileres(id),
  cliente_id      UUID NOT NULL REFERENCES clientes(id),
  tipo            TEXT NOT NULL,   -- 'recordatorio_24h', 'vencimiento_hoy', 'retraso_1d', 'retraso_3d+', 'confirmacion_reserva', 'proveedor_conseguido'
  mensaje         TEXT NOT NULL,
  enviado         BOOLEAN NOT NULL DEFAULT false,
  error           TEXT,
  enviado_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_alquiler ON notificaciones_whatsapp(alquiler_id);
CREATE INDEX idx_notif_enviado  ON notificaciones_whatsapp(enviado, created_at);


-- ============================================================
-- 14. FUNCIONES DE DOMINIO
-- ============================================================

-- Detecta si una fecha cae en temporada alta
CREATE OR REPLACE FUNCTION es_temporada_alta(fecha DATE)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM temporadas
    WHERE activa = true
      AND tipo = 'alta'
      AND fecha BETWEEN fecha_inicio AND fecha_fin
  );
$$ LANGUAGE sql STABLE;

-- Calcula el precio de un alquiler según la fecha de retiro
CREATE OR REPLACE FUNCTION calcular_precio_alquiler(
  p_disfraz_id UUID,
  p_fecha_retiro DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_precio NUMERIC;
BEGIN
  SELECT
    CASE WHEN es_temporada_alta(p_fecha_retiro)
      THEN precio_temporada_alta
      ELSE precio_base
    END INTO v_precio
  FROM disfraces
  WHERE id = p_disfraz_id;

  RETURN COALESCE(v_precio, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Calcula días de retraso de un alquiler
CREATE OR REPLACE FUNCTION dias_retraso(p_alquiler_id UUID)
RETURNS INT AS $$
  SELECT GREATEST(0, (CURRENT_DATE - fecha_vencimiento)::INT)
  FROM alquileres
  WHERE id = p_alquiler_id AND estado = 'activo';
$$ LANGUAGE sql STABLE;


-- ============================================================
-- 15. TRIGGERS
-- ============================================================

-- Actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_perfiles
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_disfraces
  BEFORE UPDATE ON disfraces
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_alquileres
  BEFORE UPDATE ON alquileres
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: actualiza stock del disfraz al crear alquiler
CREATE OR REPLACE FUNCTION trigger_alquiler_actualizar_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado IN ('activo', 'reserva') THEN
    UPDATE disfraces SET
      stock_disponible = stock_disponible - 1,
      stock_alquilado  = stock_alquilado + 1
    WHERE id = NEW.disfraz_id;

  ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'activo' AND NEW.estado = 'devuelto' THEN
    UPDATE disfraces SET
      stock_alquilado  = stock_alquilado - 1
      -- stock_disponible sube cuando sale de lavandería
    WHERE id = NEW.disfraz_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alquiler_stock_trigger
  AFTER INSERT OR UPDATE OF estado ON alquileres
  FOR EACH ROW EXECUTE FUNCTION trigger_alquiler_actualizar_stock();

-- Trigger: stock sube cuando lavandería marca LISTO
CREATE OR REPLACE FUNCTION trigger_lavanderia_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'listo' AND OLD.estado != 'listo' THEN
    NEW.fecha_listo = NOW();
    UPDATE disfraces SET
      stock_lavanderia = stock_lavanderia - 1,
      stock_disponible = stock_disponible + 1
    WHERE id = NEW.disfraz_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lavanderia_stock_trigger
  BEFORE UPDATE OF estado ON lavanderia
  FOR EACH ROW EXECUTE FUNCTION trigger_lavanderia_stock();

-- Trigger: marca lavandería como URGENTE si hay reserva en 2 días
CREATE OR REPLACE FUNCTION trigger_lavanderia_urgente()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lavanderia l
  SET es_urgente = true
  FROM alquileres a
  WHERE l.disfraz_id = a.disfraz_id
    AND a.es_reserva = true
    AND a.estado = 'reserva'
    AND a.fecha_retiro <= CURRENT_DATE + INTERVAL '2 days'
    AND l.estado != 'listo'
    AND l.id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lavanderia_urgente_trigger
  AFTER INSERT ON lavanderia
  FOR EACH ROW EXECUTE FUNCTION trigger_lavanderia_urgente();

-- Trigger: actualiza stats del cliente al cerrar alquiler
CREATE OR REPLACE FUNCTION trigger_actualizar_stats_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'devuelto' AND OLD.estado != 'devuelto' THEN
    UPDATE clientes SET
      total_alquileres = total_alquileres + 1,
      total_gastado    = total_gastado + NEW.total_cobrado
    WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cliente_stats_trigger
  AFTER UPDATE OF estado ON alquileres
  FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_stats_cliente();

-- Trigger: auto-marca alquileres vencidos (job diario)
CREATE OR REPLACE FUNCTION marcar_alquileres_vencidos()
RETURNS void AS $$
  UPDATE alquileres
  SET estado = 'vencido',
      multa_acumulada = (CURRENT_DATE - fecha_vencimiento) * 10  -- S/ 10 por día, ajustable
  WHERE estado = 'activo'
    AND fecha_vencimiento < CURRENT_DATE;
$$ LANGUAGE sql;


-- ============================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE perfiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE disfraces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE piezas_disfraz     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alquileres         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alquiler_piezas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lavanderia         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_whatsapp ENABLE ROW LEVEL SECURITY;

-- Helper: obtiene el rol del usuario autenticado
CREATE OR REPLACE FUNCTION mi_rol()
RETURNS rol_usuario AS $$
  SELECT rol FROM perfiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------
-- REGLA: En PostgreSQL RLS:
--   SELECT / UPDATE / DELETE  → usan USING
--   INSERT                    → usa WITH CHECK (no USING)
--   ALL (todos los comandos)  → necesita USING + WITH CHECK
-- ----------------------------------------------------------------

-- PERFILES
CREATE POLICY "perfiles_select" ON perfiles FOR SELECT
  USING (id = auth.uid() OR mi_rol() = 'administrador');

CREATE POLICY "perfiles_insert" ON perfiles FOR INSERT
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "perfiles_update" ON perfiles FOR UPDATE
  USING (mi_rol() = 'administrador')
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "perfiles_delete" ON perfiles FOR DELETE
  USING (mi_rol() = 'administrador');

-- DISFRACES: todos ven; solo admin modifica
CREATE POLICY "disfraces_select" ON disfraces FOR SELECT USING (true);

CREATE POLICY "disfraces_insert" ON disfraces FOR INSERT
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "disfraces_update" ON disfraces FOR UPDATE
  USING (mi_rol() = 'administrador')
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "disfraces_delete" ON disfraces FOR DELETE
  USING (mi_rol() = 'administrador');

-- PIEZAS DISFRAZ
CREATE POLICY "piezas_select" ON piezas_disfraz FOR SELECT USING (true);

CREATE POLICY "piezas_insert" ON piezas_disfraz FOR INSERT
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "piezas_update" ON piezas_disfraz FOR UPDATE
  USING (mi_rol() = 'administrador')
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "piezas_delete" ON piezas_disfraz FOR DELETE
  USING (mi_rol() = 'administrador');

-- TEMPORADAS: todos ven; solo admin escribe
CREATE POLICY "temporadas_select" ON temporadas FOR SELECT USING (true);

CREATE POLICY "temporadas_insert" ON temporadas FOR INSERT
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "temporadas_update" ON temporadas FOR UPDATE
  USING (mi_rol() = 'administrador')
  WITH CHECK (mi_rol() = 'administrador');

-- CLIENTES: operador y admin escriben; solo_lectura solo lee
CREATE POLICY "clientes_select" ON clientes FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador', 'solo_lectura'));

CREATE POLICY "clientes_insert" ON clientes FOR INSERT
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "clientes_update" ON clientes FOR UPDATE
  USING (mi_rol() IN ('administrador', 'operador'))
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

-- ALQUILERES
CREATE POLICY "alquileres_select_admin_operador" ON alquileres FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "alquileres_select_solo_lectura" ON alquileres FOR SELECT
  USING (mi_rol() = 'solo_lectura' AND created_at::date = CURRENT_DATE);

CREATE POLICY "alquileres_insert" ON alquileres FOR INSERT
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "alquileres_update" ON alquileres FOR UPDATE
  USING (mi_rol() IN ('administrador', 'operador'))
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

-- ALQUILER PIEZAS
CREATE POLICY "alquiler_piezas_select" ON alquiler_piezas FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "alquiler_piezas_insert" ON alquiler_piezas FOR INSERT
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "alquiler_piezas_update" ON alquiler_piezas FOR UPDATE
  USING (mi_rol() IN ('administrador', 'operador'))
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

-- PAGOS: se insertan pero nunca se modifican
CREATE POLICY "pagos_select" ON pagos FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "pagos_insert" ON pagos FOR INSERT
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

-- LAVANDERÍA
CREATE POLICY "lavanderia_select" ON lavanderia FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "lavanderia_insert" ON lavanderia FOR INSERT
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "lavanderia_update" ON lavanderia FOR UPDATE
  USING (mi_rol() IN ('administrador', 'operador'))
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

-- AUDIT LOG: solo admin lee; nadie inserta directamente (lo hace el sistema)
CREATE POLICY "audit_select" ON audit_log FOR SELECT
  USING (mi_rol() = 'administrador');

-- NOTIFICACIONES WHATSAPP
CREATE POLICY "notif_select" ON notificaciones_whatsapp FOR SELECT
  USING (mi_rol() = 'administrador');

CREATE POLICY "notif_insert" ON notificaciones_whatsapp FOR INSERT
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "notif_update" ON notificaciones_whatsapp FOR UPDATE
  USING (mi_rol() = 'administrador')
  WITH CHECK (mi_rol() = 'administrador');

-- PROVEEDORES
CREATE POLICY "proveedores_select" ON proveedores FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "proveedores_insert" ON proveedores FOR INSERT
  WITH CHECK (mi_rol() = 'administrador');

CREATE POLICY "proveedores_update" ON proveedores FOR UPDATE
  USING (mi_rol() = 'administrador')
  WITH CHECK (mi_rol() = 'administrador');

-- SOLICITUDES PROVEEDOR
CREATE POLICY "solicitudes_select" ON solicitudes_proveedor FOR SELECT
  USING (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "solicitudes_insert" ON solicitudes_proveedor FOR INSERT
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));

CREATE POLICY "solicitudes_update" ON solicitudes_proveedor FOR UPDATE
  USING (mi_rol() IN ('administrador', 'operador'))
  WITH CHECK (mi_rol() IN ('administrador', 'operador'));


-- ============================================================
-- 17. VISTAS PARA REPORTES (solo admin)
-- ============================================================

CREATE VIEW vista_caja_diaria AS
SELECT
  DATE(p.created_at) AS fecha,
  p.metodo,
  COUNT(*) AS num_transacciones,
  SUM(p.monto) AS total
FROM pagos p
GROUP BY DATE(p.created_at), p.metodo
ORDER BY fecha DESC, total DESC;

CREATE VIEW vista_alquileres_activos AS
SELECT
  a.id,
  c.nombre AS cliente,
  c.whatsapp,
  d.nombre AS disfraz,
  d.danza,
  d.talla,
  a.fecha_retiro,
  a.fecha_vencimiento,
  CASE
    WHEN a.fecha_vencimiento < CURRENT_DATE THEN (CURRENT_DATE - a.fecha_vencimiento)::INT
    ELSE 0
  END AS dias_retraso,
  a.saldo_pendiente,
  a.estado
FROM alquileres a
JOIN clientes c ON c.id = a.cliente_id
JOIN disfraces d ON d.id = a.disfraz_id
WHERE a.estado IN ('activo', 'reserva')
ORDER BY a.fecha_vencimiento ASC;

CREATE VIEW vista_danzas_rentables AS
SELECT
  d.danza,
  COUNT(a.id) AS total_alquileres,
  SUM(a.total_cobrado) AS ingresos_total,
  AVG(a.total_cobrado) AS ingreso_promedio
FROM alquileres a
JOIN disfraces d ON d.id = a.disfraz_id
WHERE a.estado = 'devuelto'
GROUP BY d.danza
ORDER BY ingresos_total DESC;

CREATE VIEW vista_lavanderia_pendiente AS
SELECT
  l.id,
  d.nombre AS disfraz,
  d.talla,
  l.estado,
  l.es_urgente,
  l.fecha_ingreso,
  EXTRACT(EPOCH FROM (NOW() - l.fecha_ingreso)) / 3600 AS horas_en_lavanderia
FROM lavanderia l
JOIN disfraces d ON d.id = l.disfraz_id
WHERE l.estado != 'listo'
ORDER BY l.es_urgente DESC, l.fecha_ingreso ASC;

CREATE VIEW vista_clientes_frecuentes AS
SELECT
  c.id,
  c.nombre,
  c.whatsapp,
  c.total_alquileres,
  c.total_gastado,
  MAX(a.created_at) AS ultimo_alquiler
FROM clientes c
LEFT JOIN alquileres a ON a.cliente_id = c.id
GROUP BY c.id, c.nombre, c.whatsapp, c.total_alquileres, c.total_gastado
ORDER BY c.total_alquileres DESC
LIMIT 20;


-- ============================================================
-- 18. DATOS INICIALES (SEED) — Catálogo base
-- ============================================================

-- Disfraces de ejemplo
INSERT INTO disfraces (nombre, danza, talla, precio_base, precio_temporada_alta, stock_total, stock_disponible) VALUES
  ('Diablada Puneña',     'Diablada',  'S',  80, 120, 3, 3),
  ('Diablada Puneña',     'Diablada',  'M',  80, 120, 5, 5),
  ('Diablada Puneña',     'Diablada',  'L',  80, 120, 4, 4),
  ('Caporales',           'Caporales', 'M',  70, 110, 4, 4),
  ('Caporales',           'Caporales', 'L',  70, 110, 3, 3),
  ('Morenada',            'Morenada',  'M',  75, 115, 3, 3),
  ('Marinera Norteña',    'Marinera',  'S',  60,  90, 2, 2),
  ('Marinera Norteña',    'Marinera',  'M',  60,  90, 3, 3),
  ('Sikuri',              'Sikuri',    'Único', 50, 75, 2, 2);

-- Piezas de la Diablada (aplica a todas las tallas)
WITH diabladas AS (
  SELECT id FROM disfraces WHERE danza = 'Diablada'
)
INSERT INTO piezas_disfraz (disfraz_id, nombre, orden)
SELECT d.id, p.nombre, p.orden
FROM diabladas d
CROSS JOIN (VALUES
  ('Máscara',   1),
  ('Capa',      2),
  ('Pechera',   3),
  ('Pantalón',  4),
  ('Guantes',   5),
  ('Botines',   6)
) AS p(nombre, orden);

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
-- Próximos pasos después de ejecutar este SQL:
-- 1. Crear bucket "fotos-dni" y "fotos-disfraces" en Supabase Storage
-- 2. Configurar autenticación (Email) en Supabase Auth
-- 3. Desplegar Edge Functions (ver archivos en /supabase/functions/)
-- 4. Configurar pg_cron para el job diario de WhatsApp
-- ============================================================
