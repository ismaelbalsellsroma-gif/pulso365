# Fichaje SaaS

SaaS independiente de **fichaje** (control horario) para hostelería:
bares, restaurantes, cafeterías y hoteles. Totalmente separado de
`pulso365` — son dos productos que eventualmente se podrán conectar,
pero hoy viven por su cuenta.

Este repo contiene solo **F1 (modelo de datos)** y **F2 (fichaje
reforzado)** del roadmap inicial. Los módulos de turnos, cuadrantes con
IA, reportes avanzados y landing comercial completa llegarán en fases
posteriores.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** (sin preset de shadcn — primitivos mínimos propios)
- **Supabase** (Postgres + Auth + RLS + Storage)
- **React Query** para cache y mutaciones
- **date-fns**, **lucide-react**, **sonner** (toasts)

## Qué hay construido

### F1 — Modelo de datos

`supabase/migrations/20260415000000_init_fichaje.sql` contiene todo el
esquema inicial multi-tenant:

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant. Cada cuenta = una organización. |
| `profiles` | 1:1 con `auth.users`, rol (`admin`/`manager`/`employee`) y `organization_id`. |
| `locations` | Multi-local, con coordenadas y radio de geofence. |
| `employees` | Personal. PIN de 4-6 dígitos para kiosco. Puede vincularse a un `profile`. |
| `labor_rules` | Reglas globales: máx. horas/día, descansos, geofence obligatorio, foto obligatoria. |
| `fichajes` | Sesiones de trabajo (entrada/salida/pausas). Geolocalización, foto, auditoría. |
| `fichaje_breaks` | Pausas dentro de una jornada. |
| `fichaje_audit` | Historial de ediciones. |

**Helpers** incluidos: `current_org_id()`, `current_role_name()`,
`is_org_manager()`, trigger `handle_new_user()` que crea el `profile`
en signup, triggers `updated_at`.

**RLS** activada en todas las tablas. Lectura por `organization_id`,
escritura por rol. Los empleados pueden ver/editar solo sus propios
fichajes; los managers ven/editan todo lo de su organización.

### F2 — Fichaje reforzado

Pantallas implementadas:

- **`/` Landing comercial** — hero, features, precios, CTAs.
- **`/auth` Signin / Signup** — crea organización + `labor_rules` por defecto al registrarse.
- **`/app` Dashboard** — KPIs en vivo, accesos rápidos por rol.
- **`/app/my-clock` Mi fichaje** *(empleado)*
  - Reloj grande en vivo
  - Botones "Fichar entrada", "Pausa", "Volver de pausa", "Fichar salida"
  - Geolocalización automática + chequeo de geofence (rechaza si el rule está activo)
  - Captura de foto opcional vía `navigator.mediaDevices.getUserMedia`
  - Historial del día, KPIs (horas trabajadas, contrato, turnos)
  - Registro del `user_agent` y coordenadas para trazabilidad
- **`/app/fichaje` Fichajes en vivo** *(manager)*
  - Dashboard real-time con refetch cada 15s
  - Estado por empleado: trabajando / pausa / ha salido / no ha fichado
  - Aviso rojo si hay fichajes fuera del geofence
  - KPIs: trabajando ahora, en pausa, horas del día, coste laboral
- **`/kiosco` Modo kiosco** *(tablet compartida)*
  - Reloj fullscreen oscuro
  - PIN pad numérico 4-6 dígitos
  - Una sola vista: entrada, pausa, volver de pausa, salida
  - Se asocia a una organización + local vía slug
  - Funciona en cualquier dispositivo: tablet en el mostrador, móvil, etc.
- **`/app/empleados`** — CRUD de empleados, asignación de PIN, coste/h, contrato, local principal, color de avatar.
- **`/app/locales`** — CRUD de locales con captura de coordenadas "Usar mi ubicación actual" + radio de geofence.
- **`/app/ajustes`** — Configuración de la organización y `labor_rules` (máx. horas, descansos, tolerancias, toggles de geofence y foto).

