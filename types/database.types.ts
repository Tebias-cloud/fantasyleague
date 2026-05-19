export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface LobbySettings {
  is_premium: boolean;
  max_players: number;
  required_rank: string | null;
  only_unranked_accounts: boolean;
  auto_refresh: boolean;
}

export interface Database {
  public: {
    Tables: {
      Lobbies: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string
          settings: LobbySettings
          active: boolean
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          settings?: LobbySettings
          active?: boolean
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          settings?: LobbySettings
          active?: boolean
        }
      }
      Players: {
        Row: {
          puuid: string
          game_name: string
          tag_line: string
        }
        Insert: {
          puuid: string
          game_name: string
          tag_line: string
        }
        Update: {
          puuid?: string
          game_name?: string
          tag_line?: string
        }
      }
      Lobby_Players: {
        Row: {
          lobby_id: string
          player_puuid: string
          start_absolute_lp: number
          start_wins: number
          start_losses: number
        }
        Insert: {
          lobby_id: string
          player_puuid: string
          start_absolute_lp: number
          start_wins: number
          start_losses: number
        }
        Update: {
          lobby_id?: string
          player_puuid?: string
          start_absolute_lp?: number
          start_wins?: number
          start_losses?: number
        }
      }
      Player_Snapshots: {
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
    }
  }
}
