# Investigación ABC: contexto para agentes

Plataforma web para residentes de cirugía del Centro Médico ABC (hospital privado, México). Sirve para construir bases de datos de pacientes con variables definidas por coordinación, dar seguimiento a proyectos de investigación con tareas y fechas límite, y consultar congresos de cirugía general y subespecialidades.

Lee este documento completo antes de modificar el proyecto.

## 1. Objetivo y usuarios

| Rol | Qué hace |
| --- | --- |
| Residente | Se registra, define especialidad y subespecialidad, acepta invitaciones o solicita unirse a proyectos abiertos, captura pacientes, marca tareas como hechas, consulta congresos. |
| Coordinador | Todo lo anterior, más crear y editar proyectos, definir variables, generar el plan de trabajo, invitar residentes, aceptar solicitudes, administrar congresos y asignar roles. |

Todo usuario nuevo es `residente`. El rol solo lo cambia un coordinador (pantalla Equipo) o el SQL Editor de Supabase.

## 2. Principios de diseño (obligatorios)

1. Sencillo, formal, minimalista. Solo el texto absolutamente necesario.
2. En textos visibles de la interfaz **no usar** viñetas o puntos medios, guiones largos (U+2014), guiones cortos (U+2013) ni guiones como separadores. Para separar datos usar comas o el conector "al" en rangos de fechas (`12 al 15 jun 2027`).
3. Español de México. Fechas con `toLocaleDateString('es-MX')`.
4. Transiciones suaves y relajantes: curva `--ease` (`cubic-bezier(0.22, 0.61, 0.36, 1)`), duraciones de 0.35 a 0.6 s, animación `rise` al cambiar de página, `stagger` en listas. Respetar `prefers-reduced-motion`.
5. Paleta tomada del logo: azul `#0072CE`, profundo `#0B4F8A`. Tipografías: Libre Caslon Text (títulos `h1`, evoca el logotipo) e Inter (interfaz).
6. Estados de urgencia por color: vencido (rojo), 7 días o menos (ámbar), resto neutro.
7. Escritorio con barra lateral; móvil con barra inferior flotante de 5 pestañas.
8. Nunca pedir ni guardar nombre o expediente del paciente: solo **folio** (LFPDPPP).

## 3. Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Node 22, React 18, TypeScript estricto, Vite 5, React Router 6 (`HashRouter`) |
| Estilos | CSS propio en `src/styles.css` con variables, sin framework |
| Backend | Supabase (Postgres, Auth con correo y contraseña, RLS) vía `@supabase/supabase-js` |
| Hosting | GitHub Pages con GitHub Actions |

`HashRouter` y `base: './'` en Vite permiten servir el sitio en `https://usuario.github.io/repositorio/` sin configurar rutas ni 404.

Supabase Auth usa `flowType: 'pkce'`: los enlaces de correo regresan con `?code=` (query string) y no chocan con el hash del router. La URL de redirección es la raíz del sitio sin hash (`appUrl()` en `src/lib/supabase.ts`).

## 4. Estructura

```
index.html                     favicon, fuentes, raíz
public/                        logo.png, favicon.ico, favicon.png, apple-touch-icon.png, icon-512.png
src/main.tsx                   providers: HashRouter, AuthProvider, ToastProvider
src/App.tsx                    enrutamiento y guardas (config, sesión, perfil completo, rol)
src/styles.css                 sistema de diseño completo
src/lib/supabase.ts            cliente y appUrl()
src/lib/auth.tsx               sesión, perfil, catálogo de especialidades, recuperación de contraseña
src/lib/data.ts                consultas comunes y lógica de recomendación (matchesUser)
src/lib/directory.ts           directorio de personas vía RPC directory() con caché
src/lib/catalog.ts             etiquetas, catálogo de variables quirúrgicas, generador de plan
src/lib/format.ts              fechas, días restantes, urgencia, slug de variables
src/lib/types.ts               tipos de las tablas
src/components/ui.tsx          Modal, Toast, Field, Segmented, Deadline, DateBox, Progress, Skeleton, Empty
src/components/Layout.tsx      barra lateral, barra móvil, contadores de pendientes
src/components/TaskItem.tsx    tarea con casilla, fecha, pasos desplegables
src/components/ProfileSteps.tsx pasos de datos personales y residencia (registro, onboarding, perfil)
src/components/project/        PlanTab, DataTab, VariablesTab, TeamTab
src/pages/                     Login, Register, Recover, UpdatePassword, Onboarding, Setup,
                               Dashboard, Projects, ProjectDetail, ProjectEditor, Tasks,
                               Congresses, Profile, Team
supabase/migrations/           esquema, RLS y catálogos
.github/workflows/             deploy.yml (Pages) y supabase-migrations.yml (manual)
```

