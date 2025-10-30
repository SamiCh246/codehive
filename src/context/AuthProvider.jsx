import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'

import { auth } from '../firebase'
import AuthContext from './AuthContext.js'

const DEPAUW_EMAIL_REGEX = /@depauw\.edu$/i

function ensureDepauwEmail(email) {
  if (!DEPAUW_EMAIL_REGEX.test(email)) {
    throw new Error('Please use your @depauw.edu email address.')
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const storedName = localStorage.getItem(`userName_${user.uid}`)
        setCurrentUser({ ...user, displayName: storedName || user.email.split('@')[0] })
      } else {
        setCurrentUser(null)
      }
      setInitializing(false)
    })

    return unsubscribe
  }, [])

  const signup = async (email, password, name) => {
    ensureDepauwEmail(email)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    await sendEmailVerification(user)
    localStorage.setItem(`userName_${user.uid}`, name)
    await logout()
    return userCredential
  }

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    if (!user.emailVerified) {
      await signOut(auth)
      throw new Error('Please verify your email before logging in.')
    }
    return userCredential
  }

  const logout = () => {
    signOut(auth)
    setCurrentUser(null)
  }

  const updateDisplayName = (name) => {
    if (currentUser) {
      localStorage.setItem(`userName_${currentUser.uid}`, name)
      setCurrentUser({ ...currentUser, displayName: name })
    }
  }

  const value = useMemo(
    () => ({ currentUser, signup, login, logout, updateDisplayName, initializing }),
    [currentUser, initializing]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
