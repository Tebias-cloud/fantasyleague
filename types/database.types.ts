export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Settings stored in lobbies.settings JSONB column.
// Only the fields actually written/read by the application are included.
export interface LobbySettings {
  onlyUnranked?: boolean;
  maxPlayers?: number;
  [key: string]: Json | undefined;
}

export interface Database {
  public: {
    Tables: {
      lobbies: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string
          settings: LobbySettings
          active: boolean
          created_by: string | null
          plan_tier: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          settings?: LobbySettings
          active?: boolean
          created_by?: string | null
          plan_tier?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          settings?: LobbySettings
          active?: boolean
          created_by?: string | null
          plan_tier?: string
        }
      }
      players: {
        Row: {
          puuid: string
          game_name: string
          tag_line: string
          profile_icon_id: number | null
          platform: string | null
        }
        Insert: {
          puuid: string
          game_name: string
          tag_line: string
          profile_icon_id?: number | null
          platform?: string | null
        }
        Update: {
          puuid?: string
          game_name?: string
          tag_line?: string
          profile_icon_id?: number | null
          platform?: string | null
        }
      }
      lobby_players: {
        Row: {
          lobby_id: string
          player_puuid: string
          start_absolute_lp: number
          start_wins: number
          start_losses: number
          joined_at: string
          start_tier: string | null
          start_division: string | null
          start_lp: number | null
          active: boolean
          left_at: string | null
          last_match_at: string | null
        }
        Insert: {
          lobby_id: string
          player_puuid: string
          start_absolute_lp: number
          start_wins: number
          start_losses: number
          joined_at?: string
          start_tier?: string | null
          start_division?: string | null
          start_lp?: number | null
          active?: boolean
          left_at?: string | null
          last_match_at?: string | null
        }
        Update: {
          lobby_id?: string
          player_puuid?: string
          start_absolute_lp?: number
          start_wins?: number
          start_losses?: number
          joined_at?: string
          start_tier?: string | null
          start_division?: string | null
          start_lp?: number | null
          active?: boolean
          left_at?: string | null
          last_match_at?: string | null
        }
      }
      player_snapshots: {
        Row: {
          id: string
          player_puuid: string
          tier: string
          division: string
          lp: number
          total_wins: number
          total_losses: number
          created_at: string
        }
        Insert: {
          id?: string
          player_puuid: string
          tier: string
          division: string
          lp: number
          total_wins: number
          total_losses: number
          created_at?: string
        }
        Update: {
          id?: string
          player_puuid?: string
          tier?: string
          division?: string
          lp?: number
          total_wins?: number
          total_losses?: number
          created_at?: string
        }
      }
      lobby_player_matches: {
        Row: {
          id: string
          lobby_id: string
          player_puuid: string
          match_id: string
          game_creation: string
          game_duration: number
          queue_id: number
          win: boolean
          champion_name: string
          kills: number
          deaths: number
          assists: number
          cs: number
          gold_earned: number
          largest_killing_spree: number
          created_at: string
        }
        Insert: {
          id?: string
          lobby_id: string
          player_puuid: string
          match_id: string
          game_creation: string
          game_duration: number
          queue_id?: number
          win: boolean
          champion_name: string
          kills?: number
          deaths?: number
          assists?: number
          cs?: number
          gold_earned?: number
          largest_killing_spree?: number
          created_at?: string
        }
        Update: {
          id?: string
          lobby_id?: string
          player_puuid?: string
          match_id?: string
          game_creation?: string
          game_duration?: number
          queue_id?: number
          win?: boolean
          champion_name?: string
          kills?: number
          deaths?: number
          assists?: number
          cs?: number
          gold_earned?: number
          largest_killing_spree?: number
          created_at?: string
        }
      }
      lobby_player_stats: {
        Row: {
          lobby_id: string
          player_puuid: string
          matches_played: number
          wins: number
          losses: number
          kills: number
          deaths: number
          assists: number
          cs: number
          gold_earned: number
          largest_killing_spree: number
          updated_at: string
        }
        Insert: {
          lobby_id: string
          player_puuid: string
          matches_played?: number
          wins?: number
          losses?: number
          kills?: number
          deaths?: number
          assists?: number
          cs?: number
          gold_earned?: number
          largest_killing_spree?: number
          updated_at?: string
        }
        Update: {
          lobby_id?: string
          player_puuid?: string
          matches_played?: number
          wins?: number
          losses?: number
          kills?: number
          deaths?: number
          assists?: number
          cs?: number
          gold_earned?: number
          largest_killing_spree?: number
          updated_at?: string
        }
      }
    }
  }
}
