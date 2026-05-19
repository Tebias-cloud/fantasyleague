"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Convertir LP Absoluto a Rango/División de LoL legible y en español
const absoluteLPToRank = (value: number) => {
  if (value >= 2800) {
    const lp = value - 2800;
    if (lp >= 1000) return `CHALLENGER ${lp} LP`;
    if (lp >= 500) return `GRANDMASTER ${lp} LP`;
    return `MASTER ${lp} LP`;
  }
  const tiers = [
    { name: 'DIAMANTE', val: 2400 },
    { name: 'ESMERALDA', val: 2000 },
    { name: 'PLATINO', val: 1600 },
    { name: 'ORO', val: 1200 },
    { name: 'PLATA', val: 800 },
    { name: 'BRONCE', val: 400 },
    { name: 'HIERRO', val: 0 }
  ];
  for (const t of tiers) {
    if (value >= t.val) {
      const diff = value - t.val;
      const divIdx = Math.floor(diff / 100);
      const lp = diff % 100;
      const divisions = ['IV', 'III', 'II', 'I'];
      const division = divisions[divIdx] || 'IV';
      return `${t.name} ${division} (${lp} LP)`;
    }
  }
  return 'UNRANKED';
};

// Formato ultra-corto para las etiquetas del Eje Y del gráfico
const formatYAxisTick = (value: number) => {
  if (value >= 2800) {
    const lp = value - 2800;
    if (lp >= 1000) return `CHALL ${lp}`;
    if (lp >= 500) return `GM ${lp}`;
    return `MASTER ${lp > 0 ? lp : ''}`;
  }
  const tiers = [
    { name: 'DIA', val: 2400 },
    { name: 'EME', val: 2000 },
    { name: 'PLAT', val: 1600 },
    { name: 'ORO', val: 1200 },
    { name: 'PLATA', val: 800 },
    { name: 'BRON', val: 400 },
    { name: 'HIER', val: 0 }
  ];
  for (const t of tiers) {
    if (value >= t.val) {
      const diff = value - t.val;
      const divIdx = Math.floor(diff / 100);
      const divisions = ['IV', 'III', 'II', 'I'];
      const division = divisions[divIdx] || 'IV';
      return `${t.name} ${division}`;
    }
  }
  return 'UNR';
};

interface Player {
  puuid: string;
  game_name: string;
  profile_icon_id?: number;
  history: { date: string, lp: number }[];
  delta?: number;
  wins?: number;
  losses?: number;
  tier?: string;
  division?: string;
}

// Helper para analizar y determinar racha, tilt o tryhard del invocador
const getPlayerStatus = (player: any) => {
  const history = player?.history || [];
  const delta = player?.delta || 0;
  
  if (history.length >= 3) {
    const len = history.length;
    const last = history[len - 1].lp;
    const prev = history[len - 2].lp;
    const prev2 = history[len - 3].lp;

    if (last > prev && prev > prev2) {
      return {
        label: 'RACHA 🔥',
        style: 'bg-red-500/10 border-red-500/30 text-red-400',
        desc: 'Subiendo de LP consistentemente en sus últimas partidas.'
      };
    } else if (last < prev && prev < prev2) {
      return {
        label: 'TILT ❄️',
        style: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        desc: 'En racha de derrotas en SoloQ. ¡Alguien que lo detenga!'
      };
    }
  }

  if (delta >= 80) {
    return {
      label: 'TRYHARD 🧗',
      style: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      desc: 'Gran subida acumulada de LP en este torneo.'
    };
  } else if (delta <= -80) {
    return {
      label: 'TILTEANDO 📉',
      style: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
      desc: 'Ha perdido una cantidad preocupante de LPs en general.'
    };
  }

  return null;
};

// Caché en memoria para evitar parpadeos (flickering) en componentes que se montan y desmontan continuamente (como tooltips de Recharts)
const failedIconsCache = new Set<string>();

