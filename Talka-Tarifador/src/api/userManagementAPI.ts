import { User, mockUsers } from './userData'

// User management API
class UserManagementAPI {
  // Create a new user
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const newUser: User = {
        ...userData,
        id: (mockUsers.length + 1).toString(),
        createdAt: new Date().toISOString(),
        lastLogin: undefined
      }

      // Check if email already exists
      const existingUser = mockUsers.find(u => u.email === userData.email)
      if (existingUser) {
        return {
          success: false,
          message: 'Email já está em uso'
        }
      }

      mockUsers.push(newUser)
      
      return {
        success: true,
        user: newUser,
        message: 'Usuário criado com sucesso'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar usuário'
      }
    }
  }

  // Update user information
  async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const userIndex = mockUsers.findIndex(u => u.id === userId)
      
      if (userIndex === -1) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        }
      }

      // Don't allow updating id, createdAt, or role for safety
      const { id, createdAt, role, ...allowedUpdates } = updates
      
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        ...allowedUpdates
      }

      return {
        success: true,
        user: mockUsers[userIndex],
        message: 'Usuário atualizado com sucesso'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar usuário'
      }
    }
  }

  // Delete user (soft delete by deactivating)
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userIndex = mockUsers.findIndex(u => u.id === userId)
      
      if (userIndex === -1) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        }
      }

      // Don't actually delete, just deactivate
      mockUsers[userIndex].isActive = false
      mockUsers[userIndex].subscription.status = 'suspended'

      return {
        success: true,
        message: 'Usuário desativado com sucesso'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao desativar usuário'
      }
    }
  }

  // Get user activity history
  async getUserActivity(userId: string): Promise<{ success: boolean; activity?: any[]; message: string }> {
    try {
      const user = mockUsers.find(u => u.id === userId)
      
      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        }
      }

      // Mock activity data
      const activity = [
        {
          id: '1',
          type: 'login',
          description: 'Login realizado',
          timestamp: user.lastLogin || new Date().toISOString(),
          details: { ip: '192.168.1.100', userAgent: 'Chrome/91.0' }
        },
        {
          id: '2',
          type: 'credit_usage',
          description: `Utilizou ${user.usage.thisMonth} créditos`,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          details: { creditsUsed: user.usage.thisMonth }
        },
        {
          id: '3',
          type: 'payment',
          description: 'Pagamento processado',
          timestamp: user.billing.lastPayment,
          details: { amount: user.billing.totalSpent / user.billing.invoices }
        }
      ]

      return {
        success: true,
        activity,
        message: 'Atividade recuperada com sucesso'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao recuperar atividade'
      }
    }
  }

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updates: Partial<User>): Promise<{ success: boolean; updatedCount: number; message: string }> {
    try {
      let updatedCount = 0

      for (const userId of userIds) {
        const userIndex = mockUsers.findIndex(u => u.id === userId)
        if (userIndex !== -1) {
          const { id, createdAt, role, ...allowedUpdates } = updates
          mockUsers[userIndex] = {
            ...mockUsers[userIndex],
            ...allowedUpdates
          }
          updatedCount++
        }
      }

      return {
        success: true,
        updatedCount,
        message: `${updatedCount} usuários atualizados com sucesso`
      }
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        message: 'Erro na atualização em lote'
      }
    }
  }

  // Export users data
  async exportUsers(format: 'json' | 'csv' = 'json'): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const clients = mockUsers.filter(user => user.role === 'client')

      if (format === 'csv') {
        const headers = 'ID,Nome,Email,Empresa,Status,Plano,Créditos Total,Créditos Usados,Receita Total\n'
        const csvData = clients.map(user => 
          `${user.id},"${user.name}","${user.email}","${user.company}",${user.isActive ? 'Ativo' : 'Inativo'},${user.subscription.plan},${user.credits.total},${user.credits.used},${user.billing.totalSpent}`
        ).join('\n')
        
        return {
          success: true,
          data: headers + csvData,
          message: 'Dados exportados em CSV'
        }
      } else {
        return {
          success: true,
          data: JSON.stringify(clients, null, 2),
          message: 'Dados exportados em JSON'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao exportar dados'
      }
    }
  }
}

export const userManagementAPI = new UserManagementAPI()
