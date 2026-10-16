import Link from 'next/link';
export const metadata = { title: 'Privacidad · FantasyLeague' };
export default function PrivacyPage() {
  return <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
    <article className="max-w-2xl mx-auto space-y-5 text-sm leading-7 text-slate-300">
      <Link href="/" className="text-emerald-300 hover:underline">← Inicio</Link>
      <h1 className="text-4xl font-bold text-white">Política de privacidad · MVP</h1>
      <p><strong className="text-amber-200">Borrador previo al lanzamiento.</strong> La demo pública usa únicamente datos ficticios locales al navegador y no consulta Riot Games.</p>
      <h2 className="text-xl font-semibold text-white">Datos del producto real</h2>
      <p>Si se activa el servicio, FantasyLeague utilizará Supabase para gestionar cuentas (correo de acceso), lobbies e invitaciones y almacenará Riot ID, servidor elegido, identificador de jugador, puntos de liga, resultados SoloQ y su historial para mostrar la evolución en las salas.</p>
      <h2 className="text-xl font-semibold text-white">Finalidad y visibilidad</h2>
      <p>Los datos permitirán inscribirse, gestionar competiciones y calcular variaciones de LP. Las salas públicas y sus rankings son visibles; los detalles de salas privadas se mostrarán mediante invitación. Una invitación debe tratarse como un enlace confidencial.</p>
      <h2 className="text-xl font-semibold text-white">Proveedores y seguridad</h2>
      <p>El proyecto utiliza servicios de alojamiento y base de datos, como Vercel y Supabase, y las APIs oficiales de Riot Games cuando están habilitadas. Las claves privadas se mantienen en el servidor. No se solicitan contraseñas de Riot.</p>
      <h2 className="text-xl font-semibold text-white">Tus derechos</h2>
      <p>Antes del lanzamiento público se habilitará un mecanismo verificable de consulta, corrección o eliminación de datos de la cuenta. Mientras tanto, la aplicación permanecerá como prototipo sin acceso público a datos reales.</p>
      <p>Información del responsable, correo de contacto, períodos concretos de retención y jurisdicción: pendientes de confirmar antes de solicitar aprobación de producción.</p>
    </article>
  </main>;
}