## 5. Flujo de usuario

1. **Registro** en 3 pasos con barra de progreso: cuenta (correo, contraseña de 8 o más), sobre ti (nombre completo, género, fecha de nacimiento), residencia (especialidad, subespecialidad opcional, año R1 a R6). Los datos viajan en `options.data` de `signUp` y el trigger `handle_new_user` crea el perfil, así funciona aunque la confirmación por correo esté activa.
2. Si un perfil está incompleto se muestra **Onboarding** antes de entrar.
3. **Inicio**: saludo, tres métricas (tareas pendientes, proyectos, días para el siguiente envío), invitaciones con aceptar o rechazar, próximas 5 tareas y recomendaciones "Para ti" (congresos y proyectos abiertos de su área).
4. **Proyectos**: pestañas Mis proyectos, Disponibles (ordenados por afinidad) y Todos (coordinador). Cada tarjeta muestra estado, avance del plan y la siguiente fecha.
5. **Detalle de proyecto**: introducción, congreso objetivo con fecha de envío, muestra meta. Quien no participa ve aceptar o rechazar (invitación), retirar (solicitud) o "Me interesa" (proyecto abierto). Integrantes y coordinadores ven pestañas:
   1. Plan: etapas con fecha límite, responsable y pasos a seguir (una línea por paso).
   2. Base de datos: captura por folio con formulario generado desde las variables, validación de obligatorios y tipos, búsqueda, avance contra muestra meta y exportación CSV (UTF 8 con BOM, compatible con Excel, SPSS, R).
   3. Variables: catálogo quirúrgico precargado (demografía, cirugía, desenlaces) y variables personalizadas; reordenables.
   4. Equipo: integrantes; el coordinador invita (residentes afines primero) y acepta solicitudes.
6. **Nuevo proyecto** (coordinador): al crear puede generar un plan de 7 etapas distribuido desde hoy hasta la fecha de envío (si eligió congreso, se toma su fecha límite). Después redirige a Variables.
7. **Tareas**: agrupadas en Vencidas, Esta semana, Próximas y Completadas; filtro por proyecto; el coordinador alterna Mías o Todas.
8. **Congresos**: Convocatorias abiertas (por fecha límite), Próximos y Pasados; filtro "Mi área"; etiqueta "Por confirmar" cuando la fuente no es oficial.
9. **Perfil**: editar datos y residencia (afecta recomendaciones), salir.
10. **Equipo** (coordinador): tabla con año, especialidad, género, edad y selector de rol.

### Lógica de recomendación

`matchesUser(target, spec, sub)` en `src/lib/data.ts`: es afín si el área del elemento coincide con la especialidad o subespecialidad del usuario; si el usuario no tiene subespecialidad, también cualquier subespecialidad de su especialidad.

## 6. Base de datos

Migraciones en `supabase/migrations/` (orden por nombre):

1. `20261110000001_esquema_inicial.sql`: tipos, tablas, funciones, triggers, RLS.
2. `20261110000002_catalogos.sql`: especialidades, subespecialidades y congresos iniciales.

### Tablas

| Tabla | Propósito |
| --- | --- |
| `specialties` | Especialidades (`parent_id` nulo) y subespecialidades |
| `profiles` | 1 a 1 con `auth.users`: nombre, género, nacimiento, especialidad, subespecialidad, año, rol |
| `congresses` | Nombre, siglas, sociedad, área, sede, fechas, fecha límite de envío, URL, `confirmed` |
| `projects` | Título, introducción, diseño, área, congreso objetivo, muestra meta, estado |
| `project_members` | Relación usuario proyecto con estado `invitado`, `solicitado`, `aceptado`, `rechazado` |
| `project_variables` | Variables por proyecto: `key` (snake_case), etiqueta, tipo, opciones, unidad, obligatoria, posición |
| `project_tasks` | Plan: título, pasos (`description`, una línea por paso), fecha límite, responsable opcional, `done_at` |
| `records` | Pacientes: `folio` único por proyecto y `data jsonb` con llaves iguales a `project_variables.key` |

