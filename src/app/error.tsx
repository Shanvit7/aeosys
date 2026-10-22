"use client"

import { useTransition } from "react"
import Spinner from "@/components/animata/progress/spinner"
import { Button } from "@/components/ui/button"

const ErrorPage = ({ error, retry }: { error: unknown; retry: () => void }) => {
  const [pending, startTransition] = useTransition()
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-12 text-foreground">
      <title>Something went wrong — Aeosys</title>
      <section className="w-full max-w-lg" aria-labelledby="error-heading">
        <p className="mb-12 text-xl font-semibold tracking-tight">
          Aeosys<span className="text-primary">.</span>
        </p>
        <div role="alert">
          <p className="mb-4 font-mono text-xs tracking-widest text-primary uppercase">
            Unexpected error
          </p>
          <h1
            id="error-heading"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            We couldn’t load this page.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Try again in a moment. If the problem continues, head back to the start or get in touch
            for help.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={() => startTransition(() => retry())}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <span aria-hidden="true">
                  <Spinner
                    className="motion-reduce:animate-none"
                    outerSize="size-4"
                    childSize="size-3"
                  />
                </span>
                Trying again…
              </>
            ) : (
              "Try again"
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            role="link"
            render={
              // eslint-disable-next-line react-doctor/nextjs-no-a-element -- Hard reload must work even when the router fails.
              <a href="/">Back to start</a>
            }
            nativeButton={false}
          />
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>
            Still stuck?{" "}
            <a
              href="mailto:shanvit7@gmail.com"
              className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Contact support
            </a>
          </p>
          {digest ? <p className="break-all font-mono text-xs">Error reference: {digest}</p> : null}
        </div>
      </section>
    </main>
  )
}

export default ErrorPage
