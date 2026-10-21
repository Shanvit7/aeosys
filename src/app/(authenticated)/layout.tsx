import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { type ReactNode, Suspense } from "react"
import { getSession } from "@/lib/server/auth"
import { WorkspaceLoading } from "./loading"

const AuthenticatedContent = async ({ children }: { children: ReactNode }) => {
  const session = await getSession(await headers())
  if (!session) redirect("/login")
  return children
}

const AuthenticatedLayout = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<WorkspaceLoading />}>
    <AuthenticatedContent>{children}</AuthenticatedContent>
  </Suspense>
)

export default AuthenticatedLayout
