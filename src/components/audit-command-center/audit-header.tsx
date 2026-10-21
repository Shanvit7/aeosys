import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { Button } from "@/components/ui/button"

export const AuditHeader = () => (
  <header className="px-4 sm:px-8">
    <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 32 32"
          className="size-8 shrink-0 text-primary"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M15 3h2l13 26h-7l-3-6H12l-3 6H2L15 3Zm1 7-4 9h8l-4-9Z"
          />
          <path
            fill="var(--background)"
            d="M12 9.5h8V11h-8zm-2.5 5.5h13v1.5h-13zm-3 6h19v1.5h-19z"
          />
        </svg>
        Aeosys
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        <SignOutButton />
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <a href="/api/docs" target="_blank" rel="noreferrer" aria-label="Developer docs" />
          }
        >
          Developer docs <ExternalLink data-icon="inline-end" />
        </Button>
      </div>
    </div>
  </header>
)
