"use client"

import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

const LoginWalkthrough = dynamic(() => import("@/components/auth/login-walkthrough"), {
  ssr: false,
  loading: () => <div className="aspect-3/2 rounded-2xl border bg-background" />,
})

const LoginPage = () => {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setPending(true)
    const form = new FormData(event.currentTarget)
    try {
      const result = await authClient.signIn.email({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      })
      if (result.error) {
        setError(
          result.error.status === 429
            ? "Too many attempts. Wait a minute, then try again."
            : "Unable to sign in with those credentials.",
        )
        return
      }
      router.replace("/")
      router.refresh()
    } catch {
      setError("Sign-in failed. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col px-4 py-4 sm:px-8 lg:px-12 lg:py-5 [@media(max-height:680px)]:py-2">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 [@media(max-height:680px)]:hidden">
        <div className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <Image src="/icon.svg" alt="" width={32} height={32} priority />
          Aeosys
        </div>
        <span className="hidden font-mono text-xs tracking-widest text-muted-foreground uppercase sm:inline">
          SEO + AI readiness
        </span>
      </header>

      <div className="mx-auto flex w-full flex-1 items-center justify-center py-8 [@media(max-height:680px)]:py-2">
        <div className="grid w-full max-w-md overflow-hidden rounded-3xl border border-border/70 bg-card p-1.5 sm:rounded-4xl sm:p-2 lg:max-w-5xl lg:grid-cols-2">
          <section
            aria-labelledby="walkthrough-heading"
            className="relative hidden min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-3xl bg-secondary/35 p-6 lg:flex xl:p-8 [@media(max-height:680px)]:hidden"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-radial from-primary/5 to-transparent"
            />
            <div className="relative">
              <p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                How it works
              </p>
            </div>

            <div className="relative min-w-0">
              <LoginWalkthrough />
            </div>
          </section>

          <section
            aria-labelledby="login-heading"
            className="relative flex min-w-0 flex-col justify-center overflow-hidden rounded-2xl bg-background px-5 py-7 sm:rounded-3xl sm:px-8 sm:py-9 lg:px-8 xl:px-12 [@media(max-height:680px)]:py-4"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 right-24 size-72 rounded-full bg-primary/10 blur-3xl"
            />
            <div className="relative mx-auto flex w-full max-w-sm flex-col">
              <div className="mb-5 flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary [@media(max-height:680px)]:hidden">
                <LockKeyhole aria-hidden="true" className="size-5" strokeWidth={1.5} />
              </div>
              <h1 id="login-heading" className="text-3xl font-semibold tracking-tight">
                Sign in
              </h1>
              <form
                className="mt-6 sm:mt-7 [@media(max-height:680px)]:mt-3"
                onSubmit={submit}
                aria-label="Sign in"
                aria-busy={pending}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      placeholder="you@company.com"
                      required
                      readOnly={pending}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="-my-3 -mr-2"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </Button>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      readOnly={pending}
                    />
                  </Field>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    className="w-full cursor-pointer"
                    variant="shine"
                    size="lg"
                    type="submit"
                    disabled={pending}
                  >
                    {pending ? "Signing in…" : "Sign in"}
                    {pending && (
                      <LoaderCircle
                        aria-hidden="true"
                        data-icon="inline-end"
                        className="motion-safe:animate-spin"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 ease-in-out group-hover/shine:translate-x-full group-disabled/shine:hidden motion-reduce:hidden"
                    >
                      <span className="absolute top-0 left-1/2 h-full w-12 rotate-30 scale-y-150 bg-foreground/15" />
                    </span>
                  </Button>
                </FieldGroup>
              </form>

              <p className="pt-5 text-sm leading-6 text-muted-foreground sm:pt-6 [@media(max-height:680px)]:hidden">
                For demo access, feel free to reach out to{" "}
                <a className="underline underline-offset-4" href="mailto:shanvit7@gmail.com">
                  shanvit7@gmail.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default LoginPage
