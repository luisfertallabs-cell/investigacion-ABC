export default function Setup({ database }: { database?: boolean }) {
  return (
    <div className="splash">
      <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
        <img src="./logo.png" alt="Centro Médico ABC" style={{ width: 140, marginBottom: 20 }} />
        <h2>{database ? 'Base de datos pendiente' : 'Configuración pendiente'}</h2>
        <p className="muted small" style={{ marginTop: 8 }}>
          {database
            ? 'Aplica las migraciones de Supabase y recarga la página.'
            : 'Agrega los secrets SUPABASE_URL y SUPABASE_ANON_KEY en GitHub Actions y vuelve a desplegar.'}
        </p>
      </div>
    </div>
  )
}
