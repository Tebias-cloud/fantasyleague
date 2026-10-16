/**
 * Dev keys are for local development, never for publicly accessible previews.
 * The production switch may only be enabled after Riot approves the product.
 */
export function ensureLiveRiotAllowed() {
  if (!process.env.RIOT_API_KEY) {
    throw new Error('RIOT_KEY_MISSING: añade una clave Riot válida solo en el servidor.');
  }
  if (process.env.NODE_ENV !== 'development' && process.env.RIOT_PRODUCTION_APPROVED !== 'true') {
    throw new Error('RIOT_NOT_APPROVED: las consultas reales están desactivadas fuera del servidor de desarrollo local.');
  }
}
