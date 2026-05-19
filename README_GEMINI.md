# 🌌 Gemini AI Engine for Fantasy League

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Powered-blue?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)

**Gemini AI Engine** es el núcleo de inteligencia artificial diseñado para potenciar la experiencia de la **LoL Fantasy League**. Utilizando los modelos más avanzados de Google (Gemini 1.5 Flash/Pro), este motor transforma datos crudos de la Riot API en estrategias ganadoras y análisis predictivos en tiempo real.

---

## 🚀 Estado Actual del Proyecto

Actualmente, el proyecto ha implementado la base para la **creación de lobbies**, **visualización de leaderboards**, **simulación de datos de jugadores** y la **conexión inicial a APIs externas**.

### 📂 Estructura del Proyecto Implementada:

```text
fantasy-league/
├── app/
│   ├── page.tsx                    # Landing page principal
│   ├── layout.tsx                  # Layout principal de la app
│   ├── globals.css                 # Estilos globales y Tailwind CSS
│   ├── actions/
│   │   └── riot-actions.ts         # Server Actions de Next.js para interactuar con Riot API
│   └── lobbies/[id]/
│       └── page.tsx                # Vista dinámica del detalle de un Lobby de Fantasy
├── components/
│   ├── CreateLobbyForm.tsx         # Formulario interactivo para crear un nuevo lobby
│   ├── LeaderboardTable.tsx        # Tabla de clasificación de la Fantasy League
│   └── PlayerChart.tsx             # Gráficos dinámicos (Recharts) para el historial de LP de un jugador
├── lib/
│   ├── agent-simulator.ts          # Motor de simulación estocástica para progreso de jugadores (LP, rachas, tilt)
│   ├── riot-api.ts                 # Utilidades de integración con la API de Riot Games
│   ├── supabase.ts                 # Configuración del cliente de Supabase
│   └── utils/
│       ├── lp-calculator.ts        # Lógica de cálculo de League Points
│       └── mock-data.ts            # Datos falsos para desarrollo y pruebas de UI
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Esquema inicial de la base de datos PostgreSQL (Lobbies, Jugadores, etc.)
└── types/
    └── database.types.ts           # Definiciones de tipos generadas para Supabase
```

---

## 🚀 Características Principales

### 🧠 Análisis Predictivo de LP
Utiliza algoritmos de Deep Learning para predecir la ganancia o pérdida de LP (League Points) de los jugadores basándose en su historial, estado de ánimo del carril y tendencias del meta actual.

### 🎭 Optimizador de Draft (Lobby)
Asistente en tiempo real que sugiere los mejores picks para tu equipo de Fantasy, analizando sinergias entre jugadores y contra-picks estratégicos.

### 📈 Visualización Dinámica con Recharts
Integración fluida de datos procesados por IA en gráficos interactivos que muestran la progresión de los jugadores y la probabilidad de éxito de cada alineación.

### ⚡ Procesamiento en Tiempo Real
Capacidad de procesar miles de puntos de datos de partidas activas para actualizar las estadísticas de la liga de fantasía instantáneamente.

---

## 🛠️ Stack Tecnológico

- **Modelos de IA:** Google Gemini 1.5 Flash (Velocidad) & Pro (Análisis Profundo).
- **Frontend:** Next.js 15 (App Router) + React 19.
- **Base de Datos:** Supabase (PostgreSQL) con Realtime enabled.
- **Gráficos:** Recharts para visualización de datos complejos.
- **Estilos:** Tailwind CSS 4 con diseño Dark-Mode Premium.

---

## ⚙️ Configuración e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/fantasy-league.git
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de Entorno:**
   Crea un archivo `.env.local` y añade tus credenciales:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_anonima
   GOOGLE_GEMINI_API_KEY=tu_google_api_key
   RIOT_API_KEY=tu_riot_api_key
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

---

## 💎 Diseño y Estética

Este proyecto sigue una línea de diseño **Premium Dark Mode**, con:
- **Glassmorphism:** Efectos de desenfoque y transparencia en componentes.
- **Micro-animaciones:** Transiciones suaves para una experiencia de usuario fluida.
- **Tipografía Moderna:** Uso de *Geist* para máxima legibilidad y estilo minimalista.

---

## 🤝 Contribuciones

Si deseas mejorar el motor de IA o añadir nuevas funcionalidades, ¡los Pull Requests son bienvenidos! Por favor, revisa `CONTRIBUTING.md` para más detalles.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

<p align="center">
  Hecho con ❤️ por el equipo de Desarrollo de Fantasy League
</p>