// Componente de imagen seguro que evita el parpadeo durante actualizaciones de estado de Recharts
const SafeProfileIcon = React.memo(function SafeProfileIcon({ iconId, alt, className }: { iconId: number; alt: string; className?: string }) {
  const primaryUrl = `https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/${iconId}.png`;
  const fallbackUrl = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/0.png";
  
  const [src, setSrc] = useState(() => failedIconsCache.has(primaryUrl) ? fallbackUrl : primaryUrl);

  useEffect(() => {
    const currentUrl = `https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/${iconId}.png`;
    setSrc(failedIconsCache.has(currentUrl) ? fallbackUrl : currentUrl);
  }, [iconId]);

  return (
    <img 
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        failedIconsCache.add(primaryUrl);
        setSrc(fallbackUrl);
      }}
    />
  );
});

interface GlobalChartProps {
  players: Player[];
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const GlobalChart = React.memo(function GlobalChart({ players }: GlobalChartProps) {
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());

  // Estados de Filtros Avanzados
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedDays, setSelectedDays] = useState<number>(0);

  const togglePlayerVisibility = (playerName: string) => {
    setHiddenPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerName)) {
        next.delete(playerName);
      } else {
        next.add(playerName);
      }
      return next;
    });
  };

  // 1. Filtrar invocadores por Liga y División
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const tierMatch = selectedLeague === 'ALL' || p.tier?.toUpperCase() === selectedLeague.toUpperCase();
      const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(p.tier?.toUpperCase() || '');
      const divMatch = selectedDivision === 'ALL' || isMasterPlus || p.division?.toUpperCase() === selectedDivision.toUpperCase();
      return tierMatch && divMatch;
    });
  }, [players, selectedLeague, selectedDivision]);

  // 2. Calcular dinámicamente el min y max de LP absoluto considerando solo los jugadores visibles y el corte de días/actualizaciones
  const { yMin, yMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    
    filteredPlayers.forEach(p => {
      if (!hiddenPlayers.has(p.game_name)) {
        let history = p.history || [];
        if (selectedDays > 0 && history.length > selectedDays) {
          history = history.slice(history.length - selectedDays);
        }
        
        history.forEach(h => {
          if (h.lp < min) min = h.lp;
          if (h.lp > max) max = h.lp;
        });
      }
    });

    if (min === Infinity || max === -Infinity) {
      return { yMin: 0, yMax: 3000 };
    }

    const padding = 50;
    return {
      yMin: Math.max(0, min - padding),
      yMax: max + padding
    };
  }, [filteredPlayers, hiddenPlayers, selectedDays]);

  const data = useMemo(() => {
    const dateSet = new Set<string>();
    filteredPlayers.forEach(p => {
      p.history.forEach(h => dateSet.add(h.date));
    });
    
    let dates = Array.from(dateSet);
    dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (selectedDays > 0 && dates.length > selectedDays) {
      dates = dates.slice(dates.length - selectedDays);
    }

    const chartData = dates.map(date => {
      const dataPoint: any = { date };
      filteredPlayers.forEach(p => {
        const historyPoint = p.history.find(h => h.date === date);
        if (historyPoint) {
          dataPoint[p.game_name] = historyPoint.lp;
        }
      });
      return dataPoint;
    });

    chartData.forEach((point, i) => {
      filteredPlayers.forEach(p => {
        if (point[p.game_name] === undefined && i > 0) {
          point[p.game_name] = chartData[i - 1][p.game_name];
        }
      });
    });

    return chartData;
  }, [filteredPlayers, selectedDays]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // 1. Filtrar duplicados causados por StrictMode o re-renders
      let filteredPayload = payload.filter((item: any, index: number, self: any[]) => 
        self.findIndex(t => t.name === item.name) === index
      );

      // 2. EXCLUIR los jugadores desactivados
      filteredPayload = filteredPayload.filter((item: any) => !hiddenPlayers.has(item.name));

      if (filteredPayload.length === 0) return null;

      // 3. Encontrar el item del payload que corresponde al jugador más cercano al cursor (hoveredPlayer)
      const activeName = hoveredPlayer || filteredPayload[0].name;
      const item = filteredPayload.find((x: any) => x.name === activeName) || filteredPayload[0];
      
      const player = players.find(p => p.game_name === item.name);
      if (!player) return null;
      
      const iconId = player.profile_icon_id;
      const statusBadge = getPlayerStatus(player);

      return (
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[200px]">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center shrink-0">
                <SafeProfileIcon 
                  iconId={iconId || 0}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5 min-w-0">
                <span className="truncate">{item.name}</span>
                {statusBadge && (
                  <span 
                    title={statusBadge.desc}
                    className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${statusBadge.style}`}
                  >
                    {statusBadge.label}
                  </span>
                )}
              </span>
            </div>
            <span className="text-xs font-black text-emerald-400 shrink-0">{absoluteLPToRank(item.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    
    // Filtrar duplicados en la leyenda
    const uniquePayload = payload.filter((entry: any, index: number, self: any[]) => 
      self.findIndex(t => t.value === entry.value) === index
    );

    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 select-none">
        {uniquePayload.map((entry: any, index: number) => {
          const player = players.find(p => p.game_name === entry.value);
          const iconId = player?.profile_icon_id;
          const isHovered = hoveredPlayer === entry.value;
          const hasActiveHover = hoveredPlayer !== null;
          const isHidden = hiddenPlayers.has(entry.value);
          const statusBadge = getPlayerStatus(player);

          return (
            <li 
              key={`item-${index}`} 
              className={`flex items-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer
                ${isHidden ? 'opacity-20 line-through scale-90 text-slate-500 hover:opacity-40' : 
                  (isHovered ? 'text-white scale-105 opacity-100' : (hasActiveHover ? 'text-slate-600 opacity-25 scale-95' : 'text-slate-300 hover:text-white'))}`}
              onMouseEnter={() => !isHidden && setHoveredPlayer(entry.value)}
              onMouseLeave={() => setHoveredPlayer(null)}
              onClick={() => {
                togglePlayerVisibility(entry.value);
                setHoveredPlayer(null); // Limpiar hover para evitar desfases visuales
              }}
            >
              <span 
                className="w-2 h-2 rounded-full transition-transform" 
                style={{ backgroundColor: entry.color }}
              />
              <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-850 bg-slate-950 flex items-center justify-center shrink-0">
                <SafeProfileIcon 
                  iconId={iconId || 0}
                  alt={entry.value}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[11px] font-bold flex items-center gap-1">
                <span>{entry.value}</span>
                {statusBadge && (
                  <span 
                    title={statusBadge.desc}
                    className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${statusBadge.style}`}
                  >
                    {statusBadge.label}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  if (!players || players.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Progreso General</h3>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Evolución de LP Absoluto</p>
        </div>
      </div>

      {/* Barra de Filtros Avanzados */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl mb-6 text-xs font-bold text-slate-400 backdrop-blur-md">
        
        {/* Filtro Ligas */}
        <div className="flex flex-col gap-1.5 min-w-[140px] flex-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">🏆 Liga / Rango</label>
          <select 
            value={selectedLeague}
            onChange={(e) => {
              setSelectedLeague(e.target.value);
              setHoveredPlayer(null);
            }}
            className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none cursor-pointer focus:border-emerald-500/40 transition-colors"
          >
            <option value="ALL">TODAS LAS LIGAS</option>
            <option value="CHALLENGER">CHALLENGER</option>
            <option value="GRANDMASTER">GRANDMASTER</option>
            <option value="MASTER">MASTER</option>
            <option value="DIAMOND">DIAMANTE</option>
            <option value="EMERALD">ESMERALDA</option>
            <option value="PLATINUM">PLATINO</option>
            <option value="GOLD">ORO</option>
            <option value="SILVER">PLATA</option>
            <option value="BRONZE">BRONCE</option>
            <option value="IRON">HIERRO</option>
          </select>
        </div>

        {/* Filtro Divisiones */}
        <div className="flex flex-col gap-1.5 min-w-[110px] flex-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">⭐ División</label>
          <select 
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(e.target.value);
              setHoveredPlayer(null);
            }}
            className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none cursor-pointer focus:border-emerald-500/40 transition-colors"
          >
            <option value="ALL">TODAS</option>
            <option value="I">DIVISIÓN I</option>
            <option value="II">DIVISIÓN II</option>
            <option value="III">DIVISIÓN III</option>
            <option value="IV">DIVISIÓN IV</option>
          </select>
        </div>

        {/* Filtro Rango de Tiempo (Días) */}
        <div className="flex flex-col gap-1.5 min-w-[145px] flex-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">📅 Rango Temporal</label>
          <select 
            value={selectedDays}
            onChange={(e) => {
              setSelectedDays(Number(e.target.value));
              setHoveredPlayer(null);
            }}
            className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none cursor-pointer focus:border-emerald-500/40 transition-colors"
          >
            <option value="0">TODO EL TORNEO</option>
            <option value="3">ÚLTIMOS 3 DÍAS</option>
            <option value="5">ÚLTIMOS 5 DÍAS</option>
            <option value="7">ÚLTIMOS 7 DÍAS</option>
          </select>
        </div>

      </div>

      {filteredPlayers.length === 0 ? (
        <div className="h-80 w-full flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950/20 rounded-3xl py-20 gap-3">
          <span className="text-slate-500 font-bold text-sm text-center px-4">No hay invocadores registrados que coincidan con los filtros seleccionados.</span>
          <button 
            onClick={() => {
              setSelectedLeague('ALL');
              setSelectedDivision('ALL');
              setSelectedDays(0);
            }}
            className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length > 0 && state.chartY !== undefined) {
                const payload = state.activePayload;
                const plotHeight = 280; // Altura estimativa del plot
                const topOffset = 15;
                
                // Porcentaje de la posición del ratón de arriba a abajo
                const pct = Math.max(0, Math.min(1, (state.chartY - topOffset) / plotHeight));
                
                // Interpolar el LP bajo el cursor
                const estimatedLP = yMax - pct * (yMax - yMin);
                
                let closest = payload[0].name;
                let minDiff = Infinity;
                
                payload.forEach((item: any) => {
                  if (item.value !== undefined) {
                    const diff = Math.abs(item.value - estimatedLP);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closest = item.name;
                    }
                  }
                });
                
                setHoveredPlayer(closest);
              }
            }}
            onMouseLeave={() => setHoveredPlayer(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[yMin, yMax]}
              allowDataOverflow={true}
              tickFormatter={formatYAxisTick}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            {filteredPlayers.map((p, i) => {
              const isHidden = hiddenPlayers.has(p.game_name);
              const isHovered = hoveredPlayer === p.game_name;
              
              return (
                <Line 
                  key={p.puuid}
                  type="monotone" 
                  dataKey={p.game_name} 
                  name={p.game_name}
                  stroke={COLORS[i % COLORS.length]} 
                  strokeWidth={isHidden ? 1.0 : (isHovered ? 4.5 : 2.5)}
                  strokeOpacity={isHidden ? 0.03 : (isHovered ? 1.0 : 0.65)}
                  dot={!isHidden && isHovered ? { r: 5, strokeWidth: 1, strokeOpacity: 1, fillOpacity: 1 } : false}
                  activeDot={!isHidden ? { r: 6 } : false} 
                  connectNulls
                  onMouseEnter={() => !isHidden && setHoveredPlayer(p.game_name)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
});

export default GlobalChart;