Tipos de variable: `texto`, `numero`, `entero`, `fecha`, `si_no`, `opcion`, `multiple`.

### Seguridad (RLS activo en todas las tablas)

Funciones `security definer`: `is_coordinator()`, `is_member(project)` (aceptado), `has_any_link(project)`.

| Tabla | Lectura | Escritura |
| --- | --- | --- |
| `specialties` | anon y autenticados | coordinador |
| `profiles` | titular y coordinador (protege género y nacimiento) | titular o coordinador; trigger impide cambiar `role` salvo coordinador |
| `directory()` RPC | autenticados: solo id, nombre, especialidad, año, rol | no aplica |
| `congresses` | autenticados | coordinador |
| `projects` | coordinador, proyectos abiertos, o vinculados | coordinador |
| `project_members` | propio, coordinador o integrantes del proyecto | coordinador invita; residente solo puede insertar `solicitado` en proyecto abierto; trigger: residente solo pasa de `invitado` a `aceptado` o `rechazado` |
| `project_variables` | coordinador, vinculados o proyecto abierto | coordinador |
| `project_tasks` | coordinador o integrante | coordinador crea, edita, borra; integrante solo cambia `done_at` (trigger) |
| `records` | coordinador o integrante | integrante o coordinador; `created_by` forzado a `auth.uid()`; borrar solo autor o coordinador |

Los triggers permiten todo cuando `auth.uid()` es nulo (SQL Editor o service role), lo que hace posible promover al primer coordinador.

Las políticas se probaron en Postgres 16 con un esquema `auth` simulado: escalamiento de rol, autoaceptación, lectura cruzada de registros y suplantación de autor quedan bloqueados.

### Agregar una migración

Crear `supabase/migrations/AAAAMMDDHHMMSS_descripcion.sql`, con RLS para toda tabla nueva, y ejecutar el workflow "Supabase migraciones" o `supabase db push`.

## 7. Despliegue

### Secrets de GitHub Actions (Settings, Secrets and variables, Actions)

| Secret | Uso |
| --- | --- |
| `SUPABASE_URL` | Build del frontend (`VITE_SUPABASE_URL`) |
| `SUPABASE_ANON_KEY` | Build del frontend (`VITE_SUPABASE_ANON_KEY`); es pública por diseño, la protección es RLS |
| `SUPABASE_ACCESS_TOKEN` | Workflow de migraciones (token personal de supabase.com) |
| `SUPABASE_DB_PASSWORD` | Workflow de migraciones |
| `SUPABASE_PROJECT_ID` | Workflow de migraciones (referencia del proyecto, ej. `abcdxyz`) |

Nunca usar la `service_role` key en el frontend.

### Workflows

1. `deploy.yml`: en push a `main` o manual. `npm ci`, `npm run build` con los secrets, publica `dist` en Pages. Requiere Settings, Pages, Source: **GitHub Actions**.
2. `supabase-migrations.yml`: solo manual; `supabase link` y `supabase db push`.

Si faltan los secrets, el sitio muestra la pantalla `Setup`.

### Supabase Auth

En Authentication, URL Configuration: Site URL y Redirect URLs con la URL de GitHub Pages (ej. `https://usuario.github.io/investigacion-ABC/`).

## 8. Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar URL y anon key
npm run dev
npm run build                 # typecheck y build
```

## 9. Pendientes sugeridos

1. Notificaciones por correo de invitaciones y tareas próximas (Edge Function con cron).
2. Validación de `records.data` contra `project_variables` en base de datos.
3. Bitácora de auditoría de cambios en registros.
4. Revisar fechas de congresos marcados "Por confirmar" (ASMBS 2027) y agregar fechas límite de envío cuando se publiquen.
