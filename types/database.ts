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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      boarding_house_amenities: {
        Row: {
          amenity_id: string
          boarding_house_id: string
        }
        Insert: {
          amenity_id: string
          boarding_house_id: string
        }
        Update: {
          amenity_id?: string
          boarding_house_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_house_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_house_amenities_boarding_house_id_fkey"
            columns: ["boarding_house_id"]
            isOneToOne: false
            referencedRelation: "boarding_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_houses: {
        Row: {
          barangay: string | null
          city: string | null
          contact_number: string | null
          created_at: string
          description: string | null
          house_rules: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          province: string | null
          status: string
          street: string | null
          updated_at: string
        }
        Insert: {
          barangay?: string | null
          city?: string | null
          contact_number?: string | null
          created_at?: string
          description?: string | null
          house_rules?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          province?: string | null
          status?: string
          street?: string | null
          updated_at?: string
        }
        Update: {
          barangay?: string | null
          city?: string | null
          contact_number?: string | null
          created_at?: string
          description?: string | null
          house_rules?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          province?: string | null
          status?: string
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_houses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          created_at: string
          id: string
          image_path: string
          is_primary: boolean
          listing_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          is_primary?: boolean
          listing_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          is_primary?: boolean
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          boarding_house_id: string
          created_at: string
          date_posted: string | null
          description: string | null
          id: string
          listing_status: string
          title: string
          updated_at: string
        }
        Insert: {
          boarding_house_id: string
          created_at?: string
          date_posted?: string | null
          description?: string | null
          id?: string
          listing_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          boarding_house_id?: string
          created_at?: string
          date_posted?: string | null
          description?: string | null
          id?: string
          listing_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_boarding_house_id_fkey"
            columns: ["boarding_house_id"]
            isOneToOne: false
            referencedRelation: "boarding_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_number: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          first_name: string
          id: string
          last_name: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          boarding_house_id: string
          capacity: number
          created_at: string
          description: string | null
          id: string
          monthly_rent: number
          room_number: string | null
          room_type: string
          status: string
          updated_at: string
        }
        Insert: {
          boarding_house_id: string
          capacity: number
          created_at?: string
          description?: string | null
          id?: string
          monthly_rent: number
          room_number?: string | null
          room_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          boarding_house_id?: string
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          monthly_rent?: number
          room_number?: string | null
          room_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_boarding_house_id_fkey"
            columns: ["boarding_house_id"]
            isOneToOne: false
            referencedRelation: "boarding_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          admin_id: string | null
          date_reviewed: string | null
          date_submitted: string
          id: string
          listing_id: string
          remarks: string | null
          status: string
        }
        Insert: {
          admin_id?: string | null
          date_reviewed?: string | null
          date_submitted?: string
          id?: string
          listing_id: string
          remarks?: string | null
          status?: string
        }
        Update: {
          admin_id?: string | null
          date_reviewed?: string | null
          date_submitted?: string
          id?: string
          listing_id?: string
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_listing_photo: {
        Args: { object_path: string; target_listing: string }
        Returns: string
      }
      remove_listing_photo: { Args: { target_photo: string }; Returns: string }
      review_listing: {
        Args: {
          decision: string
          review_remarks?: string
          target_listing: string
        }
        Returns: undefined
      }
      save_boarding_house: {
        Args: { amenity_ids: string[]; details: Json; house_id: string }
        Returns: string
      }
      set_account_status: {
        Args: { new_status: string; target_user: string }
        Returns: undefined
      }
      set_primary_photo: { Args: { target_photo: string }; Returns: undefined }
      submit_listing: { Args: { target_listing: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
