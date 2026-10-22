import dotenv from "dotenv"
import { logger } from "@/lib/server/logger"

dotenv.config({ path: ".env.local" })

const seedDemo = async () => {
  const { auth, authPool } = await import("../src/lib/server/auth")
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase()
  const password = process.env.DEMO_PASSWORD

  if (!email || !password || password.length < 12) {
    throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD (at least 12 characters).")
  }

  const context = await auth.$context
  const existing = await context.internalAdapter.findUserByEmail(email)
  if (existing) {
    logger.info("Demo account already exists", { email })
  } else {
    const hashedPassword = await context.password.hash(password)
    const user = await context.internalAdapter.createUser(
      { email, name: "Aeosys Demo", emailVerified: true },
      { method: "email-password" },
    )
    if (!user) throw new Error("Could not create demo user.")
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hashedPassword,
    })
    logger.info("Created demo account", { email })
  }

  await authPool.end()
}

void seedDemo().catch((error: unknown) => {
  logger.error("Demo account seeding failed", { error })
  process.exitCode = 1
})
