import Spinner from "@/components/animata/progress/spinner"

const PublicLoading = () => (
  <main
    aria-busy="true"
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-4"
  >
    <div className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
      <span>Aeosys</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <span aria-hidden="true">
        <Spinner className="motion-reduce:animate-none" outerSize="size-4" childSize="size-3" />
      </span>
      Loading…
    </div>
  </main>
)

export default PublicLoading
