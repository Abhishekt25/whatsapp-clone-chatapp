import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

// Top country codes
const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
]

export default function RegisterPage() {
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNum,    setPhoneNum]    = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const { register, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim())  { toast.error('Name is required');  return }
    if (!email.trim()) { toast.error('Email is required'); return }
    if (!password)     { toast.error('Password is required'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }

    // Phone is optional — only validate if entered
    if (phoneNum.trim() && !/^\d{5,15}$/.test(phoneNum.trim())) {
      toast.error('Enter a valid phone number (digits only)')
      return
    }

    // Combine country code + number (empty string if not provided)
    const fullPhone = phoneNum.trim() ? `${countryCode}${phoneNum.trim()}` : ''

    try {
      await register(name, email, fullPhone, password)
      toast.success('Account created! 🎉')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Registration failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="60" height="60">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
          </svg>
          <h1>Create Account</h1>
          <p>Join Chat-Hub today</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Name */}
          <div className="form-group">
            <label>Full name</label>
            <input
              type="text" placeholder="Jane Doe"
              value={name} onChange={e => setName(e.target.value)}
              autoFocus autoComplete="name" disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email" placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" disabled={isLoading}
            />
          </div>

          {/* Phone (optional) */}
          <div className="form-group">
            <label>
              Mobile number
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
            </label>
            <div className="phone-input-wrap">
              {/* Country code dropdown */}
              <select
                className="country-code-select"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                disabled={isLoading}
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} {c.name}
                  </option>
                ))}
              </select>
              {/* Number input */}
              <input
                className="phone-number-input"
                type="tel"
                placeholder="9876543210"
                value={phoneNum}
                onChange={e => setPhoneNum(e.target.value.replace(/\D/g, ''))}
                autoComplete="tel"
                disabled={isLoading}
                maxLength={15}
              />
            </div>
            {phoneNum && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Will be saved as: {countryCode}{phoneNum}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
           <div className="form-group">
              <label>Password</label>

              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />

                <span
                  className="password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
          </div>

          {/* Confirm */}
          <div className="form-group">
            <label>Confirm password</label>

            <div className="password-wrap">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
              />

              <span
                className="password-toggle"
                onClick={() => setShowConfirm(prev => !prev)}
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? '🙈' : '👁️'}
              </span>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="spinner sm" /> Creating account…
                </span>
              : 'Create Account'
            }
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}