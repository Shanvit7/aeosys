import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { type ReactNode, Suspense } from "react"
import { getSession } from "@/lib/server/auth"
import PublicLoading from "../loading"

// Session checks can redirect before a page renders, so entry need not be instant.
export const instant = false

const AuthenticatedContent = async ({ children }: { children: ReactNode }) => {
  const session = await getSession(await headers())
  if (!session) redirect("/login")
  return children
}

const AuthenticatedLayout = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PublicLoading />}>
    <AuthenticatedContent>{children}</AuthenticatedContent>
  </Suspense>
)

export default AuthenticatedLayout
