import { supabase, User as SupabaseUser } from '@/lib/supabase'
import { User, mockUsers } from './userData'

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface LoginCredentials {
  email: string
  password: string
}

interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  message?: string
}

class AuthAPI {
  // Test function to check Supabase connection
  async testSupabaseConnection(): Promise<void> {
    try {
      console.log('🧪 Testing Supabase connection...')
      
      // Try to list all users
      const { data: allUsers, error: listError } = await supabase
        .from('users')
        .select('id, email, name, role, is_active')
        .limit(10)

      console.log('📋 All users query:', { allUsers, listError })
      console.log('👥 Users found:', allUsers?.map(u => ({ id: u.id, email: u.email, name: u.name })))

      // Try to get specific table info
      const { data: tableData, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      console.log('🏗️ Table structure test:', { tableData, tableError })

      // Check if wrlbones user exists
      const { data: wrlbonesUser, error: wrlbonesError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', '%wrlbones%')

      console.log('🔍 Looking for wrlbones user:', { wrlbonesUser, wrlbonesError })

    } catch (error) {
      console.error('💥 Supabase connection test failed:', error)
    }
  }

  // Login function
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await delay(800)
    
    const { email: username, password } = credentials
    
    console.log('🔐 LOGIN ATTEMPT:', { username, password: '***' })
    
    try {
      // Check ONLY for admin credentials
      if (username === 'admin' && password === 'Talka2025!') {
        console.log('🔑 Admin login attempt')
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'admin')
          .eq('is_active', true)
          .single()

        console.log('🔍 Admin query result:', { user, error })

        if (error || !user) {
          console.log('❌ Admin user not found')
          return {
            success: false,
            message: 'Usuário administrador não encontrado'
          }
        }

        console.log('✅ Admin login successful')
        return {
          success: true,
          user: user,
          token: 'admin-token-' + Date.now(),
          message: 'Login de administrador realizado com sucesso'
        }
      }

      // Check for real users in Supabase database
      console.log('👤 Checking regular user login')
      
      // First check in USERS table (admins)
      console.log('🔍 First attempt - checking USERS table:', username)
      let { data: supabaseUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', username)
        .eq('is_active', true)
        .single()

      console.log('📊 Users table result:', { supabaseUser, error })

      // If not found in users table, check CLIENTS table
      if (error) {
        console.log('🔍 Second attempt - checking CLIENTS table:', username)
        
        const { data: clientUser, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('login', username)
          .eq('is_active', true)
          .single()
        
        console.log('📊 Clients table result:', { clientUser, clientError })
        
        if (!clientError && clientUser) {
          // Convert client data to user format for compatibility
          supabaseUser = {
            id: clientUser.id,
            email: clientUser.login,
            name: clientUser.name,
            role: 'client', // Special role for clients
            password_hash: clientUser.password,
            is_active: clientUser.is_active,
            created_at: clientUser.created_at,
            updated_at: clientUser.updated_at
          }
          error = null
          console.log('✅ Found client user, converted to user format:', supabaseUser)
        }
      }

      if (!error && supabaseUser) {
        console.log('👤 User found:', { 
          id: supabaseUser.id, 
          email: supabaseUser.email, 
          name: supabaseUser.name,
          password_stored: supabaseUser.password_hash ? 'YES' : 'NO'
        })
        
        if (supabaseUser.password_hash === password) {
          console.log('✅ Password match - login successful')
          return {
            success: true,
            user: supabaseUser,
            token: `${supabaseUser.role}-token-` + Date.now(),
            message: 'Login realizado com sucesso'
          }
        } else {
          console.log('❌ Password mismatch:', { 
            provided: password, 
            stored: supabaseUser.password_hash 
          })
        }
      } else {
        console.log('❌ No user found or error occurred')
      }

      console.log('❌ Login failed - invalid credentials')
      return {
        success: false,
        message: 'Credenciais inválidas'
      }

    } catch (error) {
      console.error('💥 Login error:', error)
      return {
        success: false,
        message: 'Erro interno do servidor'
      }
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
    
    if (token.startsWith('admin-token-') || token.startsWith('user-token-')) {
      // In production, verify JWT token
      return this.getCurrentUserFromStorage()
    }
    
    return null
  }

  // Get current user from localStorage
  getCurrentUserFromStorage(): User | null {
    try {
      const stored = localStorage.getItem('talka-user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  // Get current user
  async getCurrentUser(token: string): Promise<User | null> {
    return this.verifyToken(token)
  }

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    await delay(800)
    
    try {
      // In production, verify old password and update with hash
      const { error } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId)

      return !error
    } catch {
      return false
    }
  }

  // Reset password (admin only)
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    await delay(600)
    
    try {
      // In production, hash password and update
      const { error } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId)

      return !error
    } catch {
      return false
    }
  }
}

export const authAPI = new AuthAPI()
