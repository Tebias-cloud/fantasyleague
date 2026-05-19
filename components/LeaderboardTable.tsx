"use client";

import { useState, useEffect, useCallback, memo } from 'react';
import PlayerChart from './PlayerChart';
import GlobalChart from './GlobalChart';
import { RefreshCw, UserPlus, Search, AlertCircle, Loader2, Timer, Award, ExternalLink, Calendar } from 'lucide-react';
import { addPlayerToLobby, refreshLobbyPlayers, getPlayerMatchesAction } from '@/app/actions/riot-actions';
import { getLobbyPlayers } from '@/app/actions/lobby-actions';

// Caché global en memoria de iconos rotos para evitar parpadeos durante rediseños o renderizados del DOM
const failedIconsCache = new Set<string>();

// Componente seguro que memoriza el origen de la imagen y evita parpadeos en re-renders
const SafeProfileIcon = memo(function SafeProfileIcon({ iconId, alt, className }: { iconId: number; alt: string; className?: string }) {
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

export default function LeaderboardTable({ lobbyId }: { lobbyId: string }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  
  // States para la carga y refresh
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0); // Cooldown en segundos
  
  // Search state
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Matches state
  const [playerMatches, setPlayerMatches] = useState<Record<string, any[]>>({});
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({});

  // Clock state para Corea (o LAS local)
  const [localTime, setLocalTime] = useState('');

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await getLobbyPlayers(lobbyId);
      setPlayers(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar los jugadores de la sala.");
    } finally {
      setIsLoadingData(false);
    }
  }, [lobbyId]);

  // Cargar datos inicialmente
  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Actualizar el reloj cada segundo
  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      };
      setLocalTime(new Date().toLocaleDateString('es-ES', options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Manejar el temporizador del cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timerId = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [cooldown]);

  const handleRefresh = async () => {
    if (cooldown > 0 || isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await refreshLobbyPlayers(lobbyId);
      if (result.error) {
        setError(result.error);
      } else {
        await fetchPlayers();
        setCooldown(120); // 2 minutos de cooldown
      }
    } catch (err) {
      setError("Error inesperado al actualizar.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const togglePlayer = async (puuid: string) => {
    if (expandedPlayer === puuid) {
      setExpandedPlayer(null);
    } else {
      setExpandedPlayer(puuid);
      if (!playerMatches[puuid]) {
        setLoadingMatches(prev => ({ ...prev, [puuid]: true }));
        try {
          const matches = await getPlayerMatchesAction(puuid);
          setPlayerMatches(prev => ({ ...prev, [puuid]: matches }));
        } catch (err) {
          console.error("Error loading matches:", err);
        } finally {
          setLoadingMatches(prev => ({ ...prev, [puuid]: false }));
        }
      }
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await addPlayerToLobby(lobbyId, gameName, tagLine);
      
      if (result.error) {
        setError(result.error);
      } else {
        await fetchPlayers(); // Recargar la lista desde la DB
        setGameName('');
        setTagLine('');
      }
    } catch (err) {
      setError("Error inesperado al añadir jugador.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sort by absolute LP descending
  const sortedPlayers = [...players].sort((a, b) => b.current_absolute_lp - a.current_absolute_lp);

  // Helpers para matches
  const getElapsedTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `Hace ${days}d`;
    if (hours > 0) return `Hace ${hours}h`;
    return `Hace ${mins}m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Computar estadísticas promedio sobre las 5 partidas cargadas
  const getPlayerAverages = (puuid: string) => {
    const matches = playerMatches[puuid] || [];
    if (matches.length === 0) return null;

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalCs = 0;
    let totalDuration = 0;
    let wins = 0;

    matches.forEach(m => {
      totalKills += m.kills;
      totalDeaths += m.deaths;
      totalAssists += m.assists;
      totalCs += m.cs;
      totalDuration += m.gameDuration;
      if (m.win) wins++;
    });

    const avgKills = (totalKills / matches.length).toFixed(1);
    const avgDeaths = (totalDeaths / matches.length).toFixed(1);
    const avgAssists = (totalAssists / matches.length).toFixed(1);
    const avgCsMin = ((totalCs / (totalDuration / 60))).toFixed(1);
    const avgDuration = formatDuration(Math.round(totalDuration / matches.length));
    const winrate = Math.round((wins / matches.length) * 100);

    return { avgKills, avgDeaths, avgAssists, avgCsMin, avgDuration, winrate, totalGames: matches.length };
  };

  const getTierColor = (tier: string) => {
    const t = tier.toUpperCase();
    if (t === 'IRON') return 'text-slate-500';
    if (t === 'BRONZE') return 'text-amber-700';
    if (t === 'SILVER') return 'text-slate-300';
    if (t === 'GOLD') return 'text-amber-400';
    if (t === 'PLATINUM') return 'text-cyan-400';
    if (t === 'EMERALD') return 'text-emerald-400';
    if (t === 'DIAMOND') return 'text-sky-400';
    if (t === 'MASTER') return 'text-purple-400';
    if (t === 'GRANDMASTER') return 'text-red-500';
    if (t === 'CHALLENGER') return 'text-amber-300 animate-pulse';
    return 'text-slate-400';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      
      {/* Search Form + Clock (Unificado para ahorrar espacio) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-black text-white tracking-tight uppercase">Añadir Invocador</h3>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Actualizado</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{localTime || 'Cargando reloj...'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-[1fr_100px_auto] gap-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Nombre de Invocador (ej. Faker)" 
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              required
            />
          </div>
          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 font-black group-focus-within:text-emerald-400 transition-colors">#</span>
            <input 
              type="text" 
              placeholder="Tag" 
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all uppercase"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Añadir'}
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-xs font-bold bg-red-400/5 border border-red-400/10 p-3 rounded-xl animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter uppercase">
              Ranking General
            </h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Clasificación en tiempo real de invocadores</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing || cooldown > 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all border shadow-lg
                ${cooldown > 0 
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed shadow-none' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 hover:border-slate-600'
                }`}
            >
              {cooldown > 0 ? (
                <>
                  <Timer className="w-4 h-4 text-orange-500" />
                  Espera {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                </>
              ) : isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Chart */}
        {sortedPlayers.length > 0 && <GlobalChart players={sortedPlayers} />}

        {/* Leaderboard Table / Cards */}
        <div className="space-y-2">
          {isLoadingData ? (
            <div className="py-20 flex justify-center items-center bg-slate-900/30 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/30 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
              <p className="text-slate-500 font-bold text-lg">No hay jugadores en el leaderboard.</p>
              <p className="text-slate-600 text-sm mt-1">Añade uno usando el formulario de arriba.</p>
            </div>
          ) : (
            sortedPlayers.map((player, index) => {
              const isExpanded = expandedPlayer === player.puuid;
              const isPositive = player.delta > 0;
              const isNeutral = player.delta === 0;

              const estWins = player.wins ?? Math.round((player.winrate / 100) * 50);
              const estLosses = player.losses ?? Math.round(((100 - player.winrate) / 100) * 50);
              
              const statsAvg = getPlayerAverages(player.puuid);

              // Calcular insignias de estado (racha, tilt, tryhard)
              const history = player.history || [];
              const delta = player.delta || 0;
              let statusBadge = null;

              if (history.length >= 3) {
                const len = history.length;
                const last = history[len - 1].lp;
                const prev = history[len - 2].lp;
                const prev2 = history[len - 3].lp;

                if (last > prev && prev > prev2) {
                  statusBadge = {
                    label: 'EN RACHA 🔥',
                    style: 'bg-red-500/10 border-red-500/30 text-red-400',
                    desc: 'Subiendo de LP consistentemente en sus últimas partidas.'
                  };
                } else if (last < prev && prev < prev2) {
                  statusBadge = {
                    label: 'TILTEADO ❄️',
                    style: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                    desc: 'En racha de derrotas en SoloQ. ¡Alguien que lo detenga!'
                  };
                }
              }

              if (!statusBadge) {
                if (delta >= 80) {
                  statusBadge = {
                    label: 'TRYHARD 🧗',
                    style: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: 'Gran subida acumulada de LP en este torneo.'
                  };
                } else if (delta <= -80) {
                  statusBadge = {
                    label: 'TILTEANDO 📉',
                    style: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
                    desc: 'Ha perdido una cantidad preocupante de LPs en general.'
                  };
                }
              }

              return (
                <div 
                  key={player.puuid} 
                  className={`group bg-slate-900/60 border rounded-xl transition-all duration-300 overflow-hidden backdrop-blur-md
                    ${isExpanded ? 'border-slate-700 shadow-xl bg-slate-900' : 'border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/90 shadow-sm'}`}
                >
                  {/* Fila del Leaderboard */}
                  <div 
                    onClick={() => togglePlayer(player.puuid)}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 cursor-pointer"
                  >
                    {/* Position */}
                    <div className="text-2xl md:text-3xl font-black text-slate-700 w-8 md:w-10 text-center tracking-tighter shrink-0">
                      {index + 1}
                    </div>

                    {/* Cuenta LoL (Icon + Name) */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 group-hover:border-slate-700 transition-colors bg-slate-950 flex items-center justify-center">
                        <SafeProfileIcon 
                          iconId={player.profile_icon_id || 0}
                          alt={player.game_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="truncate">
                        <h3 className="font-black text-lg md:text-xl text-white tracking-tight group-hover:text-emerald-400 transition-colors truncate flex items-center gap-1.5 flex-wrap">
                          <span>{player.game_name}</span>
                          <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">#{player.tag_line}</span>
                          
                          {statusBadge && (
                            <span 
                              title={statusBadge.desc}
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${statusBadge.style}`}
                            >
                              {statusBadge.label}
                            </span>
                          )}
                        </h3>
                        <p className={`text-[10px] md:hidden font-black uppercase tracking-widest mt-0.5 flex gap-1 ${getTierColor(player.tier)}`}>
                          <span>{player.tier} {player.division}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300">{player.lp} LP</span>
                        </p>
                      </div>
                    </div>

                    {/* Elo / Liga (Desktop) */}
                    <div className="hidden md:flex flex-col items-start justify-center w-40 px-4 border-l border-slate-800/50 shrink-0">
                      <span className={`text-xs font-black uppercase tracking-wider ${getTierColor(player.tier)}`}>
                        {player.tier} {player.division}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{player.lp} LP</span>
                    </div>

                    {/* Partidas (W/L) (Desktop) */}
                    <div className="hidden md:flex flex-col items-end justify-center w-36 px-4 border-l border-slate-800/50 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-black tracking-wider mb-1">
                        <span className="text-emerald-400">{estWins}W</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-red-500">{estLosses}L</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex shadow-inner border border-slate-800/50">
                        <div 
                          className={`h-full ${player.winrate >= 50 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-orange-600 to-orange-400'}`} 
                          style={{ width: `${player.winrate}%` }}
                        />
                      </div>
                    </div>

                    {/* Winrate */}
                    <div className="flex flex-col items-end justify-center w-20 md:w-28 border-l border-slate-800/50 pl-3 md:pl-4 shrink-0">
                      <span className="font-black text-xl md:text-2xl text-slate-200 tracking-tight">{player.winrate}%</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">WINRATE</span>
                    </div>
                  </div>

                  {/* Sección Expandida (Estilo Korea de Elmiillor) */}
                  {isExpanded && (
                    <div className="px-4 md:px-8 pb-8 animate-in slide-in-from-top-4 duration-300 bg-slate-950/20 border-t border-slate-800/50">
                      
                      {/* Grid de 2 Columnas Principal (Averages + Gráfico) */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
                        
                        {/* Panel Izquierdo: Estadísticas Generales */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-5">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-400" /> Stats Promedio (Riot API)
                          </h4>

                          {loadingMatches[player.puuid] ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Calculando promedios...</span>
                            </div>
                          ) : statsAvg ? (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Últimas Partidas</span>
                                <span className="text-xs font-black text-white">{statsAvg.totalGames} Partidas analizadas</span>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">KDA Promedio</span>
                                  <span className="block text-sm font-black text-white mt-0.5">
                                    {statsAvg.avgKills} <span className="text-slate-500">/</span> <span className="text-red-400">{statsAvg.avgDeaths}</span> <span className="text-slate-500">/</span> {statsAvg.avgAssists}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Farm Promedio</span>
                                  <span className="block text-sm font-black text-emerald-400 mt-0.5">{statsAvg.avgCsMin} CS/min</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Duración Promedio</span>
                                  <span className="block text-sm font-black text-white mt-0.5">{statsAvg.avgDuration} min</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Rendimiento</span>
                                  <span className={`block text-sm font-black mt-0.5 ${statsAvg.winrate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                    {statsAvg.winrate}% Winrate
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-center pt-3 border-t border-slate-900">
                                <a 
                                  href={`https://www.op.gg/summoners/las/${encodeURIComponent(player.game_name)}-${encodeURIComponent(player.tag_line)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-300 py-2 px-3 rounded-lg transition-all"
                                >
                                  OP.GG <ExternalLink className="w-3 h-3 text-slate-500" />
                                </a>
                                <a 
                                  href={`https://u.gg/lol/profile/la2/${encodeURIComponent(player.game_name)}-${encodeURIComponent(player.tag_line)}/overview`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-300 py-2 px-3 rounded-lg transition-all"
                                >
                                  U.GG <ExternalLink className="w-3 h-3 text-slate-500" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10">
                              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Aún no hay partidas cargadas</span>
                            </div>
                          )}
                        </div>

                        {/* Panel Derecho: LP Chart */}
                        <div className="lg:col-span-2 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                            <span>Historial de Rendimiento</span>
                            <span>Progreso de LP: <span className="text-emerald-400">{player.current_absolute_lp} LP</span></span>
                          </div>
                          <div className="h-[180px]">
                            <PlayerChart 
                              data={player.history} 
                              color={isPositive ? "#34d399" : isNeutral ? "#94a3b8" : "#f87171"} 
                            />
                          </div>
                        </div>

                      </div>

                      {/* Historial de Partidas Detallado */}
                      <div className="space-y-4 pt-8">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Partidas Recientes (SoloQ Challenge)</span>
                        </div>

                        {loadingMatches[player.puuid] ? (
                          <div className="flex flex-col items-center justify-center py-20 bg-slate-950/40 border border-slate-800/80 rounded-2xl gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Conectando con Riot Games API...</span>
                          </div>
                        ) : !playerMatches[player.puuid] || playerMatches[player.puuid].length === 0 ? (
                          <div className="text-center py-16 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">No se encontraron partidas en el servidor</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {playerMatches[player.puuid].map((m: any) => {
                              const matchWin = m.win;
                              
                              // Separar los 10 participantes en 2 equipos de 5
                              const team1 = m.participants.slice(0, 5);
                              const team2 = m.participants.slice(5, 10);

                              return (
                                <div 
                                  key={m.matchId} 
                                  className={`border rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-sm grid grid-cols-1 md:grid-cols-[130px_1fr_auto] items-center gap-4 p-4 md:p-5
                                    ${matchWin 
                                      ? 'bg-emerald-950/10 hover:bg-emerald-950/15 border-emerald-900/30' 
                                      : 'bg-red-950/10 hover:bg-red-950/15 border-red-900/30'
                                    }`}
                                >
                                  
                                  {/* Columna Izquierda: Resultado y Tiempos */}
                                  <div className="space-y-1.5 md:border-r border-slate-800/40 md:pr-4">
                                    <span className={`block text-sm font-black uppercase tracking-wider ${matchWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {matchWin ? 'Victoria' : 'Derrota'}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest">{m.gameMode.replace('CLASSIC', 'SoloQ')}</span>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                      <span>{getElapsedTime(m.gameCreation)}</span>
                                      <span>•</span>
                                      <span>{formatDuration(m.gameDuration)}</span>
                                    </div>
                                  </div>

                                  {/* Columna Central: Champion, KDA, Farm e Items */}
                                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-1">
                                    
                                    {/* Sub-Panel: Champion Icon + KDA */}
                                    <div className="flex items-center gap-4">
                                      {/* Champion Icon redondo */}
                                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-800 shrink-0">
                                        <img 
                                          src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${m.championName}.png`}
                                          alt={m.championName}
                                          className="w-full h-full object-coverScale"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/Aatrox.png";
                                          }}
                                        />
                                      </div>
                                      
                                      {/* KDA stats */}
                                      <div>
                                        <h5 className="font-black text-sm text-white">{m.championName}</h5>
                                        <div className="text-xs font-black tracking-wider text-slate-300 mt-0.5">
                                          {m.kills} <span className="text-slate-500">/</span> <span className="text-red-400">{m.deaths}</span> <span className="text-slate-500">/</span> {m.assists}
                                        </div>
                                        <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Ratio: {m.kda} KDA</span>
                                      </div>
                                    </div>

                                    {/* Sub-Panel: Farm (CS) */}
                                    <div className="text-left md:text-center">
                                      <span className="block text-xs font-black text-slate-300">{m.cs} CS</span>
                                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                        {((m.cs / (m.gameDuration / 60))).toFixed(1)} CS/min
                                      </span>
                                    </div>

                                    {/* Sub-Panel: Items Grid (official DDragon) */}
                                    <div className="flex items-center gap-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 shadow-inner">
                                      {m.items.map((item: number, idx: number) => {
                                        const isTrinket = idx === 6;
                                        if (item === 0) {
                                          return (
                                            <div 
                                              key={idx} 
                                              className={`w-7 h-7 bg-slate-900/60 border border-slate-800/40 rounded-lg shadow-inner
                                                ${isTrinket ? 'ml-2 bg-slate-900 border-dashed' : ''}`}
                                            />
                                          );
                                        }

                                        return (
                                          <div 
                                            key={idx} 
                                            className={`relative w-7 h-7 rounded-lg overflow-hidden border border-slate-800/80 shrink-0 shadow
                                              ${isTrinket ? 'ml-2 border-emerald-900/40' : ''}`}
                                          >
                                            <img 
                                              src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/item/${item}.png`}
                                              alt={`Item ${item}`}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>

                                  </div>

                                  {/* Columna Derecha: Equipos (Participantes 5v5) */}
                                  <div className="hidden lg:grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] font-bold text-slate-400 border-l border-slate-800/40 pl-5 shrink-0 max-w-[280px]">
                                    
                                    {/* Team 1 (Azul/Aliados) */}
                                    <div className="space-y-1">
                                      {team1.map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1.5 truncate max-w-[130px]">
                                          <img 
                                            src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${p.championName}.png`}
                                            alt={p.championName}
                                            className="w-3.5 h-3.5 rounded border border-slate-800 shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.onerror = null;
                                              e.currentTarget.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/Aatrox.png";
                                            }}
                                          />
                                          <span className={`truncate ${p.isCurrent ? 'font-black text-emerald-400' : 'text-slate-500'}`}>
                                            {p.gameName}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Team 2 (Rojo/Enemigos) */}
                                    <div className="space-y-1">
                                      {team2.map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1.5 truncate max-w-[130px]">
                                          <img 
                                            src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${p.championName}.png`}
                                            alt={p.championName}
                                            className="w-3.5 h-3.5 rounded border border-slate-800 shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.onerror = null;
                                              e.currentTarget.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/Aatrox.png";
                                            }}
                                          />
                                          <span className={`truncate ${p.isCurrent ? 'font-black text-emerald-400' : 'text-slate-500'}`}>
                                            {p.gameName}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
