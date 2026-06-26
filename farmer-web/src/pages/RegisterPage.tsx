import { useState, FormEvent, ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sprout, AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import api from '@/lib/api'

const PRODUCE_TYPES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Spices', 'Pulses', 'Other']

interface FormData {
  full_name: string
  phone: string
  password: string
  confirmPassword: string
  district: string
  taluka: string
  village: string
  farm_size_acres: string
  produce_types: string[]
  aadhaar_number: string
  bank_account: string
  bank_ifsc: string
  bank_name: string
  aadhaar_doc: File | null
  farm_photo: File | null
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormData>({
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    district: '',
    taluka: '',
    village: '',
    farm_size_acres: '',
    produce_types: [],
    aadhaar_number: '',
    bank_account: '',
    bank_ifsc: '',
    bank_name: '',
    aadhaar_doc: null,
    farm_photo: null,
  })

  const set = (field: keyof FormData, value: string | string[] | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleProduce = (type: string) => {
    setForm((prev) => ({
      ...prev,
      produce_types: prev.produce_types.includes(type)
        ? prev.produce_types.filter((t) => t !== type)
        : [...prev.produce_types, type],
    }))
  }

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Full name is required'
    if (!form.phone.trim()) return 'Phone number is required'
    if (!/^\d{10}$/.test(form.phone.trim())) return 'Enter a valid 10-digit phone number'
    if (!form.password) return 'Password is required'
    if (form.password.length < 6) return 'Password must be at least 6 characters'
    if (form.password !== form.confirmPassword) return 'Passwords do not match'
    return ''
  }

  const validateStep2 = () => {
    if (!form.district.trim()) return 'District is required'
    if (!form.taluka.trim()) return 'Taluka is required'
    if (!form.village.trim()) return 'Village is required'
    if (!form.farm_size_acres) return 'Farm size is required'
    if (form.produce_types.length === 0) return 'Select at least one produce type'
    return ''
  }

  const validateStep3 = () => {
    if (!form.aadhaar_number.trim()) return 'Aadhaar number is required'
    if (!/^\d{12}$/.test(form.aadhaar_number.trim())) return 'Enter a valid 12-digit Aadhaar number'
    if (!form.bank_account.trim()) return 'Bank account number is required'
    if (!form.bank_ifsc.trim()) return 'IFSC code is required'
    if (!form.bank_name.trim()) return 'Bank name is required'
    return ''
  }

  const handleNext = () => {
    setError('')
    let err = ''
    if (step === 1) err = validateStep1()
    if (step === 2) err = validateStep2()
    if (err) { setError(err); return }
    setStep((s) => s + 1)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const err = validateStep3()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('full_name', form.full_name.trim())
      fd.append('phone', form.phone.trim())
      fd.append('password', form.password)
      fd.append('district', form.district.trim())
      fd.append('taluka', form.taluka.trim())
      fd.append('village', form.village.trim())
      fd.append('farm_size_acres', form.farm_size_acres)
      fd.append('produce_types', JSON.stringify(form.produce_types))
      fd.append('aadhaar_number', form.aadhaar_number.trim())
      fd.append('bank_account', form.bank_account.trim())
      fd.append('bank_ifsc', form.bank_ifsc.trim())
      fd.append('bank_name', form.bank_name.trim())
      if (form.aadhaar_doc) fd.append('aadhaar_doc', form.aadhaar_doc)
      if (form.farm_photo) fd.append('farm_photo', form.farm_photo)

      await api.post('/auth/register/farmer/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSubmitted(true)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string; phone?: string[] } } }
      const data = axiosErr?.response?.data
      setError(data?.detail || data?.message || data?.phone?.[0] || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full p-4 inline-flex mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-6">
            Your farmer account application has been submitted successfully. Our admin team will review it within 1–2 business days.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-yellow-700 text-sm font-medium">What happens next?</p>
            <ul className="text-yellow-600 text-sm mt-1 list-disc list-inside space-y-1">
              <li>Admin verifies your documents</li>
              <li>Account gets approved</li>
              <li>You can log in and start listing products</li>
            </ul>
          </div>
          <Link
            to="/login"
            className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-green-100 rounded-2xl p-3 mb-3">
            <Sprout className="h-8 w-8 text-green-700" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Farmer Registration</h1>
          <p className="text-gray-500 text-sm">Join Farmer to Home marketplace</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-6 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  s === step
                    ? 'bg-green-700 text-white'
                    : s < step
                    ? 'bg-green-200 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext() }}>
          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Personal Details</h3>
              <InputField label="Full Name" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="Your full name" required />
              <InputField label="Phone Number" value={form.phone} onChange={(v) => set('phone', v)} placeholder="10-digit mobile number" type="tel" required />
              <InputField label="Password" value={form.password} onChange={(v) => set('password', v)} placeholder="Min. 6 characters" type="password" required />
              <InputField label="Confirm Password" value={form.confirmPassword} onChange={(v) => set('confirmPassword', v)} placeholder="Re-enter password" type="password" required />
            </div>
          )}

          {/* Step 2: Farm Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Farm Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="District" value={form.district} onChange={(v) => set('district', v)} placeholder="e.g. Pune" required />
                <InputField label="Taluka" value={form.taluka} onChange={(v) => set('taluka', v)} placeholder="e.g. Haveli" required />
              </div>
              <InputField label="Village" value={form.village} onChange={(v) => set('village', v)} placeholder="Your village" required />
              <InputField label="Farm Size (acres)" value={form.farm_size_acres} onChange={(v) => set('farm_size_acres', v)} placeholder="e.g. 2.5" type="number" required />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Produce Types <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCE_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.produce_types.includes(type)}
                        onChange={() => toggleProduce(type)}
                        className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Farm Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set('farm_photo', e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
            </div>
          )}

          {/* Step 3: Banking / KYC */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">KYC & Banking</h3>
              <InputField label="Aadhaar Number" value={form.aadhaar_number} onChange={(v) => set('aadhaar_number', v)} placeholder="12-digit Aadhaar" required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Aadhaar Document (optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set('aadhaar_doc', e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
              <InputField label="Bank Account Number" value={form.bank_account} onChange={(v) => set('bank_account', v)} placeholder="Account number" required />
              <InputField label="IFSC Code" value={form.bank_ifsc} onChange={(v) => set('bank_ifsc', v)} placeholder="e.g. SBIN0001234" required />
              <InputField label="Bank Name" value={form.bank_name} onChange={(v) => set('bank_name', v)} placeholder="e.g. State Bank of India" required />
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setStep(s => s - 1); setError('') }}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : step < 3 ? (
                <>Next <ChevronRight className="h-4 w-4" /></>
              ) : 'Submit Application'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already registered?{' '}
          <Link to="/login" className="text-green-700 font-semibold hover:text-green-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}

function InputField({ label, value, onChange, placeholder, type = 'text', required }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
    </div>
  )
}
