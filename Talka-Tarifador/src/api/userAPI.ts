import { User, mockUsers, getDashboardStats, DashboardStats } from './userData'

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class UserAPI {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    await delay(500)
    return mockUsers.filter(user => user.role === 'client')
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    await delay(300)
    return mockUsers.find(user => user.id === id) || null
  }

  // Search users
  async searchUsers(query: string): Promise<User[]> {
    await delay(400)
    const searchQuery = query.toLowerCase()
    return mockUsers.filter(user => 
      user.role === 'client' && (
        user.name.toLowerCase().includes(searchQuery) ||
        user.email.toLowerCase().includes(searchQuery) ||
        user.company.toLowerCase().includes(searchQuery)
      )
    )
  }

  // Get users by status
  async getUsersByStatus(status: 'active' | 'inactive'): Promise<User[]> {
    await delay(400)
    const isActive = status === 'active'
    return mockUsers.filter(user => user.role === 'client' && user.isActive === isActive)
  }

  // Get users who exceeded credits
  async getUsersExceeded(): Promise<User[]> {
    await delay(400)
    return mockUsers.filter(user => user.role === 'client' && user.credits.exceeded)
  }

  // Get users with pending payments
  async getUsersWithPendingPayments(): Promise<User[]> {
    await delay(400)
    return mockUsers.filter(user => 
      user.role === 'client' && 
      (user.subscription.status === 'suspended' || user.subscription.status === 'expired')
    )
  }

  // Update user status
  async updateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    await delay(500)
    const userIndex = mockUsers.findIndex(user => user.id === userId)
    if (userIndex !== -1) {
      mockUsers[userIndex].isActive = isActive
      mockUsers[userIndex].subscription.status = isActive ? 'active' : 'suspended'
      return true
    }
    return false
  }

  // Reset user credits
  async resetUserCredits(userId: string): Promise<boolean> {
    await delay(500)
    const userIndex = mockUsers.findIndex(user => user.id === userId)
    if (userIndex !== -1) {
      const user = mockUsers[userIndex]
      user.credits.used = 0
      user.credits.remaining = user.credits.total
      user.credits.exceeded = false
      user.usage.thisMonth = 0
      return true
    }
    return false
  }

  // Update user credits
  async updateUserCredits(userId: string, newTotal: number): Promise<boolean> {
    await delay(500)
    const userIndex = mockUsers.findIndex(user => user.id === userId)
    if (userIndex !== -1) {
      const user = mockUsers[userIndex]
      user.credits.total = newTotal
      user.credits.remaining = newTotal - user.credits.used
      user.credits.exceeded = user.credits.remaining < 0
      user.subscription.monthlyLimit = newTotal
      return true
    }
    return false
  }

  // Get dashboard statistics
  async getDashboardStatistics(): Promise<DashboardStats> {
    await delay(600)
    return getDashboardStats()
  }

  // Get revenue data for charts
  async getRevenueData(): Promise<{ month: string; revenue: number }[]> {
    await delay(400)
    // Mock revenue data for the last 6 months
    return [
      { month: 'Jul', revenue: 45000 },
      { month: 'Aug', revenue: 52000 },
      { month: 'Sep', revenue: 48000 },
      { month: 'Oct', revenue: 61000 },
      { month: 'Nov', revenue: 55000 },
      { month: 'Dec', revenue: 58000 }
    ]
  }

  // Get usage data for charts
  async getUsageData(): Promise<{ month: string; usage: number }[]> {
    await delay(400)
    return [
      { month: 'Jul', usage: 18500 },
      { month: 'Aug', usage: 22000 },
      { month: 'Sep', usage: 19800 },
      { month: 'Oct', usage: 25200 },
      { month: 'Nov', usage: 23100 },
      { month: 'Dec', usage: 24500 }
    ]
  }
}

export const userAPI = new UserAPI()
