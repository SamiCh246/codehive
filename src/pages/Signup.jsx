import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'

const DEPAUW_EMAIL_REGEX = /@depauw\.edu$/i

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!DEPAUW_EMAIL_REGEX.test(formState.email)) {
      setError('Please register with your @depauw.edu email address.')
      return
    }

    if (formState.password.length < 8) {
      setError('Passwords must be at least 8 characters long.')
      return
    }

    if (!/[^a-zA-Z0-9]/.test(formState.password)) {
      setError('Password must contain at least one special character (e.g., !@#$%^&*).')
      return
    }

    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }

    try {
      setLoading(true)
      await signup(formState.email, formState.password, formState.name)
      setSuccess(true)
    } catch (err) {
      console.error('Signup error', err)
      let message = 'We could not create your account. Please try again.'

      if (err?.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Try logging in instead.'
      }

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {!success && (
        <div className="auth-card">
          <h1 className="auth-title">Join CodeHive</h1>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="form-field">
            <span>Full Name</span>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </label>

          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              placeholder="you@depauw.edu"
              autoComplete="email"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={formState.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="form-field">
            <span>Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              value={formState.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in here</Link>.
        </p>
        </div>
      )}

      {success && (
        <div className="auth-card">
          <h1 className="auth-title">Account Created!</h1>
          <p>
            We've sent a verification email to <strong>{formState.email}</strong>. Please check your email and click the verification link to activate your account.
          </p>
          <p>
            Once verified, you can <Link to="/login">sign in here</Link>.
          </p>
          <button onClick={() => navigate('/login')} className="button">
            Go to Login
          </button>
        </div>
      )}
    </div>
  )
}
