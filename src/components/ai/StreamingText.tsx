interface StreamingTextProps {
  text: string
  isStreaming?: boolean
}

export function StreamingText({ text, isStreaming = false }: StreamingTextProps) {
  return (
    <span>
      {text}
      {isStreaming && (
        <span
          className="inline-block w-px h-[1em] bg-foreground ml-0.5 animate-pulse"
          aria-hidden="true"
        >
          ▍
        </span>
      )}
    </span>
  )
}
