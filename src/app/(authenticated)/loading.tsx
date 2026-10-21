const Skeleton = ({ className }: { className: string }) => (
  <div aria-hidden="true" className={`animate-pulse rounded-md bg-muted ${className}`} />
)

const WorkspaceLoading = () => (
  <div aria-busy="true" className="min-h-dvh bg-background">
    <header className="px-4 sm:px-8">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </header>
    <main className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-8 sm:px-8 sm:py-10">
      <section className="grid gap-6 border-b border-border/50 pb-7 lg:grid-cols-2 lg:items-end">
        <div className="grid max-w-xl gap-3">
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="mt-1 h-5 w-full max-w-lg" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:items-end">
          <Skeleton className="h-4 w-28 sm:col-span-2" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-36" />
        </div>
      </section>
      <section aria-hidden="true" className="relative grid min-h-116 place-items-center">
        <div className="relative w-full max-w-md px-4">
          <div className="absolute inset-x-8 top-0 h-108 -translate-y-5 rounded-3xl border border-border/40 bg-card/40" />
          <div className="absolute inset-x-4 top-0 h-108 -translate-y-2.5 rounded-3xl border border-border/50 bg-card/70" />
          <div className="relative flex h-108 flex-col justify-between rounded-3xl border border-border/70 bg-card p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <div className="flex gap-1.5">
                <Skeleton className="h-1 w-6 rounded-full bg-primary/50" />
                <Skeleton className="size-1 rounded-full" />
                <Skeleton className="size-1 rounded-full" />
              </div>
            </div>
            <div className="grid justify-items-center gap-5 text-center">
              <Skeleton className="size-32 rounded-full sm:size-40" />
              <div className="grid w-full justify-items-center gap-3">
                <Skeleton className="h-7 w-64 max-w-full" />
                <Skeleton className="h-4 w-72 max-w-full" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
            </div>
            <div className="flex h-11 justify-end">
              <Skeleton className="size-11 rounded-full" />
            </div>
          </div>
        </div>
      </section>
      <p className="text-sm text-muted-foreground" role="status">
        <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-primary" />
        Opening your workspace…
      </p>
    </main>
  </div>
)

export default WorkspaceLoading
export { WorkspaceLoading }
