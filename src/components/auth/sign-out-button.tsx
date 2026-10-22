"use client"

import { LoaderCircle, LogOut, UserRound } from "lucide-react"
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
import { authClient } from "@/lib/auth-client"
import SpeedDial from "../../../components/animata/fabs/speed-dial"

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
  const pending = useRef(false)
  const [isNavigationPending, startNavigation] = useTransition()
  const signOut = async () => {
    if (pending.current || !(await ConfirmSignOut.call({}))) return
    pending.current = true
    startNavigation(() => {
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <>
      <SpeedDial
        aria-busy={isNavigationPending}
        className={isNavigationPending ? "pointer-events-none opacity-60" : undefined}
        direction="right"
        triggerLabel="Open account menu"
        triggerIcon={<UserRound aria-hidden="true" className="size-5" />}
        rotateTriggerIcon={false}
        actionButtons={[
          {
            key: "sign-out",
            label: "Sign out",
            icon: isNavigationPending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <LogOut aria-hidden="true" />
            ),
            action: () => void signOut(),
          },
        ]}
      />
      <ConfirmSignOut />
    </>
  )
}
