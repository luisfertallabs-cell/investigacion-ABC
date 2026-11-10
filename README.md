# Investigación ABC

Plataforma de investigación para residentes de cirugía del Centro Médico ABC: bases de datos de pacientes por proyecto, tareas con fechas límite y calendario de congresos.

Contexto completo para agentes y desarrolladores en [AGENTS.md](AGENTS.md).

## Puesta en marcha

1. Crear un proyecto en Supabase.
2. Aplicar las migraciones de `supabase/migrations/` en orden, desde el SQL Editor o con el workflow **Supabase migraciones**.
3. En Supabase, Authentication, URL Configuration, agregar la URL de GitHub Pages como Site URL y Redirect URL.
4. En GitHub, Settings, Secrets and variables, Actions, crear:
   1. `SUPABASE_URL`
   2. `SUPABASE_ANON_KEY`
   3. `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` (solo para migraciones)
5. En GitHub, Settings, Pages, Source: **GitHub Actions**.
6. Hacer push a `main`.
7. Registrarse en el sitio y promover al primer coordinador en el SQL Editor:

```sql
update public.profiles set role = 'coordinador'
where id = (select id from auth.users where email = 'correo@ejemplo.com');
```

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```
