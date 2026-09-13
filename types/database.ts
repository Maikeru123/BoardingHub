// Supabase-compatible types. Replace this file with `supabase gen types typescript`
// after applying the migrations; domain aliases live separately in types/domain.ts.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
type Timestamps = { created_at: string; updated_at: string }
type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Row>
  Update: Partial<Row>
  Relationships: []
}
export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Timestamps & {
          id: string
          first_name: string
          last_name: string
          contact_number: string | null
          role: string
          status: string
        },
        "id" | "first_name" | "last_name" | "role"
      >
      boarding_houses: Table<
        Timestamps & {
          id: string
          owner_id: string
          name: string
          description: string | null
          street: string | null
          barangay: string | null
          city: string | null
          province: string | null
          latitude: number | null
          longitude: number | null
          contact_number: string | null
          house_rules: string | null
          status: string
        },
        "owner_id" | "name"
      >
      rooms: Table<
        Timestamps & {
          id: string
          boarding_house_id: string
          room_number: string | null
          room_type: string
          monthly_rent: number
          capacity: number
          status: string
          description: string | null
        },
        "boarding_house_id" | "room_type" | "monthly_rent" | "capacity"
      >
      amenities: Table<
        { id: string; name: string; description: string | null },
        "name"
      >
      boarding_house_amenities: Table<
        { boarding_house_id: string; amenity_id: string },
        "boarding_house_id" | "amenity_id"
      >
      listings: Table<
        Timestamps & {
          id: string
          boarding_house_id: string
          title: string
          description: string | null
          listing_status: string
          date_posted: string | null
        },
        "boarding_house_id" | "title"
      >
      listing_photos: Table<
        {
          id: string
          listing_id: string
          image_path: string
          is_primary: boolean
          created_at: string
        },
        "listing_id" | "image_path"
      >
      verifications: Table<
        {
          id: string
          listing_id: string
          admin_id: string | null
          date_submitted: string
          date_reviewed: string | null
          status: string
          remarks: string | null
        },
        "listing_id"
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      save_boarding_house: {
        Args: { house_id: string | null; details: Json; amenity_ids: string[] }
        Returns: string
      }
      submit_listing: { Args: { target_listing: string }; Returns: undefined }
      review_listing: {
        Args: {
          target_listing: string
          decision: string
          review_remarks?: string | null
        }
        Returns: undefined
      }
      set_account_status: {
        Args: { target_user: string; new_status: string }
        Returns: undefined
      }
      add_listing_photo: {
        Args: { target_listing: string; object_path: string }
        Returns: string
      }
      set_primary_photo: { Args: { target_photo: string }; Returns: undefined }
      remove_listing_photo: { Args: { target_photo: string }; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
