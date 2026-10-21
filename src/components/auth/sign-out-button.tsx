"use client"

import { LoaderCircle, LogOut, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { createCallable, type UserComponent } from "react-call"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"

type ConfirmationProps = Record<string, never>

const ConfirmSignOutContent: UserComponent<ConfirmationProps, boolean, Record<string, never>> = ({
  call,
}) => {
  const completed = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const finish = (confirmed: boolean) => {
    if (completed.current) return
    completed.current = true
    call.end(confirmed)
  }
  const handleSignOut = async () => {
    setPending(true)
    setError(false)
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error(result.error.message)
      finish(true)
    } catch {
      setError(true)
      setPending(false)
    }
  }

  return (
    <AlertDialog open={!call.ended} onOpenChange={(open) => !open && !pending && finish(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>
          <AlertDialogDescription>You can sign in again anytime.</AlertDialogDescription>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              Sign out failed. Check your connection and try again.
            </p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => void handleSignOut()}>
            {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {pending ? "Signing out…" : "Sign out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ConfirmSignOut = createCallable(ConfirmSignOutContent)

export const SignOutButton = () => {
  const router = useRouter()
  const signOut = async () => {
    if (!(await ConfirmSignOut.call({}))) return
    router.replace("/login")
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-lg" aria-label="Account menu" />}
        >
          <UserRound aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => void signOut()}>
            <LogOut data-icon="inline-start" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmSignOut />
    </>
  )
}
