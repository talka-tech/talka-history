// Central API client that manages all API communications
import { authAPI } from './authAPI'
import { userAPI } from './userAPI'
import { userManagementAPI } from './userManagementAPI'

class APIClient {
  private baseURL: string = '/api' // In production, this would be your actual API URL
  private token: string | null = null

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('talka-token')
  }

  // Set authentication token
  setToken(token: string) {
    this.token = token
    localStorage.setItem('talka-token', token)
  }

  // Remove authentication token
  removeToken() {
    this.token = null
    localStorage.removeItem('talka-token')
  }

  // Get current token
  getToken(): string | null {
    return this.token
  }

  // Generic API request method (for future real API integration)
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Authentication methods
  auth = {
    login: authAPI.login.bind(authAPI),
    logout: authAPI.logout.bind(authAPI),
    verifyToken: authAPI.verifyToken.bind(authAPI),
    getCurrentUser: authAPI.getCurrentUser.bind(authAPI),
    changePassword: authAPI.changePassword.bind(authAPI),
    resetUserPassword: authAPI.resetUserPassword.bind(authAPI),
  }

  // User management methods
  users = {
    getAll: userAPI.getAllUsers.bind(userAPI),
    getById: userAPI.getUserById.bind(userAPI),
    search: userAPI.searchUsers.bind(userAPI),
    getByStatus: userAPI.getUsersByStatus.bind(userAPI),
    getExceeded: userAPI.getUsersExceeded.bind(userAPI),
    getPendingPayments: userAPI.getUsersWithPendingPayments.bind(userAPI),
    updateStatus: userAPI.updateUserStatus.bind(userAPI),
    resetCredits: userAPI.resetUserCredits.bind(userAPI),
    updateCredits: userAPI.updateUserCredits.bind(userAPI),
  }

  // User management methods (advanced)
  userManagement = {
    create: userManagementAPI.createUser.bind(userManagementAPI),
    update: userManagementAPI.updateUser.bind(userManagementAPI),
    delete: userManagementAPI.deleteUser.bind(userManagementAPI),
    getActivity: userManagementAPI.getUserActivity.bind(userManagementAPI),
    bulkUpdate: userManagementAPI.bulkUpdateUsers.bind(userManagementAPI),
    export: userManagementAPI.exportUsers.bind(userManagementAPI),
  }

  // Dashboard and analytics methods
  dashboard = {
    getStatistics: userAPI.getDashboardStatistics.bind(userAPI),
    getRevenueData: userAPI.getRevenueData.bind(userAPI),
    getUsageData: userAPI.getUsageData.bind(userAPI),
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Export individual APIs for direct access if needed
export { authAPI, userAPI, userManagementAPI }
