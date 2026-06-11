export default function ChatLoading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="flex gap-1.5 animate-pulse">
        <div className="size-2 rounded-full bg-muted-foreground/25" />
        <div className="size-2 rounded-full bg-muted-foreground/25 [animation-delay:150ms]" />
        <div className="size-2 rounded-full bg-muted-foreground/25 [animation-delay:300ms]" />
      </div>
    </div>
  )
}
