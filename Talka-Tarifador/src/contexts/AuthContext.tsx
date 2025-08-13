import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '@/api'
import { User } from '@/api/userData'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isClient: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se há um usuário salvo no localStorage
    const savedUser = localStorage.getItem('talka-user')
    const savedToken = localStorage.getItem('talka-token')
    
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      apiClient.setToken(savedToken)
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      const response = await apiClient.auth.login({ email: username, password })
      
      if (response.success && response.user && response.token) {
        setUser(response.user)
        localStorage.setItem('talka-user', JSON.stringify(response.user))
        apiClient.setToken(response.token)
        setIsLoading(false)
        return true
      }
    } catch (error) {
      console.error('Login error:', error)
    }
    
    setIsLoading(false)
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('talka-user')
    apiClient.removeToken()
  }

  const isAdmin = user?.role === 'admin'
  const isClient = user?.role === 'client' || user?.role === 'user'

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin,
      isClient,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
