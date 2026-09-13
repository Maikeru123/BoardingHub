import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { randomBytes, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { createServer } from "node:net"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import { chromium, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

// Explicit live integration test: run only with npm run test:e2e:workflow.
// It uses temporary accounts/property/photos and cleans up its own IDs only.
test(
  "owner saves a draft, submits it, and admin can review it",
  { timeout: 150_000 },
  async (t) => {
    const env = parseEnv(
      readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    )
    const projectRef = readFileSync(
      new URL("../supabase/.temp/project-ref", import.meta.url),
      "utf8"
    ).trim()
    assert.ok(
      /^[a-z0-9]{20}$/.test(projectRef) &&
        env.NEXT_PUBLIC_SUPABASE_URL === `https://${projectRef}.supabase.co`,
      "Local configuration must match the linked project."
    )
    const probe = createServer()
    await new Promise((resolve, reject) => {
      probe.once("error", reject)
      probe.listen(0, "127.0.0.1", resolve)
    })
    const port = probe.address().port
    await new Promise((resolve) => probe.close(resolve))
    const baseURL = `http://127.0.0.1:${port}`
    const server = spawn(
      process.execPath,
      [
        fileURLToPath(
          new URL("../node_modules/next/dist/bin/next", import.meta.url)
        ),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { stdio: "ignore", windowsHide: true }
    )
    t.after(() => server.kill())
    let ready = false
    for (let attempt = 0; attempt < 50; attempt++) {
      ready = await fetch(`${baseURL}/login`)
        .then((response) => response.ok)
        .catch(() => false)
      if (ready) break
      await delay(200)
    }
    assert.ok(ready, "Build the app before running the live workflow test.")
    const cli = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../node_modules/supabase/dist/supabase.js", import.meta.url)
        ),
        "projects",
        "api-keys",
        "--project-ref",
        projectRef,
        "--reveal",
        "--output",
        "json",
      ],
      { encoding: "utf8", windowsHide: true, timeout: 30_000 }
    )
    assert.equal(
      cli.status,
      0,
      "Supabase CLI access is required; raw key output withheld."
    )
    let keys
    try {
      keys = JSON.parse(cli.stdout)
    } catch {
      throw new Error("Unexpected CLI key response; raw output withheld.")
    }
    const key =
      keys.find((item) => item.type === "secret")?.api_key ||
      keys.find((item) => item.name === "service_role")?.api_key
    assert.ok(key, "An administrative key is required for temporary fixtures.")
    const options = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, options)
    const nonce = randomUUID()
    const userIds = []
    let houseId, listingId, browser, ownerClient
    const title = `Workflow test ${nonce}`
    async function checked(promise) {
      const { data, error } = await promise
      if (error)
        throw new Error(
          `Fixture/API request failed: ${error.code || error.status || "unknown"}`
        )
      return data
    }
    async function account(role) {
      const email = `${role}.${nonce}@boardinghub-test.invalid`
      const password = `${randomBytes(24).toString("base64url")}aA1!`
      const { user } = await checked(
        admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { first_name: "Workflow", last_name: "Test", role },
        })
      )
      userIds.push(user.id)
      if (role === "admin")
        await checked(
          admin.from("profiles").update({ role: "admin" }).eq("id", user.id)
        )
      return { email, password, id: user.id }
    }
    async function signIn(page, credentials, role) {
      await page.goto(`${baseURL}/login`)
      await page.getByLabel("Email address").fill(credentials.email)
      await page.getByLabel(/^Password/).fill(credentials.password)
      await page.getByRole("button", { name: "Sign in", exact: true }).click()
      await expect(page).toHaveURL(`${baseURL}/${role}`, { timeout: 30_000 })
    }
    try {
      const owner = await account("owner")
      const reviewer = await account("admin")
      ownerClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        options
      )
      await checked(
        ownerClient.auth.signInWithPassword({
          email: owner.email,
          password: owner.password,
        })
      )
      houseId = await checked(
        ownerClient.rpc("save_boarding_house", {
          house_id: null,
          amenity_ids: [],
          details: {
            name: title,
            city: "Test City",
            province: "Test Province",
            status: "active",
          },
        })
      )
      await checked(
        ownerClient.from("rooms").insert({
          boarding_house_id: houseId,
          room_number: "Test 1",
          room_type: "single",
          monthly_rent: 5000,
          capacity: 1,
        })
      )
      browser = await chromium.launch({
        channel:
          process.env.PLAYWRIGHT_CHANNEL ||
          (process.platform === "win32" ? "msedge" : undefined),
      })
      const ownerContext = await browser.newContext()
      const adminContext = await browser.newContext()
      const ownerPage = await ownerContext.newPage()
      const adminPage = await adminContext.newPage()
      await signIn(ownerPage, owner, "owner")
      await ownerPage.goto(`${baseURL}/owner/listings/new`)
      await ownerPage.getByLabel("Listing title").fill(title)
      const started = Date.now()
      await ownerPage
        .getByRole("button", { name: "Save draft and continue" })
        .click()
      await expect(
        ownerPage.getByRole("heading", {
          name: "Draft saved — not submitted yet",
        })
      ).toBeVisible({ timeout: 30_000 })
      console.log(`Draft saved and opened in ${Date.now() - started} ms.`)
      listingId = new URL(ownerPage.url()).pathname.split("/").at(-1)
      assert.match(listingId, /^[0-9a-f-]{36}$/)
      await expect(
        ownerPage.getByRole("button", { name: "Submit for review" })
      ).toBeDisabled()
      await expect(
        ownerPage.getByRole("link", { name: "Add a photo below" })
      ).toBeVisible()
      await ownerPage
        .getByRole("navigation", { name: "Dashboard navigation" })
        .getByRole("link", { name: "Listings", exact: true })
        .click()
      await expect(
        ownerPage.getByRole("row").filter({ hasText: title })
      ).toContainText("Not submitted for review", { timeout: 20_000 })
      await ownerPage.getByRole("link", { name: title, exact: true }).click()

      await signIn(adminPage, reviewer, "admin")
      await adminPage
        .getByRole("link", { name: "All listings", exact: true })
        .click()
      await expect(
        adminPage.getByRole("row").filter({ hasText: title })
      ).toContainText("Draft", { timeout: 20_000 })
      await adminPage
        .getByRole("link", { name: "Listing verification", exact: true })
        .click()
      await expect(
        adminPage.getByRole("heading", { name: "Listing verification" })
      ).toBeVisible()
      await expect(
        adminPage.getByRole("row").filter({ hasText: title })
      ).toHaveCount(0)

      await ownerPage
        .locator('input[type="file"]')
        .setInputFiles(
          fileURLToPath(new URL("../public/bh1.jpg", import.meta.url))
        )
      await expect(
        ownerPage.getByRole("button", { name: "Submit for review" })
      ).toBeEnabled({ timeout: 30_000 })
      await ownerPage.getByRole("button", { name: "Submit for review" }).click()
      await ownerPage
        .getByRole("alertdialog")
        .getByRole("button", { name: "Confirm", exact: true })
        .click()
      await expect(
        ownerPage.getByText(
          "Submitted for administrator review. You can follow the decision in Verification status."
        )
      ).toBeVisible({ timeout: 30_000 })
      await expect(
        ownerPage.getByRole("button", { name: "Upload photo" })
      ).toHaveCount(0)
      await adminPage.reload()
      const row = adminPage.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Pending", { timeout: 20_000 })
      await row.getByRole("link", { name: "Review" }).click()
      await expect(
        adminPage.getByRole("img", { name: `${title} — photo 1` })
      ).toBeVisible({ timeout: 20_000 })
      await adminPage
        .getByLabel("Review decision")
        .selectOption("for_correction")
      await adminPage
        .getByLabel("Remarks")
        .fill("Please add another property photo for this test.")
      await adminPage
        .getByRole("button", { name: "Save review", exact: true })
        .click()
      await adminPage
        .getByRole("button", { name: "Confirm decision", exact: true })
        .click()
      await expect(adminPage).toHaveURL(`${baseURL}/admin/verifications`, {
        timeout: 20_000,
      })
      await ownerPage.reload()
      await expect(
        ownerPage.getByText("Please add another property photo for this test.")
      ).toBeVisible({ timeout: 20_000 })
      const listing = await checked(
        ownerClient
          .from("listings")
          .select("listing_status")
          .eq("id", listingId)
          .single()
      )
      assert.equal(listing.listing_status, "draft")
    } finally {
      await browser?.close()
      // Every cleanup is scoped to IDs created by this invocation.
      if (listingId) {
        const photos = await checked(
          admin
            .from("listing_photos")
            .select("image_path")
            .eq("listing_id", listingId)
        )
        if (photos.length)
          await checked(
            admin.storage
              .from("listing-photos")
              .remove(photos.map((photo) => photo.image_path))
          )
      }
      if (houseId)
        await checked(admin.from("boarding_houses").delete().eq("id", houseId))
      await ownerClient?.auth.signOut({ scope: "local" })
      for (const id of userIds) await checked(admin.auth.admin.deleteUser(id))
      console.log(
        "Temporary workflow accounts, property, listing, and photos removed."
      )
    }
  }
)
