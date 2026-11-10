export default function Setup() {
  return (
    <div className="splash">
      <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
        <img src="./logo.png" alt="Centro Médico ABC" style={{ width: 140, marginBottom: 20 }} />
        <h2>Configuración pendiente</h2>
        <p className="muted small" style={{ marginTop: 8 }}>
          Agrega los secrets SUPABASE_URL y SUPABASE_ANON_KEY en GitHub Actions y vuelve a desplegar.
        </p>
      </div>
    </div>
  )
}
