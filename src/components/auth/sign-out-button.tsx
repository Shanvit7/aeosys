"use client"

import { LoaderCircle, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
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
          <AlertDialogCancel size="lg" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="shine"
            size="lg"
            disabled={pending}
            onClick={() => void handleSignOut()}
          >
            {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {pending ? "Signing out…" : "Sign out"}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 ease-in-out group-hover/shine:translate-x-full group-disabled/shine:hidden motion-reduce:hidden"
            >
              <span className="absolute top-0 left-1/2 h-full w-12 rotate-30 scale-y-150 bg-foreground/15" />
            </span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ConfirmSignOut = createCallable(ConfirmSignOutContent)

export const SignOutButton = () => {
  const router = useRouter()
  const [isNavigationPending, startNavigation] = useTransition()
  const signOut = () => {
    if (isNavigationPending) return
    startNavigation(async () => {
      if (!(await ConfirmSignOut.call({}))) return
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Sign out"
        aria-haspopup="dialog"
        aria-busy={isNavigationPending}
        disabled={isNavigationPending}
        onClick={signOut}
      >
        {isNavigationPending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <LogOut aria-hidden="true" />
        )}
      </Button>
      <ConfirmSignOut />
    </>
  )
}
