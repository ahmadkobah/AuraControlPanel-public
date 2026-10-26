import React, { createContext, useContext, useMemo } from 'react'

const AuthCtx = createContext(null)
export function AuthProvider({ children }) {
  const [token, setToken] = React.useState(localStorage.getItem('aura_admin_token') || '')
  const value = useMemo(() => ({ token, setToken }), [token])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export function useAuth() { return useContext(AuthCtx) }
