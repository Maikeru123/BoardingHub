import type { Database as GeneratedDatabase } from "./database"

type PublicSchema = GeneratedDatabase["public"]
type Functions = PublicSchema["Functions"]
type SaveHouse = Functions["save_boarding_house"]

// PostgreSQL accepts null RPC arguments, but the generator cannot infer the
// contract used by save_boarding_house: null creates; a UUID updates. Keep this
// narrow correction outside the generated file so regeneration stays safe.
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Functions"> & {
    Functions: Omit<Functions, "save_boarding_house"> & {
      save_boarding_house: Omit<SaveHouse, "Args"> & {
        Args: Omit<SaveHouse["Args"], "house_id"> & { house_id: string | null }
      }
    }
  }
}
