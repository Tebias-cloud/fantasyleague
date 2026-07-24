# LoL Fantasy League & Standings Tracker

Fantasy League es una aplicación full-stack construida con **Next.js 15 (React 19)**, **Supabase (PostgreSQL)** y la **API de Riot Games** que permite crear salas de competencia personalizadas (lobbies) para rastrear y comparar la evolución de los puntos de liga (LP - League Points) de diferentes invocadores en tiempo real.

---

## 🛠️ Stack Tecnológico

* **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) con React 19.
* **Base de Datos:** [Supabase](https://supabase.com/) & PostgreSQL.
* **Estilado:** [Tailwind CSS v4](https://tailwindcss.com/) & Lucide React.
* **Visualización de Datos:** [Recharts](https://recharts.org/) (gráficos de líneas interactivos).
* **Lenguaje:** TypeScript.

---

## 📡 Integración con Riot Games API

El sistema utiliza tres APIs oficiales de Riot Games de manera secuencial para procesar y validar un invocador (`gameName#tagLine`):
1. **Account-V1 (`/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`):** Traduce el nombre e identificador público en un identificador único global de Riot (`puuid`). El clúster regional de consulta (`americas`, `europe`, `asia`, `sea`) se asigna mediante la función `getRouteByTag` en [lib/riot-api.ts](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/lib/riot-api.ts).
2. **Summoner-V4 (`/lol/summoner/v4/summoners/by-puuid/{puuid}`):** Obtiene el identificador interno del invocador y el `profileIconId` utilizando la plataforma correspondiente (ej. `la2` para LAS).
3. **League-V4 (`/lol/league/v4/entries/by-puuid/{puuid}`):** Recupera las estadísticas competitivas para la cola de emparejamiento clasificada SoloQ (`RANKED_SOLO_5x5`). Si el invocador no posee clasificación, se le asigna el estado `UNRANKED` con 0 LP.
4. **Match-V5 (`/lol/match/v5/matches/by-puuid/{puuid}/ids` y `/lol/match/v5/matches/{matchId}`):** Consulta las 5 partidas más recientes del invocador para calcular estadísticas promedio de KDA, cs/min, duración y construir la lista de participantes de la partida en el frontend.

---

## 📊 Arquitectura de Base de Datos (Supabase)

La persistencia de datos utiliza PostgreSQL con la siguiente estructura de tablas definidas en [001_initial_schema.sql](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/supabase/migrations/001_initial_schema.sql):

### 1. `public.lobbies`
Almacena la configuración de cada sala de competencia.
* `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
* `name` (TEXT, no nulo)
* `start_date` (TIMESTAMPTZ, no nulo)
* `end_date` (TIMESTAMPTZ, no nulo)
* `settings` (JSONB, por defecto `{}`)
* `active` (BOOLEAN, por defecto `true`)

### 2. `public.players`
Caché de perfiles de invocadores.
* `puuid` (TEXT, Primary Key)
* `game_name` (TEXT, no nulo)
* `tag_line` (TEXT, no nulo)
* `profile_icon_id` (INTEGER, opcional en DB, modificado en el frontend)

### 3. `public.lobby_players`
Tabla pivote que vincula invocadores a lobbies específicos y almacena las estadísticas con las que el jugador se inscribió en el torneo (baseline).
* `lobby_id` (UUID, FK a `public.lobbies`, ON DELETE CASCADE)
* `player_puuid` (TEXT, FK a `public.players`, ON DELETE CASCADE)
* `start_absolute_lp` (INTEGER, no nulo)
* `start_wins` (INTEGER, no nulo)
* `start_losses` (INTEGER, no nulo)
* *Primary Key:* (`lobby_id`, `player_puuid`)

### 4. `public.player_snapshots`
Historial de evolución de puntos y estadísticas de cada invocador. Alimenta los gráficos de evolución de LP.
* `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
* `player_puuid` (TEXT, FK a `public.players`, ON DELETE CASCADE)
* `tier` (TEXT, no nulo)
* `division` (TEXT, no nulo)
* `lp` (INTEGER, no nulo)
* `total_wins` (INTEGER, no nulo)
* `total_losses` (INTEGER, no nulo)
* `created_at` (TIMESTAMPTZ, por defecto `now()`)

---

## ⚙️ Configuración e Instalación Local

### 1. Requisitos Previos
* Node.js v18 o superior.
* Una cuenta de Supabase con un proyecto activo.
* Una clave de API de Riot Games (RGAPI).

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto con la siguiente configuración:
```env
# Riot Games API Key
RIOT_API_KEY=tu_riot_api_key_aqui

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_project_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key_aqui
```

### 4. Inicialización de la Base de Datos
Aplica el archivo de migración ubicado en `supabase/migrations/001_initial_schema.sql` mediante el editor de SQL de Supabase para generar las tablas, índices y políticas RLS.

### 5. Semillas e Inicialización de Pruebas
El repositorio cuenta con scripts para inicializar y poblar lobbies de prueba con datos simulados o reales obtenidos de la API de Riot:
* **Poblar con jugadores reales:**
  ```bash
  npx ts-node seed-pro-lobby.ts
  ```
  *(Requiere configuración correcta de variables de entorno y API key activa).*
* **Crear sala multidivisión variada:**
  ```bash
  npx ts-node seed-varied-lobby.ts
  ```
* **Actualizar un lobby específico con historial realista:**
  Edita la variable `LOBBY_ID` en `seed-realistic-history.ts` y ejecuta:
  ```bash
  npx ts-node seed-realistic-history.ts
  ```

---

## 📂 Estructura del Proyecto

* **[app/](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/app/):** Rutas de Next.js.
  * **[actions/](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/app/actions/):** Server Actions para comunicación con la base de datos y la API de Riot Games.
  * **[lobbies/](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/app/lobbies/):** Páginas y rutas dinámicas para la visualización de salas de juego.
* **[components/](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/components/):** Componentes visuales y de interacción.
  * **[CreateLobbyForm.tsx](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/components/CreateLobbyForm.tsx):** Formulario de creación de salas en dos pasos.
  * **[LeaderboardTable.tsx](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/components/LeaderboardTable.tsx):** Clasificación del lobby, detalles de partidas e integración de subcomponentes.
  * **[GlobalChart.tsx](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/components/GlobalChart.tsx):** Comparador de la evolución de LP absoluto con filtros de liga y rangos de tiempo.
* **[lib/](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/lib/):** Lógica y utilitarios del sistema.
  * **[agent-simulator.ts](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/lib/agent-simulator.ts):** Motor estocástico local para generar trayectorias ficticias de LP simulando rachas de victorias y tilt.
  * **[riot-api.ts](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/lib/riot-api.ts):** Implementación del cliente de integración de Riot Games.

---

## ⚠️ Limitaciones y Deuda Técnica Identificada

1. **Duplicidad del cálculo de LP Absoluto:** Existen dos funciones `calculateAbsoluteLP` en el proyecto. Una en [lib/riot-api.ts](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/lib/riot-api.ts#L27-L57) (la cual unifica Master, Grandmaster y Challenger bajo la misma base de 2800 LP) y otra en [lib/utils/lp-calculator.ts](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/lib/utils/lp-calculator.ts#L26-L40) (que asigna bases incrementales: 2800, 3500 y 4500 LP respectivamente). Esta última es código muerto.
2. **Escritura Permisiva (Bypass de RLS):** Aunque la base de datos declara políticas RLS de seguridad, las mutaciones se ejecutan mediante Server Actions que usan `SUPABASE_SERVICE_ROLE_KEY`. Esto deshabilita de manera efectiva la seguridad RLS para inserciones y actualizaciones, permitiendo que cualquier usuario anónimo cree o elimine recursos si conoce el ID.
3. **Dependencia Crítica del Rate Limit de Riot:** El refresco del lobby en `refreshLobbyPlayers` realiza llamadas consecutivas a la API de Riot con esperas de 150ms. Lobbies con más de 20 jugadores superarán frecuentemente el límite de peticiones de una clave de desarrollo (Development Key), lo que resulta en respuestas HTTP 429.
4. **Falta de Persistencia de Partidas:** Los últimos 5 emparejamientos de cada jugador se cargan directamente de Riot en cada renderizado interactivo (al expandir la fila) y no se guardan en la base de datos de Supabase, aumentando la latencia y la tasa de peticiones a la API externa.
5. **Tipos Desincronizados:** Los tipos auto-generados en [types/database.types.ts](file:///c:/Users/Esteban/Desktop/proyectosT/fantasyleague/types/database.types.ts) usan nombres en mayúscula y no están asignados en la inicialización del cliente de Supabase en `lib/supabase.ts`.
