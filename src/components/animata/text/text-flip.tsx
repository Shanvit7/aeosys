"use client"

const phrases = [
  "search previews",
  "page titles",
  "page structure",
  "structured data",
  "content clarity",
  "search previews",
]

const TextFlip = () => (
  <span className="block h-[1.2em] overflow-hidden">
    <span className="flex animate-flip-words flex-col text-primary" aria-hidden="true">
      {phrases.map((phrase, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: duplicate phrases are intentional in the loop
        <span key={`${phrase}-${index}`} className="block h-[1.2em] leading-[1.2]">
          {phrase}
        </span>
      ))}
    </span>
    <span className="sr-only">
      search previews, page titles, page structure, structured data, and content clarity
    </span>
  </span>
)

export default TextFlip
