import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import clsx from 'clsx'

interface AppSection {
  id: string
  key: string
  label: string
  description: string | null
  is_visible: boolean
  display_order: number
  icon: string | null
}

const ICON_MAP: Record<string, string> = {
  image: '🖼️',
  star: '⭐',
  grid: '▦',
  sparkles: '✨',
  leaf: '🌿',
  users: '👥',
  percent: '%',
  'thumbs-up': '👍',
  sun: '☀️',
  'map-pin': '📍',
}

function SectionRow({ section, onToggle }: {
  section: AppSection
  onToggle: (key: string, visible: boolean) => Promise<void>
}) {
  const icon = ICON_MAP[section.icon ?? ''] ?? '◻'

  return (
    <div className={clsx(
      'flex items-center gap-4 bg-white rounded-xl border px-5 py-4 transition-all',
      section.is_visible ? 'border-gray-200' : 'border-gray-200 opacity-55'
    )}>
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-xl flex-shrink-0">
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">{section.label}</h3>
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            section.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}>
            {section.is_visible ? 'Visible' : 'Hidden'}
          </span>
        </div>
        {section.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{section.description}</p>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(section.key, !section.is_visible)}
        className={clsx(
          'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0',
          section.is_visible
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            : 'bg-green-50 hover:bg-green-100 text-green-700'
        )}
      >
        {section.is_visible ? (
          <><EyeOff className="h-4 w-4" /> Hide</>
        ) : (
          <><Eye className="h-4 w-4" /> Show</>
        )}
      </button>
    </div>
  )
}

export default function AppSettingsPage() {
  const queryClient = useQueryClient()

  const { data: sections, isLoading, isError } = useQuery<AppSection[]>({
    queryKey: ['admin-sections'],
    queryFn: async () => {
      const res = await api.get('/admin/sections')
      return res.data
    },
  })

  const handleToggle = async (key: string, visible: boolean) => {
    await api.patch(`/admin/sections/${key}`, { is_visible: visible })
    queryClient.invalidateQueries({ queryKey: ['admin-sections'] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-farm-green-600" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Failed to load sections.</span>
      </div>
    )
  }

  const visible = sections?.filter((s) => s.is_visible) ?? []
  const hidden = sections?.filter((s) => !s.is_visible) ?? []

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <h2 className="text-sm font-semibold text-blue-800">Customer App — Home Screen Sections</h2>
        <p className="text-xs text-blue-600 mt-1">
          Control which sections are visible on the customer app's home screen.
          Hidden sections will not appear for any user.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-green-700">{visible.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Visible</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-gray-500">{hidden.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Hidden</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-gray-900">{sections?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {sections?.map((section) => (
          <SectionRow key={section.key} section={section} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  )
}
