# FantasyLeague · Solicitud de acceso de producción Riot Games

Estado: **MVP en revisión / sin publicación de datos reales**. Los enlaces a demo, dominio, contacto y textos legales definitivos deben validarse antes de presentar. Este documento NO representa una solicitud enviada ni aprobación de Riot.

## Resumen del producto (para el formulario del Developer Portal)

FantasyLeague es una plataforma web independiente para organizar desafíos amistosos de **League of Legends SoloQ**, inspirados en los formatos comunitarios SoloQChallenge. Un organizador inicia sesión y crea una competición de 7, 14 o 30 días, pública o accesible solo por invitación, para entre 2 y 20 jugadores. Los jugadores pueden ser de distintos servidores de Riot en una misma sala. El progreso de cada persona se mide por el cambio de LP desde su inscripción, con tabla de posiciones, rango, victorias, derrotas, partidas y gráficos históricos. La experiencia no modifica partidas ni determina decisiones dentro del juego, no crea una clasificación oficial alternativa y no incorpora premios, apuestas ni pagos.

### Para qué se solicita acceso
- Account-V1: resolver Riot ID (nombre + etiqueta) en un identificador de cuenta.
- Summoner-V4: consultar ícono de perfil.
- League-V4: obtener SoloQ actual (rango, división, LP, victorias, derrotas).
- Match-V5: consultar exclusivamente partidas de clasificación SoloQ (queue 420), con límites de velocidad y caché.
- Si Riot lo permite tras producción, solicitar Riot Sign On para verificar la identidad de los participantes, sin pedir contraseñas.

### Demostración comprobable sin API Key
- Página /demo: datos ficticios locales, selección de duración, visibilidad, distintos servidores, ranking de LP ganados, simulación de jornadas y registro ficticio de participante.
- La demo **no** obtiene datos Riot ni guarda información privada.
- El repositorio contiene además el flujo real de login Supabase y creación de lobbies, que necesita configurar un proyecto Supabase y aplicar migraciones antes de probarlo.

### Requisitos para enviar
1. Tener una URL accesible que muestre /demo, /legal/privacy, /legal/terms y el flujo de producto.
2. Revisar y completar responsable legal, correo de contacto, jurisdicción, retención y eliminación de datos en las páginas legales (ahora **borradores**).
3. Comprobar políticas de Riot, permiso de mostrar Riot IDs, consentimiento y tratamiento de jugadores.
4. Aportar capturas/video de creación de una sala, ingreso de un jugador, selección explícita de servidor y clasificación por diferencia de LP.
5. Explicar controles antiabuso y futuro vínculo Riot Sign On para identidad.
6. Enviar el formulario en https://developer.riotgames.com/; NO enviar una clave dentro del formulario y NO activar una beta pública con clave Development/Personal.

## Activación local de datos Riot para prueba privada
- `npm ci`, copiar `.env.example` a `.env.local`, configurar Supabase aparte de Joyas Fran.
- Aplicar migraciones **001–007 en orden**, comprobar RLS y activar autenticación por email en Supabase.
- Configurar `RIOT_API_KEY` **solo** como variable de entorno del servidor local; vence a las 24 horas.
- Probar un nombre y etiqueta Riot ID reales con **su servidor correcto elegido explícitamente**. El `#TAG` no indica región.
- Validar la incorporación, LP base inmutable, refresco autorizado, consultas de partidas queue=420 y no sobrepasar rate limits.
- No habilitar `RIOT_PRODUCTION_APPROVED=true` hasta que Riot apruebe producción.

## Definición del MVP y lo que aún falta validar
**Implementado en este PR:** crear sala 7/14/30 días, máximo 20, pública o privada por enlace con token hash, inscripción con login, selección de servidor, ranking ordenado por Δ LP, consulta de datos reales restringida a desarrollo local, demo sin Riot, borradores legales y CI.

**Bloqueos antes de lanzamiento real:** dominio y Supabase independientes, aplicar/validar migraciones en una base de prueba, completar páginas legales, pruebas de accesibilidad y recorrido móvil, protección contra consultas abusivas de Riot, actualización periódica en background, retención/eliminación, consentimiento verificable del dueño de un Riot ID (posible RSO) y validación con API Key vigente. La entrada con Riot ID en el MVP es **declarativa, no prueba titularidad**. No hay pagos ni premios.

## Fuentes normativas
- https://developer.riotgames.com/docs/portal
- https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications
- https://support-developer.riotgames.com/hc/en-us/articles/22698698001939-League-of-Legends
- https://support-developer.riotgames.com/hc/en-us/articles/22698591841939-General-Policies

FantasyLeague no está afiliado a Riot Games ni se presenta como ranking oficial.
