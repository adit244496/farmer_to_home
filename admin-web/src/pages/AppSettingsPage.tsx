import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, Eye, EyeOff, Mail, MessageSquare, CheckCircle, Save } from 'lucide-react'
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

interface SmtpSettings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_from_name: string
}

interface SmsSettings {
  fast2sms_api_key: string
  otp_provider: 'sms' | 'whatsapp'
}

interface WhatsAppSettings {
  whatsapp_phone_number_id: string
  whatsapp_access_token: string
  whatsapp_template_name: string
  whatsapp_template_lang: string
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
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-xl flex-shrink-0">
        {icon}
      </div>
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

function SmsSettingsCard() {
  const [showKey, setShowKey] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [form, setForm] = useState<SmsSettings | null>(null)
  const [waForm, setWaForm] = useState<WhatsAppSettings | null>(null)

  const { isLoading: smsLoading, isError: smsError } = useQuery<SmsSettings>({
    queryKey: ['admin-sms'],
    queryFn: async () => {
      const res = await api.get('/admin/settings/sms')
      setForm(res.data)
      return res.data
    },
  })

  const { isLoading: waLoading, isError: waError } = useQuery<WhatsAppSettings>({
    queryKey: ['admin-whatsapp'],
    queryFn: async () => {
      const res = await api.get('/admin/settings/whatsapp')
      setWaForm(res.data)
      return res.data
    },
  })

  const handleSmsChange = (field: keyof SmsSettings, value: string) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev)
    setSaveStatus('idle')
  }

  const handleWaChange = (field: keyof WhatsAppSettings, value: string) => {
    setWaForm((prev) => prev ? { ...prev, [field]: value } : prev)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    if (!form || !waForm) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      await api.patch('/admin/settings/sms', form)
      if (form.otp_provider === 'whatsapp') {
        await api.patch('/admin/settings/whatsapp', waForm)
      }
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  if (smsLoading || waLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-white rounded-xl border border-gray-200">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (smsError || waError || !form || !waForm) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-4">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Failed to load SMS settings.</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      {/* Provider selector */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Phone OTP — Delivery Method</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Choose how OTP codes are delivered to customers' phone numbers.
        </p>
        <div className="flex gap-3">
          {(['sms', 'whatsapp'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleSmsChange('otp_provider', p)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                form.otp_provider === p
                  ? p === 'whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {p === 'whatsapp' ? <><span>💬</span> WhatsApp</> : <><span>📱</span> SMS</>}
              {form.otp_provider === p && (
                <span className="ml-1 w-2 h-2 rounded-full bg-current opacity-70 inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fast2SMS section — always shown (used for SMS; hidden for WhatsApp) */}
      {form.otp_provider === 'sms' && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">Fast2SMS — SMS</p>
          <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.fast2sms_api_key}
              onChange={(e) => handleSmsChange('fast2sms_api_key', e.target.value)}
              placeholder="Paste your Fast2SMS API key"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Get your key at{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">fast2sms.com → API → Developer</span>
          </p>
        </div>
      )}

      {/* Meta WhatsApp Cloud API section — shown only when WhatsApp is selected */}
      {form.otp_provider === 'whatsapp' && (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-0.5">Meta WhatsApp Cloud API</p>
            <p className="text-xs text-gray-400">
              Free tier: up to 1,000 authentication conversations/month. Requires a verified Meta Business account and an approved OTP message template.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number ID</label>
              <input
                type="text"
                value={waForm.whatsapp_phone_number_id}
                onChange={(e) => handleWaChange('whatsapp_phone_number_id', e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Found in Meta Developer Console → WhatsApp → API Setup
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Access Token</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={waForm.whatsapp_access_token}
                  onChange={(e) => handleWaChange('whatsapp_access_token', e.target.value)}
                  placeholder="Permanent access token"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm outline-none focus:border-green-400"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Use a permanent token from System User (not a temporary token)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
              <input
                type="text"
                value={waForm.whatsapp_template_name}
                onChange={(e) => handleWaChange('whatsapp_template_name', e.target.value)}
                placeholder="otp"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                The approved template name from WhatsApp Manager
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Template Language</label>
              <select
                value={waForm.whatsapp_template_lang}
                onChange={(e) => handleWaChange('whatsapp_template_lang', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 bg-white"
              >
                <option value="en_US">en_US — English (US)</option>
                <option value="en">en — English</option>
                <option value="mr">mr — Marathi</option>
                <option value="hi">hi — Hindi</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved successfully
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            Failed to save
          </div>
        )}
      </div>
    </div>
  )
}

function SmtpSettingsCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [form, setForm] = useState<SmtpSettings | null>(null)

  const { isLoading, isError } = useQuery<SmtpSettings>({
    queryKey: ['admin-smtp'],
    queryFn: async () => {
      const res = await api.get('/admin/settings/smtp')
      setForm(res.data)
      return res.data
    },
  })

  const handleChange = (field: keyof SmtpSettings, value: string | number) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      await api.patch('/admin/settings/smtp', form)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-white rounded-xl border border-gray-200">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (isError || !form) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-4">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Failed to load SMTP settings.</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Email OTP — SMTP Configuration</h3>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Settings saved here override environment variables. Used for sending OTP emails to customers.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Host</label>
          <input
            type="text"
            value={form.smtp_host}
            onChange={(e) => handleChange('smtp_host', e.target.value)}
            placeholder="smtp.titan.email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
          <select
            value={form.smtp_port}
            onChange={(e) => handleChange('smtp_port', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
          >
            <option value={465}>465 (SSL — Titan/GoDaddy)</option>
            <option value={587}>587 (STARTTLS — Gmail)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
          <input
            type="email"
            value={form.smtp_user}
            onChange={(e) => handleChange('smtp_user', e.target.value)}
            placeholder="info@farmertohome.in"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.smtp_password}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              placeholder="Email account password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">From Name</label>
          <input
            type="text"
            value={form.smtp_from_name}
            onChange={(e) => handleChange('smtp_from_name', e.target.value)}
            placeholder="FarmerToHome"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save SMTP Settings
        </button>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved successfully
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            Failed to save
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        For Titan (GoDaddy): host = <code className="bg-gray-100 px-1 rounded">smtp.titan.email</code>, port = 465
      </p>
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

  return (
    <div className="space-y-8">
      {/* SMS / WhatsApp OTP Settings */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">SMS / WhatsApp Settings</h2>
        <SmsSettingsCard />
      </div>

      {/* SMTP Settings */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Email Settings</h2>
        <SmtpSettingsCard />
      </div>

      {/* App Sections */}
      <div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-4">
          <h2 className="text-sm font-semibold text-blue-800">Customer App — Home Screen Sections</h2>
          <p className="text-xs text-blue-600 mt-1">
            Control which sections are visible on the customer app's home screen.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-farm-green-600" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Failed to load sections.</span>
          </div>
        )}

        {sections && (
          <>
            <div className="flex gap-4 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-green-700">{sections.filter(s => s.is_visible).length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Visible</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-gray-500">{sections.filter(s => !s.is_visible).length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Hidden</p>
              </div>
            </div>
            <div className="space-y-2">
              {sections.map((section) => (
                <SectionRow key={section.key} section={section} onToggle={handleToggle} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
