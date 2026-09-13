import { requireRole } from "@/lib/auth"
import { DashboardHeader } from "@/components/shared"
import { ProfileForm } from "@/components/forms/profile-form"
export default async function ProfilePage() {
  const { profile, user } = await requireRole("owner")
  return (
    <>
      <DashboardHeader
        title="Account settings"
        description="Keep your personal information up to date."
      />
      <ProfileForm profile={profile} email={user.email || ""} />
    </>
  )
}
