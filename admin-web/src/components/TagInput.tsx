import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  validate?: (tag: string) => boolean
  className?: string
}

export function TagInput({ tags, onChange, placeholder = 'Type and press Enter…', validate, className = '' }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const add = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    if (tags.includes(value)) { setInput(''); return }
    if (validate && !validate(value)) { setError(true); return }
    onChange([...tags, value])
    setInput('')
    setError(false)
  }

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      remove(tags[tags.length - 1])
    } else {
      setError(false)
    }
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 min-h-[40px] border rounded-lg px-2.5 py-2 cursor-text transition-colors ${
        error ? 'border-red-400' : 'border-gray-200 focus-within:border-farm-green-400'
      } ${className}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-farm-green-50 text-farm-green-700 text-xs font-medium px-2 py-1 rounded-md"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(tag) }}
            className="text-farm-green-400 hover:text-farm-green-700 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(false) }}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) add(input) }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
      />
    </div>
  )
}
