import { User, mockUsers } from './userData'

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface LoginCredentials {
  email: string // Mantemos 'email' internamente para compatibilidade, mas aceita username
  password: string
}

interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  message?: string
}

class AuthAPI {
  // Login function
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await delay(1000)
    
    const { email: username, password } = credentials
    
    // Check for admin credentials (new admin account)
    if (username === 'admin' && password === 'Talka2025!') {
      const adminUser = mockUsers.find(user => user.email === 'admin')
      if (adminUser) {
        // Update last login
        adminUser.lastLogin = new Date().toISOString()
        
        return {
          success: true,
          user: adminUser,
          token: 'admin-token-' + Date.now(),
          message: 'Login de administrador realizado com sucesso'
        }
      }
    }
    
    // Check for legacy admin credentials
    if (username === 'admin@talka.com.br' && password === '123456') {
      const adminUser = mockUsers.find(user => user.email === 'admin')
      if (adminUser) {
        adminUser.lastLogin = new Date().toISOString()
        
        return {
          success: true,
          user: adminUser,
          token: 'admin-token-' + Date.now(),
          message: 'Login de administrador realizado com sucesso'
        }
      }
    }
    
    // Check for client credentials by email
    const user = mockUsers.find(u => u.email === username)
    if (user && password === '123456') { // Mock password for demo
      user.lastLogin = new Date().toISOString()
      
      return {
        success: true,
        user: user,
        token: `${user.role}-token-` + Date.now(),
        message: 'Login realizado com sucesso'
      }
    }
    
    return {
      success: false,
      message: 'Credenciais inválidas'
    }
  }

  // Logout function
  async logout(): Promise<boolean> {
    await delay(300)
    return true
  }

  // Verify token (for protected routes)
  async verifyToken(token: string): Promise<User | null> {
    await delay(200)
    
    if (token.startsWith('admin-token-')) {
      return mockUsers.find(user => user.role === 'admin') || null
    }
    
    if (token.startsWith('client-token-')) {
      return mockUsers.find(user => user.role === 'client') || null
    }
    
    return null
  }

  // Get current user
  async getCurrentUser(token: string): Promise<User | null> {
    return this.verifyToken(token)
  }

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    await delay(800)
    
    // In a real implementation, you would verify the old password and update the new one
    const user = mockUsers.find(u => u.id === userId)
    if (user && oldPassword === '123456') { // Mock validation
      // Password would be updated here
      return true
    }
    
    return false
  }

  // Reset password (admin only)
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    await delay(600)
    
    const user = mockUsers.find(u => u.id === userId)
    if (user) {
      // Password would be updated here
      return true
    }
    
    return false
  }
}

export const authAPI = new AuthAPI()
