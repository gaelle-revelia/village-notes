export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activites: {
        Row: {
          actif: boolean | null
          created_at: string | null
          domaine: string
          enfant_id: string
          icone: string | null
          id: string
          nom: string
          track_distance: boolean | null
          track_temps: boolean | null
          unite_distance: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          domaine: string
          enfant_id: string
          icone?: string | null
          id?: string
          nom: string
          track_distance?: boolean | null
          track_temps?: boolean | null
          unite_distance?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          domaine?: string
          enfant_id?: string
          icone?: string | null
          id?: string
          nom?: string
          track_distance?: boolean | null
          track_temps?: boolean | null
          unite_distance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activites_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
      enfant_lexique: {
        Row: {
          created_at: string | null
          enfant_id: string
          id: string
          mot_correct: string
          mot_transcrit: string
          source: string
        }
        Insert: {
          created_at?: string | null
          enfant_id: string
          id?: string
          mot_correct: string
          mot_transcrit: string
          source?: string
        }
        Update: {
          created_at?: string | null
          enfant_id?: string
          id?: string
          mot_correct?: string
          mot_transcrit?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfant_lexique_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
      enfant_membres: {
        Row: {
          enfant_id: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          enfant_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          enfant_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfant_membres_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
      enfants: {
        Row: {
          created_at: string
          date_naissance: string | null
          diagnostic_label: string | null
          id: string
          mdph_derniere_demande: string | null
          mdph_type_demande: string | null
          prenom: string
          sexe: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_naissance?: string | null
          diagnostic_label?: string | null
          id?: string
          mdph_derniere_demande?: string | null
          mdph_type_demande?: string | null
          prenom: string
          sexe?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_naissance?: string | null
          diagnostic_label?: string | null
          id?: string
          mdph_derniere_demande?: string | null
          mdph_type_demande?: string | null
          prenom?: string
          sexe?: string | null
          user_id?: string
        }
        Relationships: []
      }
      intervenants: {
        Row: {
          actif: boolean
          created_at: string
          email: string | null
          enfant_id: string
          id: string
          nom: string
          notes: string | null
          photo_url: string | null
          specialite: string | null
          structure: string | null
          telephone: string | null
          type: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          email?: string | null
          enfant_id: string
          id?: string
          nom: string
          notes?: string | null
          photo_url?: string | null
          specialite?: string | null
          structure?: string | null
          telephone?: string | null
          type?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          email?: string | null
          enfant_id?: string
          id?: string
          nom?: string
          notes?: string | null
          photo_url?: string | null
          specialite?: string | null
          structure?: string | null
          telephone?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervenants_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          enfant_id: string
          expires_at: string | null
          id: string
          invited_by: string
          role: string
          status: string | null
          token: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          enfant_id: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: string
          status?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          enfant_id?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: string
          status?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          content_structured: Json | null
          created_at: string
          enfant_id: string | null
          file_url: string | null
          id: string
          intervenant_id: string | null
          memo_date: string
          processing_status: string
          transcription_raw: string | null
          type: string
          user_id: string
        }
        Insert: {
          content_structured?: Json | null
          created_at?: string
          enfant_id?: string | null
          file_url?: string | null
          id?: string
          intervenant_id?: string | null
          memo_date?: string
          processing_status?: string
          transcription_raw?: string | null
          type?: string
          user_id: string
        }
        Update: {
          content_structured?: Json | null
          created_at?: string
          enfant_id?: string | null
          file_url?: string | null
          id?: string
          intervenant_id?: string | null
          memo_date?: string
          processing_status?: string
          transcription_raw?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memos_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_intervenant_id_fkey"
            columns: ["intervenant_id"]
            isOneToOne: false
            referencedRelation: "intervenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nsm_scores: {
        Row: {
          context: string | null
          id: string
          measured_at: string
          score: number
          user_id: string
        }
        Insert: {
          context?: string | null
          id?: string
          measured_at?: string
          score: number
          user_id: string
        }
        Update: {
          context?: string | null
          id?: string
          measured_at?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          onboarding_completed: boolean
          prenom: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          prenom?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          prenom?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sessions_activite: {
        Row: {
          activite_id: string
          created_at: string | null
          distance: number | null
          duree_secondes: number | null
          enfant_id: string
          id: string
          notes: string | null
        }
        Insert: {
          activite_id: string
          created_at?: string | null
          distance?: number | null
          duree_secondes?: number | null
          enfant_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          activite_id?: string
          created_at?: string | null
          distance?: number | null
          duree_secondes?: number | null
          enfant_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_activite_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "activites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_activite_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          name_normalized: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          name_normalized: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          name_normalized?: string
        }
        Relationships: []
      }
      syntheses: {
        Row: {
          cas_usage: string
          contenu: string | null
          created_at: string | null
          enfant_id: string
          etat_emotionnel: string | null
          id: string
          metadata: Json | null
          periode_debut: string | null
          periode_fin: string | null
          reponses_transmission: Json | null
          user_id: string
          vocal_mdph: string | null
        }
        Insert: {
          cas_usage: string
          contenu?: string | null
          created_at?: string | null
          enfant_id: string
          etat_emotionnel?: string | null
          id?: string
          metadata?: Json | null
          periode_debut?: string | null
          periode_fin?: string | null
          reponses_transmission?: Json | null
          user_id: string
          vocal_mdph?: string | null
        }
        Update: {
          cas_usage?: string
          contenu?: string | null
          created_at?: string | null
          enfant_id?: string
          etat_emotionnel?: string | null
          id?: string
          metadata?: Json | null
          periode_debut?: string | null
          periode_fin?: string | null
          reponses_transmission?: Json | null
          user_id?: string
          vocal_mdph?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syntheses_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_membre_role: { Args: { eid: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
