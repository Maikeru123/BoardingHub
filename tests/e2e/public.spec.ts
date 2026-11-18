import { test, expect } from "@playwright/test"

test("home page, navigation, search, and responsive layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Find a place. Feel at home." })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: `test-results/home-${testInfo.project.name}.png`,
    fullPage: true,
  })
  await page.getByLabel("Search boarding house listings").fill("Blue House")
  await page
    .getByRole("button", { name: "Find a place" })
    .count()
    .then(async (count) => {
      if (count)
        await page.getByRole("button", { name: "Find a place" }).click()
      else
        await page.getByLabel("Search boarding house listings").press("Enter")
    })
  await expect(page).toHaveURL(/\/boarding-houses\?search=Blue\+House/)
  await expect(page.getByLabel("Search boarding houses")).toHaveValue(
    "Blue House"
  )
  expect(errors).toEqual([])
})
test("registration roles and understandable password validation", async ({
  page,
}) => {
  await page.goto("/register?role=owner")
  await expect(page.getByLabel("I am joining as")).toHaveValue("owner")
  expect(
    await page.getByLabel("I am joining as").locator("option").allTextContents()
  ).toHaveLength(2)
  await page.getByLabel("First name").fill("Ana")
  await page.getByLabel("Last name").fill("Cruz")
  await page.getByLabel("Email address").fill("ana@example.com")
  await page.getByLabel(/^Password/).fill("strong-password")
  await page.getByLabel("Confirm password").fill("different-password")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText("Passwords do not match.")).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})
test("protected entrypoints redirect anonymous users before displaying protected content", async ({
  page,
}) => {
  for (const path of [
    "/tenant",
    "/tenant/listings",
    "/tenant/inquiries",
    "/owner",
    "/owner/inquiries",
    "/owner/boarding-houses/new",
    "/owner/rooms/new",
    "/owner/listings/new",
    "/admin",
    "/admin/users",
    "/admin/verifications",
    "/dashboard",
    "/reset-password",
  ]) {
    // Next.js may stream its loading boundary before emitting a server redirect.
    await page.goto(path)
    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    await expect(
      page.getByRole("heading", { name: "Good to see you again." })
    ).toBeVisible()
  }
})
test("password recovery and invalid callback states", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("link", { name: "Forgot password?" }).click()
  await expect(page).toHaveURL("/forgot-password")
  await expect(
    page.getByRole("button", { name: "Send reset link" })
  ).toBeVisible()
  await page.goto("/auth/callback?code=invalid&next=https://example.com")
  await expect(page).toHaveURL("/login?notice=invalid-link")
  await expect(
    page.getByText(/email link is invalid or has expired/)
  ).toBeVisible()
  await page.goto("/boarding-houses/not-a-uuid")
  await expect(
    page.getByRole("heading", { name: "This place isn’t on the map." })
  ).toBeVisible()
})
