import Link from 'next/link';
export const metadata = { title: 'Términos · FantasyLeague' };
export default function TermsPage() {
  return <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
    <article className="max-w-2xl mx-auto space-y-5 text-sm leading-7 text-slate-300">
      <Link href="/" className="text-emerald-300 hover:underline">← Inicio</Link>
      <h1 className="text-4xl font-bold text-white">Términos del servicio · MVP</h1>
      <p><strong className="text-amber-200">Borrador para revisión.</strong> El prototipo permite desafíos amistosos de SoloQ sin dinero, premios ni apuestas.</p>
      <h2 className="text-xl font-semibold text-white">Reglas de la competición</h2>
      <p>Las salas duran 7, 14 o 30 días y tienen entre 2 y 20 participantes. El ranking depende de los LP ganados desde el registro de cada jugador (LP actual menos LP de inicio), no del rango absoluto. Solo cuentan partidas de SoloQ de League of Legends.</p>
      <h2 className="text-xl font-semibold text-white">Participación e identidad</h2>
      <p>Los participantes introducen su Riot ID y servidor; no deben inscribir a terceros sin autorización. En el MVP el Riot ID declarado no garantiza propiedad de la cuenta; se requiere una solución de verificación antes de admitir premios o competiciones con implicaciones económicas.</p>
      <h2 className="text-xl font-semibold text-white">Sin afiliación</h2>
      <p>FantasyLeague es un producto independiente, no avalado ni patrocinado por Riot Games. League of Legends y Riot Games son marcas de sus respectivos titulares.</p>
      <h2 className="text-xl font-semibold text-white">Disponibilidad</h2>
      <p>La demo pública usa datos simulados. El acceso a datos reales depende de Riot Games API y se habilitará públicamente únicamente con aprobación de producción. Los detalles legales definitivos y la información de contacto deberán revisarse antes del lanzamiento.</p>
    </article>
  </main>;
}
