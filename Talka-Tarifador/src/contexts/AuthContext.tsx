import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  company: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
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
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    // Simulação de login - em produção, fazer chamada para API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Credenciais de demonstração
    if (email === 'admin@talka.com.br' && password === '123456') {
      const mockUser: User = {
        id: '1',
        name: 'Administrador TALKA',
        email: 'admin@talka.com.br',
        company: 'TALKA Technologies'
      }
      
      setUser(mockUser)
      localStorage.setItem('talka-user', JSON.stringify(mockUser))
      setIsLoading(false)
      return true
    }
    
    if (email === 'cliente@empresa.com.br' && password === '123456') {
      const mockUser: User = {
        id: '2',
        name: 'João Silva',
        email: 'cliente@empresa.com.br',
        company: 'Empresa Demo Ltda'
      }
      
      setUser(mockUser)
      localStorage.setItem('talka-user', JSON.stringify(mockUser))
      setIsLoading(false)
      return true
    }
    
    setIsLoading(false)
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('talka-user')
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
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
