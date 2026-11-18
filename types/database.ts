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
      boarding_house_photos: {
        Row: {
          boarding_house_id: string
          created_at: string
          id: string
          image_path: string
          is_primary: boolean
        }
        Insert: {
          boarding_house_id: string
          created_at?: string
          id?: string
          image_path: string
          is_primary?: boolean
        }
        Update: {
          boarding_house_id?: string
          created_at?: string
          id?: string
          image_path?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "boarding_house_photos_boarding_house_id_fkey"
            columns: ["boarding_house_id"]
            isOneToOne: false
            referencedRelation: "boarding_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_houses: {
        Row: {
          advance_months_required: number
          barangay: string | null
          barangay_code: string | null
          city_municipality: string | null
          city_municipality_code: string | null
          contact_number: string | null
          created_at: string
          current_month_required: boolean
          description: string | null
          house_rules: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          postal_code: string | null
          province: string | null
          province_code: string | null
          status: string
          street: string | null
          updated_at: string
          verification_remarks: string | null
          verification_status: string
          verification_submitted_at: string | null
          verified_at: string | null
          verified_by_admin_id: string | null
        }
        Insert: {
          advance_months_required?: number
          barangay?: string | null
          barangay_code?: string | null
          city_municipality?: string | null
          city_municipality_code?: string | null
          contact_number?: string | null
          created_at?: string
          current_month_required?: boolean
          description?: string | null
          house_rules?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          postal_code?: string | null
          province?: string | null
          province_code?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          verification_remarks?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
        }
        Update: {
          advance_months_required?: number
          barangay?: string | null
          barangay_code?: string | null
          city_municipality?: string | null
          city_municipality_code?: string | null
          contact_number?: string | null
          created_at?: string
          current_month_required?: boolean
          description?: string | null
          house_rules?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          postal_code?: string | null
          province?: string | null
          province_code?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          verification_remarks?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boarding_houses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_houses_verified_by_admin_id_fkey"
            columns: ["verified_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "inquiry_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      room_photos: {
        Row: {
          created_at: string
          id: string
          image_path: string
          is_primary: boolean
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          is_primary?: boolean
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          is_primary?: boolean
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
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
      feedback: {
        Row: {
          date_submitted: string
          id: string
          message: string
          status: string
          subject: string
          submitted_by_id: string
        }
        Insert: {
          date_submitted?: string
          id?: string
          message: string
          status?: string
          subject: string
          submitted_by_id: string
        }
        Update: {
          date_submitted?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          submitted_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submitted_by_id_fkey"
            columns: ["submitted_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          id: string
          payment_date: string
          payment_method: string
          payment_status: string
          payment_type: string
          proof_image_path: string | null
          reference_number: string | null
          remarks: string | null
          rental_transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          id?: string
          payment_date?: string
          payment_method: string
          payment_status?: string
          payment_type: string
          proof_image_path?: string | null
          reference_number?: string | null
          remarks?: string | null
          rental_transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          payment_status?: string
          payment_type?: string
          proof_image_path?: string | null
          reference_number?: string | null
          remarks?: string | null
          rental_transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_rental_transaction_id_fkey"
            columns: ["rental_transaction_id"]
            isOneToOne: false
            referencedRelation: "rental_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_requests: {
        Row: {
          created_at: string
          expected_move_out_date: string | null
          id: string
          move_in_date: string
          rejection_reason: string | null
          rental_type: string
          request_date: string
          room_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_move_out_date?: string | null
          id?: string
          move_in_date: string
          rejection_reason?: string | null
          rental_type: string
          request_date?: string
          room_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_move_out_date?: string | null
          id?: string
          move_in_date?: string
          rejection_reason?: string | null
          rental_type?: string
          request_date?: string
          room_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_transactions: {
        Row: {
          actual_end_date: string | null
          advance_months_required: number
          created_at: string
          current_month_required: boolean
          expected_end_date: string | null
          id: string
          initial_payment_amount: number
          monthly_rent: number
          rental_type: string
          rental_request_id: string
          room_id: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          advance_months_required: number
          created_at?: string
          current_month_required: boolean
          expected_end_date?: string | null
          id?: string
          initial_payment_amount: number
          monthly_rent: number
          rental_type: string
          rental_request_id: string
          room_id: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          advance_months_required?: number
          created_at?: string
          current_month_required?: boolean
          expected_end_date?: string | null
          id?: string
          initial_payment_amount?: number
          monthly_rent?: number
          rental_type?: string
          rental_request_id?: string
          room_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_transactions_rental_request_id_fkey"
            columns: ["rental_request_id"]
            isOneToOne: true
            referencedRelation: "rental_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          date_reported: string
          description: string | null
          id: string
          listing_id: string
          reason: string
          status: string
          reporter_id: string
        }
        Insert: {
          date_reported?: string
          description?: string | null
          id?: string
          listing_id: string
          reason: string
          status?: string
          reporter_id: string
        }
        Update: {
          date_reported?: string
          description?: string | null
          id?: string
          listing_id?: string
          reason?: string
          status?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          boarding_house_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          rental_transaction_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          boarding_house_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          rental_transaction_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          boarding_house_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          rental_transaction_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_boarding_house_id_fkey"
            columns: ["boarding_house_id"]
            isOneToOne: false
            referencedRelation: "boarding_houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_rental_transaction_id_fkey"
            columns: ["rental_transaction_id"]
            isOneToOne: true
            referencedRelation: "rental_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_verifications: {
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
            foreignKeyName: "listing_verifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_verifications_listing_id_fkey"
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
      add_boarding_house_photo: {
        Args: { object_path: string; target_house: string }
        Returns: string
      }
      add_room_photo: {
        Args: { object_path: string; target_room: string }
        Returns: string
      }
      cancel_rental_request: {
        Args: { target_request: string }
        Returns: undefined
      }
      cancel_rental_transaction: {
        Args: { target_rental: string }
        Returns: undefined
      }
      check_room_availability: {
        Args: {
          requested_end?: string | null
          requested_start: string
          target_room: string
        }
        Returns: boolean
      }
      decide_rental_request: {
        Args: {
          decision: string
          rejection_reason?: string | null
          target_request: string
        }
        Returns: string
      }
      discover_boarding_houses: {
        Args: {
          amenity_filters?: string[]
          available_only?: boolean
          barangay_filter?: string
          city_filter?: string
          maximum_rent?: number
          minimum_capacity?: number
          minimum_rent?: number
          page_offset?: number
          page_size?: number
          province_filter?: string
          room_type_filter?: string
          search_text?: string
          sort_by?: string
        }
        Returns: {
          amenities: Json
          available_room_count: number
          barangay: string
          city_municipality: string
          date_posted: string
          house_description: string
          house_id: string
          house_name: string
          listing_description: string
          listing_id: string
          listing_title: string
          postal_code: string
          primary_photo_path: string
          province: string
          room_types: string[]
          starting_rent: number
          total_count: number
        }[]
      }
      get_public_owner_profile: {
        Args: { target_house: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_public_room_states: {
        Args: { target_house: string }
        Returns: {
          availability_state: string
          next_reserved_start: string | null
          room_id: string
        }[]
      }
      list_inquiry_summaries: {
        Args: { page_offset?: number; page_size?: number }
        Returns: {
          house_id: string
          house_name: string
          last_message_at: string
          latest_message: string
          latest_message_created_at: string
          latest_message_id: string
          latest_message_read_at: string
          latest_sender_id: string
          listing_id: string
          listing_title: string
          other_first_name: string
          other_last_name: string
          other_profile_id: string
          primary_photo_path: string
          tenant_id: string
          thread_created_at: string
          thread_id: string
          thread_status: string
          thread_updated_at: string
          total_count: number
          unread_count: number
        }[]
      }
      mark_inquiry_read: { Args: { target_thread: string }; Returns: undefined }
      moderate_feedback: {
        Args: { decision: string; target_feedback: string }
        Returns: undefined
      }
      moderate_report: {
        Args: {
          decision: string
          suspend_listing?: boolean
          target_report: string
        }
        Returns: undefined
      }
      moderate_room: {
        Args: { new_status: string; target_room: string }
        Returns: undefined
      }
      remove_boarding_house_photo: {
        Args: { target_photo: string }
        Returns: string
      }
      remove_room_photo: {
        Args: { target_photo: string }
        Returns: string
      }
      replace_boarding_house_photo: {
        Args: { object_path: string; target_photo: string }
        Returns: string
      }
      replace_room_photo: {
        Args: { object_path: string; target_photo: string }
        Returns: string
      }
      review_listing: {
        Args: {
          decision: string
          review_remarks?: string
          target_listing: string
        }
        Returns: undefined
      }
      review_boarding_house: {
        Args: {
          decision: string
          review_remarks?: string | null
          target_house: string
        }
        Returns: undefined
      }
      review_payment: {
        Args: {
          decision: string
          owner_remarks?: string | null
          target_payment: string
        }
        Returns: undefined
      }
      save_boarding_house: {
        Args: { amenity_ids: string[]; details: Json; house_id: string }
        Returns: string
      }
      send_inquiry_message: {
        Args: { body: string; target_thread: string }
        Returns: string
      }
      set_rental_end: {
        Args: {
          actual_end?: string | null
          expected_end?: string | null
          target_rental: string
        }
        Returns: undefined
      }
      set_account_status: {
        Args: { new_status: string; target_user: string }
        Returns: undefined
      }
      set_inquiry_status: {
        Args: { new_status: string; target_thread: string }
        Returns: undefined
      }
      set_primary_boarding_house_photo: {
        Args: { target_photo: string }
        Returns: undefined
      }
      set_primary_room_photo: {
        Args: { target_photo: string }
        Returns: undefined
      }
      start_inquiry: {
        Args: { first_message: string; target_listing: string }
        Returns: string
      }
      submit_feedback: {
        Args: { feedback_message: string; feedback_subject: string }
        Returns: string
      }
      submit_boarding_house: {
        Args: { target_house: string }
        Returns: undefined
      }
      submit_listing: { Args: { target_listing: string }; Returns: undefined }
      submit_listing_report: {
        Args: {
          report_description?: string | null
          report_reason: string
          target_listing: string
        }
        Returns: string
      }
      submit_payment: {
        Args: {
          amount_paid: number
          kind: string
          method: string
          period_end?: string | null
          period_start?: string | null
          proof_path?: string | null
          reference?: string | null
          target_rental: string
        }
        Returns: string
      }
      submit_rental_request: {
        Args: {
          requested_end?: string | null
          requested_start: string
          requested_type: string
          target_room: string
        }
        Returns: string
      }
      submit_review: {
        Args: {
          review_comment?: string | null
          review_rating: number
          target_rental: string
        }
        Returns: string
      }
      sync_rental_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
