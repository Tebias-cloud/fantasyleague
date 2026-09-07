# LoL Fantasy League & Standings Tracker

Plataforma full-stack construida con **Next.js 16 (React 19)**, **Supabase (PostgreSQL con RLS)** y la **API oficial de Riot Games**. Permite crear salas de competición personalizadas (lobbies) para monitorear, comparar y rankear la evolución de Puntos de Liga (LP) y estadísticas de invocadores en tiempo real.

---

## 🛠️ Stack Tecnológico

* **Framework:** [Next.js 16 (App Router, Turbopack)](https://nextjs.org/) con React 19.
* **Autenticación & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, `@supabase/ssr` con cookies).
* **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) & Lucide React.
* **Visualización de Datos:** [Recharts](https://recharts.org/) (gráficos interactivos de evolución de LP individual y comparativa global).
* **Integración Externa:** [Riot Games API](https://developer.riotgames.com/) (Account-V1, Summoner-V4, League-V4, Match-V5).
* **Lenguaje:** TypeScript 5.

---

## 📡 Integración con Riot Games API

El sistema implementa un flujo secuencial con control de Rate Limit y mapeo regional:

1. **Account-V1 (`/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`):** Resuelve el Riot ID público (`Nombre#TAG`) al identificador único global (`puuid`).
2. **Summoner-V4 (`/lol/summoner/v4/summoners/by-puuid/{puuid}`):** Obtiene el perfil de invocador y el `profileIconId` según la plataforma del jugador.
3. **League-V4 (`/lol/league/v4/entries/by-puuid/{puuid}`):** Obtiene el rango oficial de SoloQ (`RANKED_SOLO_5x5`). Si el invocador no posee clasificación, se inicializa como `UNRANKED` con 0 LP.
4. **Match-V5 (`/lol/match/v5/matches/by-puuid/{puuid}/ids` y `/matches/{matchId}`):** Consulta partidas clasificatorias para computar métricas competitivas (KDA, CS, oro, racha de asesinatos, duración y participantes).

---

## 📊 Arquitectura de Base de Datos y Migraciones

La persistencia en PostgreSQL reside en `supabase/migrations/`:

* **`001_initial_schema.sql`:** Estructura base de tablas:
  * `lobbies`: Configuración de salas, fechas (`start_date`, `end_date`), estado activo y settings JSONB.
  * `players`: Caché de perfiles de invocadores (`puuid`, `game_name`, `tag_line`).
  * `lobby_players`: Tabla asociativa con el baseline permanente del torneo (`start_absolute_lp`, `start_wins`, `start_losses`).
  * `player_snapshots`: Serie temporal de Elo/LP para renderizar los gráficos de progreso.
* **`002_add_auth.sql`:** Propiedad de salas (`created_by UUID REFERENCES auth.users(id)`) e índice `idx_lobbies_created_by`.
* **`003_schema_fixes.sql`:** Integridad de datos (`chk_lobbies_dates`), soporte de iconos de invocador (`profile_icon_id`) e índices de rendimiento.
* **`004_rls_hardening.sql`:** Políticas de Row Level Security (RLS) estrictas: lectura pública para leaderboards y mutaciones exclusivas del creador o del backend.
* **`005_multiregion_competition_foundation.sql` (Preparada):**
  * Soporte multi-servidor (`players.platform`).
  * Baseline inmutable y prevención de reseteo (`joined_at`, `active`, `left_at`, `start_tier`, `start_division`, `start_lp`).
  * Watermark incremental (`last_match_at`) y tablas auditables para Match-V5 (`lobby_player_matches` y `lobby_player_stats`).
  * Constraints de duración (`chk_lobbies_min_duration`, `chk_lobbies_max_duration`) y compatibilidad SaaS (`plan_tier`).

---

## 🔐 Autenticación y Seguridad

* **Supabase SSR:** Gestión de sesiones mediante cookies seguras (`@supabase/ssr`) y `proxy.ts` (Next.js 16 Proxy Middleware).
* **Control de Acceso:** Solo usuarios autenticados pueden crear salas. Solo el propietario de una sala puede editar sus fechas, renombrarla, añadir participantes o refrescar estadísticas.
* **Service Role:** Operaciones de backend protegidas ejecutadas en Server Actions mediante cliente privilegiado de Supabase.

---

## ⚙️ Instalación y Configuración Local

### 1. Requisitos
* Node.js v20 o superior.
* Proyecto activo en Supabase.
* API Key válida de Riot Games (RGAPI).

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Variables de Entorno
Copia el archivo de ejemplo y completa tus credenciales:
```bash
cp .env.example .env.local
```

Configuración requerida en `.env.local`:
```env
# Riot Games API Key
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 4. Scripts de Desarrollo y Calidad
```bash
# Iniciar servidor de desarrollo
npm run dev

# Verificación de tipos TypeScript
npm run typecheck

# Compilación para producción
npm run build

# Linter
npm run lint
```

### 5. Scripts de Prueba y Semillas (Carpeta `scripts/`)
El repositorio incluye scripts utilitarios para poblar lobbies y simular evolución de partidas:
* **Poblar con jugadores reales:**
  ```bash
  npx ts-node scripts/seed-pro-lobby.ts
  ```
* **Crear sala con divisiones variadas:**
  ```bash
  npx ts-node scripts/seed-varied-lobby.ts
  ```
* **Generar historial realista simulado:**
  ```bash
  npx ts-node scripts/seed-realistic-history.ts
  ```

---

## 📂 Estructura del Repositorio

```text
├── app/
│   ├── actions/          # Server Actions (auth, lobbies, riot API)
│   ├── auth/             # Callbacks y confirmación de autenticación
│   ├── lobbies/          # Páginas de listado y detalle de sala [id]
│   ├── login/            # Flujo de inicio de sesión con Magic Link / OTP
│   ├── layout.tsx        # Layout raíz con tema oscuro y tipografía
│   └── page.tsx          # Landing page principal
├── components/           # Componentes React (Leaderboard, Charts, Forms, Admin)
├── lib/
│   ├── auth.ts           # Helpers de verificación de sesión en servidor
│   ├── riot-api.ts       # Cliente Riot API y cálculo de LP absoluto
│   └── supabase/         # Clientes de Supabase para cliente, servidor y proxy
├── proxy.ts              # Middleware Proxy de Next.js 16 para refresco de sesión
├── scripts/              # Scripts de simulación y seeding de base de datos
├── supabase/
│   └── migrations/       # Migraciones SQL versionadas (001 a 005)
└── types/
    └── database.types.ts # Definiciones de tipos generadas de Supabase
```
