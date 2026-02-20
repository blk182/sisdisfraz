# 🎭 SisDisfraz Perú — Guía de Inicio

## Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Backend/BD**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Deploy**: Vercel (frontend) + Supabase Cloud (backend)
- **WhatsApp**: Twilio WhatsApp Business API

---

## Paso 1 — Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New Project
2. Nombre: `sisdisfraz-peru`
3. Contraseña de BD: guárdala en un lugar seguro
4. Región: **South America (São Paulo)** — la más cercana a Lima

---

## Paso 2 — Ejecutar el esquema de BD

1. En Supabase → **SQL Editor** → New Query
2. Pega el contenido completo de `supabase/migrations/001_schema_completo.sql`
3. Ejecuta → verifica que no haya errores

---

## Paso 3 — Configurar Storage (buckets)

En Supabase → **Storage** → New Bucket:

| Bucket         | Público | Para qué                        |
|----------------|---------|----------------------------------|
| `fotos-dni`    | ❌ No   | Fotos de DNI de clientes         |
| `fotos-daños`  | ❌ No   | Fotos de daños en devoluciones   |
| `fotos-disfraces` | ✅ Sí | Catálogo de trajes (público)    |

---

## Paso 4 — Configurar Autenticación

En Supabase → **Authentication** → Settings:
- **Site URL**: `https://tu-proyecto.vercel.app`
- Deshabilitar: Sign ups públicos (solo el admin crea usuarios)
- Habilitar: Email provider

Crear el primer usuario administrador:
```sql
-- En SQL Editor, después de crear el usuario desde Auth → Users:
INSERT INTO perfiles (id, nombre, rol)
VALUES ('<uuid-del-usuario>', 'Nombre del Dueño', 'administrador');
```

---

## Paso 5 — Crear proyecto Next.js

```bash
npx create-next-app@latest sisdisfraz \
  --typescript \
  --tailwind \
  --app \
  --src-dir

cd sisdisfraz

# Instalar Supabase
npm install @supabase/supabase-js @supabase/ssr

# Instalar Supabase CLI (para Edge Functions)
npm install -g supabase
```

---

## Paso 6 — Variables de entorno

Crear `.env.local` en la raíz del proyecto (NUNCA commitear este archivo):

```env
# Supabase — obtenlos en Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Solo para Edge Functions (nunca al frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Twilio WhatsApp (para Edge Function del scheduler)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## Paso 7 — Copiar archivos de este proyecto

```
src/
├── types/database.types.ts    ← Copia directo
├── lib/supabase.ts            ← Copia directo
└── hooks/                     ← Crea los hooks desde supabase.ts

supabase/
└── functions/
    └── registrar-alquiler/
        └── index.ts           ← Edge Function lista
```

---

## Paso 8 — Desplegar Edge Functions

```bash
# Inicializar Supabase CLI en el proyecto
supabase init
supabase login
supabase link --project-ref tu-project-ref

# Desplegar función
supabase functions deploy registrar-alquiler

# Configurar secrets de la función
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## Paso 9 — Job automático de WhatsApp (pg_cron)

En Supabase → SQL Editor:

```sql
-- Envía recordatorios cada día a las 9 AM hora Lima (UTC-5 = 14:00 UTC)
SELECT cron.schedule(
  'whatsapp-recordatorios-diarios',
  '0 14 * * *',   -- 9 AM Lima
  $$
    SELECT net.http_post(
      url := 'https://tu-project-ref.supabase.co/functions/v1/scheduler-whatsapp',
      headers := '{"Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

---

## Paso 10 — Deploy en Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard:
# Project Settings → Environment Variables
# Agrega las mismas variables de .env.local
```

---

## Estructura de archivos del proyecto

```
sisdisfraz/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Layout con sidebar + roles
│   │   │   ├── page.tsx            # Dashboard: alertas del día
│   │   │   ├── alquileres/
│   │   │   │   ├── page.tsx        # Lista alquileres activos
│   │   │   │   └── nuevo/page.tsx  # Wizard de nuevo alquiler
│   │   │   ├── devolucion/
│   │   │   │   └── page.tsx        # Checklist de devolución
│   │   │   ├── lavanderia/
│   │   │   │   └── page.tsx
│   │   │   ├── catalogo/
│   │   │   │   └── page.tsx
│   │   │   └── reportes/           # Solo admin
│   │   │       └── page.tsx
│   │   └── api/                    # API Routes si necesitas
│   ├── types/
│   │   └── database.types.ts       ← YA ESTÁ
│   ├── lib/
│   │   └── supabase.ts             ← YA ESTÁ
│   └── components/
│       ├── ui/                     # shadcn/ui components
│       ├── AlquilerWizard.tsx
│       ├── ChecklistPiezas.tsx
│       └── DashboardAlertas.tsx
├── supabase/
│   ├── migrations/
│   │   └── 001_schema_completo.sql ← YA ESTÁ
│   └── functions/
│       ├── registrar-alquiler/     ← YA ESTÁ
│       ├── procesar-devolucion/    ← Próximo paso
│       └── scheduler-whatsapp/    ← Próximo paso
└── .env.local                      ← Crear manualmente
```

---

## Orden de desarrollo sugerido

| Semana | Qué construir                                    |
|--------|--------------------------------------------------|
| 1      | BD + Auth + Dashboard con alertas del día        |
| 2      | Catálogo de disfraces + QR                       |
| 3      | Wizard de nuevo alquiler (flujo completo)        |
| 4      | Devolución + checklist de piezas + fotos         |
| 5      | Lavandería + WhatsApp automático                 |
| 6      | Reportes + módulo de proveedores                 |
| 7      | Testing + ajustes + deploy producción            |

---

## Próximas Edge Functions a crear

- `procesar-devolucion` — checklist, cobros extra, envío a lavandería
- `scheduler-whatsapp` — job diario: recordatorios 24h, vencimientos, retrasos
- `buscar-proveedor` — gestión de solicitudes de búsqueda

¿Con cuál seguimos? 🚀
