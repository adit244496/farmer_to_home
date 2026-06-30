import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check, X, Loader2 } from 'lucide-react'

interface Props {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  loading?: boolean
}

export function MultiSearchableSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  emptyMessage = 'No results found',
  className = '',
  loading = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 bg-white outline-none transition focus:border-farm-green-400"
      >
        <span className={selected.length ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">{selected.length} selected</span>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 rounded-lg outline-none border border-gray-100 focus:border-farm-green-400"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">{emptyMessage}</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                      isSelected ? 'bg-farm-green-50 text-farm-green-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-farm-green-500 bg-farm-green-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={isSelected ? 'font-medium' : ''}>{opt}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 bg-farm-green-50 text-farm-green-700 text-xs font-medium px-2 py-1 rounded-md"
            >
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="text-farm-green-400 hover:text-farm-green-700 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
