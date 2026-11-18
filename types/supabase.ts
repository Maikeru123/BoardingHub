import type { Database as GeneratedDatabase } from "./database"

type PublicSchema = GeneratedDatabase["public"]
type Functions = PublicSchema["Functions"]
type SaveHouse = Functions["save_boarding_house"]
type DiscoverHouses = Functions["discover_boarding_houses"]

// PostgreSQL accepts null RPC arguments, but the generator cannot infer the
// contract used by save_boarding_house: null creates; a UUID updates. Keep this
// narrow correction outside the generated file so regeneration stays safe.
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Functions"> & {
    Functions: Omit<
      Functions,
      "save_boarding_house" | "discover_boarding_houses"
    > & {
      save_boarding_house: Omit<SaveHouse, "Args"> & {
        Args: Omit<SaveHouse["Args"], "house_id"> & { house_id: string | null }
      }
      discover_boarding_houses: Omit<DiscoverHouses, "Args"> & {
        Args: {
          amenity_filters?: string[] | null
          available_only?: boolean
          barangay_filter?: string | null
          city_filter?: string | null
          maximum_rent?: number | null
          minimum_capacity?: number | null
          minimum_rent?: number | null
          page_offset?: number
          page_size?: number
          province_filter?: string | null
          room_type_filter?: string | null
          search_text?: string | null
          sort_by?: string
        }
      }
    }
  }
}