### Seguridad anti-fraude

- Coordenadas GPS guardadas en cada fichaje (entrada y salida).
- Comparación con coordenadas del local → flag `within_geofence` y `distance_from_location_m`.
- `user_agent` y foto opcional guardados para trazabilidad.
- Kiosco con PIN numérico — nadie puede fichar sin PIN válido.
- Auditoría centralizada en `fichaje_audit` (cualquier edición manual queda registrada; F2 deja la tabla lista, la UI de edición manual de fichajes llega en una fase posterior).

## Puesta en marcha

```bash
cd fichaje-saas
cp .env.example .env
# Edita .env con las credenciales de un proyecto Supabase NUEVO
# (independiente del de pulso365)

npm install
npm run dev
```

Abre http://localhost:5174

### Preparar Supabase

1. Crea un proyecto Supabase nuevo.
2. Ejecuta la migración de `supabase/migrations/20260415000000_init_fichaje.sql`:
   ```bash
   # Opción A: con CLI
   supabase db push
   # Opción B: copia y pega el SQL en el SQL editor del dashboard de Supabase
   ```
3. Crea el bucket de Storage **`fichaje-photos`** (público) para las
   fotos anti-fraude:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('fichaje-photos', 'fichaje-photos', true)
   on conflict (id) do nothing;
   ```
4. Arranca la app y regístrate como admin: al hacer signup se crea la
   organización, se asocia al profile y se insertan las `labor_rules`
   por defecto.

### Flujo recomendado primera vez

1. Regístrate en `/auth` con un email y una contraseña, y pon el
   nombre de tu local (ej. "Bar La Plaza"). Te convierte en admin.
2. Entra en `/app/locales` y crea un local. Pulsa "Usar mi ubicación
   actual" para capturar coordenadas (si estás en el local).
3. Entra en `/app/empleados` y crea 2-3 empleados. El sistema genera
   un PIN aleatorio — cámbialo si quieres. Asigna el local principal.
4. Opcional: entra en `/app/ajustes` y activa "Requerir geofence" y
   "Requerir foto".
5. Abre `/kiosco` en una tablet (o en otra pestaña). Introduce el slug
   de la organización (lo ves en `/app/ajustes`). A partir de ahí, los
   empleados fichean con PIN.
6. Como manager, ve a `/app/fichaje` para ver el estado en vivo.

## Notas técnicas

- El **modo kiosco** requiere por ahora una sesión Supabase (la RLS
  exige un `profile` con `organization_id`). En producción
  recomendamos crear un usuario "kiosk@tu-org.com" con rol `manager`
  cuya sesión quede persistida en la tablet. Una siguiente iteración
  moverá esta lógica a una Edge Function `kiosk-clock` con service
  role para eliminar la dependencia.
- El hook `useGeolocation` pide permisos bajo demanda y mantiene un
  estado idle / loading / ok / denied / unavailable.
- La **fórmula de Haversine** en `src/lib/geo.ts` calcula la distancia
  entre el empleado y el local; el radio efectivo añade la precisión
  del GPS (máx. 100m) para no penalizar dispositivos con mala señal.
- El reloj en vivo de `MyClockPage` usa un `setInterval` de 1s que
  recalcula los minutos trabajados en cliente — no consulta Supabase.

## Lo que NO está (y llegará después)

- Cuadrantes, plantillas de turno, intercambios, open shifts.
- IA para generación de cuadrantes (F4 del plan original).
- Reportes exportables a PDF/CSV.
- Integraciones con POS, nómina, WhatsApp.
- Ausencias y vacaciones.
- Notificaciones push / email.
- Gestión de incidencias y edición manual guiada de fichajes.
- Tests automatizados.

## Roadmap inmediato

1. **F3** — Cuadrantes con drag & drop (vista semanal y mensual).
2. **F4** — Motor de IA para sugerir y generar cuadrantes.
3. **F5** — Reportes, exportaciones, landing pública completa.
