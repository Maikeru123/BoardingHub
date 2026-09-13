import "server-only"
export function databaseError(error: { code?: string; message: string }) {
  if (error.code === "23505")
    return "That record already exists. Check the room number or try refreshing."
  if (error.code === "42501")
    return "You do not have permission to make this change."
  if (error.code === "23514" || error.code === "22P02")
    return "Please check the values and try again."
  if (error.code === "23503")
    return "A related record was changed or removed. Refresh and try again."
  if (error.code === "P0001") return error.message
  console.error("Database operation failed", { code: error.code })
  return "We could not save your changes. Please try again."
}
