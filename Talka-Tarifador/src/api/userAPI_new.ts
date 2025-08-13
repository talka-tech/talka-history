import { supabase, User } from '@/lib/supabase'

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface CreateUserData {
  email: string
  name: string
  company: string
  role?: 'admin' | 'user'
}

interface UpdateUserData {
  name?: string
  company?: string
  role?: 'admin' | 'user'
  is_active?: boolean
}

class UserAPI {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    await delay(500)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    await delay(300)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Create new user
  async createUser(userData: CreateUserData): Promise<{ success: boolean; user?: User; message: string }> {
    await delay(800)
    
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single()

      if (existingUser) {
        return {
          success: false,
          message: 'Este email já está em uso'
        }
      }

      // Create user
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          name: userData.name,
          company: userData.company,
          role: userData.role || 'user'
        })
        .select()
        .single()

      if (error) throw error

      // Create default client for user
      if (data && userData.role !== 'admin') {
        await supabase
          .from('clients')
          .insert({
            name: userData.company,
            type: 'comum',
            user_id: data.id,
            credits_total: 10000,
            credits_used: 0
          })
      }

      return {
        success: true,
        user: data,
        message: 'Usuário criado com sucesso'
      }
    } catch (error) {
      console.error('Error creating user:', error)
      return {
        success: false,
        message: 'Erro ao criar usuário'
      }
    }
  }

  // Update user
  async updateUser(id: string, userData: UpdateUserData): Promise<{ success: boolean; user?: User; message: string }> {
    await delay(600)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        user: data,
        message: 'Usuário atualizado com sucesso'
      }
    } catch (error) {
      console.error('Error updating user:', error)
      return {
        success: false,
        message: 'Erro ao atualizar usuário'
      }
    }
  }

  // Delete user (soft delete)
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    await delay(700)
    
    try {
      // Deactivate user instead of deleting
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // Also deactivate associated clients
      await supabase
        .from('clients')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', id)

      return {
        success: true,
        message: 'Usuário desativado com sucesso'
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      return {
        success: false,
        message: 'Erro ao desativar usuário'
      }
    }
  }

  // Reactivate user
  async reactivateUser(id: string): Promise<{ success: boolean; message: string }> {
    await delay(500)
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // Also reactivate associated clients
      await supabase
        .from('clients')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', id)

      return {
        success: true,
        message: 'Usuário reativado com sucesso'
      }
    } catch (error) {
      console.error('Error reactivating user:', error)
      return {
        success: false,
        message: 'Erro ao reativar usuário'
      }
    }
  }

  // Get user statistics
  async getUserStats(): Promise<{
    total: number
    active: number
    inactive: number
    admins: number
    users: number
  }> {
    await delay(400)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active')

      if (error) throw error

      const stats = {
        total: data.length,
        active: data.filter(u => u.is_active).length,
        inactive: data.filter(u => !u.is_active).length,
        admins: data.filter(u => u.role === 'admin').length,
        users: data.filter(u => u.role === 'user').length
      }

      return stats
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        admins: 0,
        users: 0
      }
    }
  }
}

export const userAPI = new UserAPI()
