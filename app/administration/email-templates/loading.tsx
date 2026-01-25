export default function Loading() {
  return (
    <div className="p-8">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="h-12 bg-muted rounded w-full max-w-md" />
        <div className="space-y-4">
          <div className="h-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}
