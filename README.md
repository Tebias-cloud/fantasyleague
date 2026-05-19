# 🏟️ LoL Fantasy League & Leaderboard Evolution Analytics

¡Bienvenido a **Fantasy League**! Una aplicación full-stack de alto rendimiento construida con **Next.js 15 (App Router)**, **Supabase (PostgreSQL)** y la **API oficial de Riot Games**. 

Este proyecto está diseñado para rastrear, simular y analizar la evolución del LP (League Points) de los invocadores en tiempo real dentro de salas competitivas personalizadas, presentando una interfaz analítica premium e interactiva inspirada en los eSports.

---

## 🚀 Características Clave

### 📡 1. Integración Inteligente de la API de Riot Games
* **Enrutamiento Regional Automático:** Traduce invocadores `Nombre#Tag` consultando dinámicamente al clúster regional de Riot correcto (ej. tags `EUW` -> clúster de Europa, `KR` -> clúster de Asia, `LAS`/`NA` -> clúster de América).
* **Standings en Tiempo Real:** Canalización fluida de datos de SoloQ (`RANKED_SOLO_5x5`) consultando secuencialmente `Account-V1`, `Summoner-V4` y `League-V4`.
* **Mapeo Defensivo:** Gestión robusta de invocadores *Unranked* mapeándolos a estados iniciales sin romper el flujo de renderizado ni los cálculos matemáticos del torneo.

### 📊 2. Gráfico General de LP Dinámico e Interactivo (Recharts)
* **Precisión Magnética Vertical:** Un algoritmo inteligente en el eje Y rastrea la altura física del cursor en pantalla y la traduce a LP exactos, imantando el tooltip para **mostrar únicamente la tarjeta del jugador más cercano al ratón** con fluidez milimétrica.
* **Auto-Zoom Inteligente:** Ajusta automáticamente los límites máximos y mínimos del eje Y basándose únicamente en los invocadores activos y el rango de fechas seleccionado, evitando curvas planas.
* **Curvas Fantasma (Ghost Lines):** Ocultar un jugador de la leyenda no lo borra del gráfico; atenúa su línea a un **`3%` de opacidad y `1px` de grosor** con posibilidad de reactivarse con un clic, manteniendo el contexto global de fondo.
* **allowDataOverflow:** Habilita el recorte de datos fuera de rango para permitir que toda la gráfica realice zooms perfectos sobre los rangos de los jugadores visibles.

### 🛡️ 3. Arquitectura de Datos en Supabase (PostgreSQL)
* ** lobbies**: Gestión de salas personalizadas con fechas límite de torneos y configuraciones.
* ** players**: Caché maestro de invocadores que preserva PUUID, nombres y caché de iconos.
* ** lobby_players**: Tabla pivote de inscripción que congela las victorias, derrotas y el LP absoluto baseline al unirse a la sala para medir el crecimiento neto exacto.
* ** player_snapshots**: Snapshots periódicos del progreso del LP de cada jugador que alimentan el gráfico temporal de evolución.
* **Políticas RLS Activas:** Seguridad integrada a nivel de base de datos para la protección de accesos públicos y de rol de servicio.

### 🧠 4. Simulador Estocástico de Agentes (Stress Test)
* Un motor de simulación local estocástico que recrea partidas de SoloQ con factores dinámicos:
  * **Rachas de Victorias/Derrotas** 🔥
  * **Estado Mental / Tilt** ❄️ (los jugadores tilteados tienen mayor probabilidad de perder y perder más LP).
  * **Tryhards** 🧗 (aumento sostenido de victorias).

---

## 🛠️ Stack Tecnológico

* **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) con React 19.
* **Base de Datos:** [Supabase](https://supabase.com/) & PostgreSQL.
* **Estilado:** [Tailwind CSS](https://tailwindcss.com/) & Lucide React.
* **Gráficos analíticos:** [Recharts](https://recharts.org/).
* **Lenguaje:** TypeScript (Tipado estricto en API de Riot y Base de Datos).

---

## ⚙️ Configuración del Entorno Local

1. **Clonar el proyecto:**
   ```bash
   git clone https://github.com/Tebias-cloud/fantasyleague.git
   cd fantasyleague
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de entorno:**
   Crea un archivo `.env.local` en la raíz del proyecto basándote en la plantilla:
   ```env
   # Riot Games API Key
   RIOT_API_KEY=tu_riot_api_key_aqui

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_project_url_aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key_aqui
   ```

4. **Migrar la base de datos:**
   Aplica el archivo de migración ubicado en `supabase/migrations/001_initial_schema.sql` en la consola SQL de tu proyecto de Supabase para configurar instantáneamente las tablas, relaciones y políticas RLS.

5. **Correr el Servidor de Desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación funcionando.

---

## 📂 Estructura del Proyecto

```text
├── app/
│   ├── actions/          # Server Actions para Riot y Lobbies
│   ├── lobbies/          # Páginas de salas y visualización analítica
│   ├── layout.tsx        # Layout global con diseño premium
│   └── page.tsx          # Panel de creación e ingreso a lobbies
├── components/           # Componentes UI encapsulados (GlobalChart, LeaderboardTable, etc.)
├── lib/
│   ├── utils/            # Calculadora de LP absoluto y mock data
│   ├── agent-simulator.ts# Motor de simulación estocástico
│   ├── riot-api.ts       # Cliente oficial de la API de Riot
│   └── supabase.ts       # Cliente de inicialización de Supabase
├── supabase/
│   └── migrations/       # Esquema inicial e índices SQL de PostgreSQL
└── types/                # Tipados estrictos de TypeScript para la base de datos
```

---

## 🛡️ Seguridad y Buenas Prácticas
* **Cero claves expuestas:** Ninguna clave API (`RGAPI-xxx`) ni Token de servicio de Supabase ha sido expuesto en el repositorio. Todas las credenciales están resguardadas localmente e ignoradas por Git.
* **Caché Global de Iconos:** Implementación de un `failedIconsCache` a nivel de frontend que previene el parpadeo visual en componentes efímeros de Recharts cargando automáticamente alternativas seguras en el primer frame si el CDN de Riot falla (ej. icono de Caps).

---

## 🌟 Contribuciones y Soporte
Este proyecto ha sido optimizado con **Rich Aesthetics** y **Visual Excellence** para garantizar una experiencia visual premium de eSports en salas competitivas. Si tienes sugerencias o reportes de bugs, ¡no dudes en abrir un Issue o realizar un Pull Request! 🏆
