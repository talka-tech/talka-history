// Mock data for users and their information
export interface User {
  id: string
  name: string
  email: string
  company: string
  role: 'admin' | 'client'
  createdAt: string
  lastLogin?: string
  isActive: boolean
  credits: {
    total: number
    used: number
    remaining: number
    exceeded: boolean
  }
  subscription: {
    plan: 'basic' | 'premium' | 'enterprise' | 'custom'
    status: 'active' | 'inactive' | 'expired' | 'suspended'
    startDate: string
    endDate: string
    monthlyLimit: number
  }
  usage: {
    thisMonth: number
    lastMonth: number
    averageMonthly: number
    peakUsage: number
    peakDate: string
  }
  billing: {
    totalSpent: number
    lastPayment: string
    nextBilling: string
    paymentMethod: string
    invoices: number
  }
}

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Administrador TALKA',
    email: 'admin',
    company: 'TALKA Technologies',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: new Date().toISOString(),
    isActive: true,
    credits: {
      total: 999999,
      used: 0,
      remaining: 999999,
      exceeded: false
    },
    subscription: {
      plan: 'custom',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      monthlyLimit: 999999
    },
    usage: {
      thisMonth: 0,
      lastMonth: 0,
      averageMonthly: 0,
      peakUsage: 0,
      peakDate: '2024-01-01'
    },
    billing: {
      totalSpent: 0,
      lastPayment: '2024-01-01',
      nextBilling: '2025-01-01',
      paymentMethod: 'Admin Account',
      invoices: 0
    }
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'empresademo',
    company: 'Empresa Demo Ltda',
    role: 'client',
    createdAt: '2024-02-15T10:30:00Z',
    lastLogin: '2025-08-12T14:20:00Z',
    isActive: true,
    credits: {
      total: 1000,
      used: 750,
      remaining: 250,
      exceeded: false
    },
    subscription: {
      plan: 'basic',
      status: 'active',
      startDate: '2024-02-15',
      endDate: '2025-02-15',
      monthlyLimit: 1000
    },
    usage: {
      thisMonth: 750,
      lastMonth: 890,
      averageMonthly: 820,
      peakUsage: 950,
      peakDate: '2024-11-15'
    },
    billing: {
      totalSpent: 2450.00,
      lastPayment: '2024-12-15',
      nextBilling: '2025-01-15',
      paymentMethod: 'Cartão **** 1234',
      invoices: 12
    }
  },
  {
    id: '2.1',
    name: 'João Silva',
    email: 'joao',
    company: 'Empresa Demo Ltda',
    role: 'client',
    createdAt: '2024-02-15T10:30:00Z',
    lastLogin: '2025-08-12T14:20:00Z',
    isActive: true,
    credits: {
      total: 1000,
      used: 750,
      remaining: 250,
      exceeded: false
    },
    subscription: {
      plan: 'basic',
      status: 'active',
      startDate: '2024-02-15',
      endDate: '2025-02-15',
      monthlyLimit: 1000
    },
    usage: {
      thisMonth: 750,
      lastMonth: 890,
      averageMonthly: 820,
      peakUsage: 950,
      peakDate: '2024-11-15'
    },
    billing: {
      totalSpent: 2450.00,
      lastPayment: '2024-12-15',
      nextBilling: '2025-01-15',
      paymentMethod: 'Cartão **** 1234',
      invoices: 12
    }
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'techcorp',
    company: 'TechCorp Solutions',
    role: 'client',
    createdAt: '2024-03-10T08:15:00Z',
    lastLogin: '2025-08-13T09:45:00Z',
    isActive: true,
    credits: {
      total: 5000,
      used: 5200,
      remaining: -200,
      exceeded: true
    },
    subscription: {
      plan: 'premium',
      status: 'active',
      startDate: '2024-03-10',
      endDate: '2025-03-10',
      monthlyLimit: 5000
    },
    usage: {
      thisMonth: 5200,
      lastMonth: 4800,
      averageMonthly: 4900,
      peakUsage: 5200,
      peakDate: '2025-08-13'
    },
    billing: {
      totalSpent: 12750.00,
      lastPayment: '2024-12-10',
      nextBilling: '2025-01-10',
      paymentMethod: 'PIX',
      invoices: 10
    }
  },
  {
    id: '3.1',
    name: 'Maria Santos',
    email: 'maria',
    company: 'TechCorp Solutions',
    role: 'client',
    createdAt: '2024-03-10T08:15:00Z',
    lastLogin: '2025-08-13T09:45:00Z',
    isActive: true,
    credits: {
      total: 5000,
      used: 5200,
      remaining: -200,
      exceeded: true
    },
    subscription: {
      plan: 'premium',
      status: 'active',
      startDate: '2024-03-10',
      endDate: '2025-03-10',
      monthlyLimit: 5000
    },
    usage: {
      thisMonth: 5200,
      lastMonth: 4800,
      averageMonthly: 4900,
      peakUsage: 5200,
      peakDate: '2025-08-13'
    },
    billing: {
      totalSpent: 12750.00,
      lastPayment: '2024-12-10',
      nextBilling: '2025-01-10',
      paymentMethod: 'PIX',
      invoices: 10
    }
  },
  {
    id: '4',
    name: 'Carlos Oliveira',
    email: 'inovacorp',
    company: 'InovaCorp Ltda',
    role: 'client',
    createdAt: '2024-01-20T16:45:00Z',
    lastLogin: '2025-08-10T11:30:00Z',
    isActive: false,
    credits: {
      total: 2000,
      used: 1950,
      remaining: 50,
      exceeded: false
    },
    subscription: {
      plan: 'basic',
      status: 'suspended',
      startDate: '2024-01-20',
      endDate: '2025-01-20',
      monthlyLimit: 2000
    },
    usage: {
      thisMonth: 0,
      lastMonth: 1950,
      averageMonthly: 1800,
      peakUsage: 2000,
      peakDate: '2024-12-05'
    },
    billing: {
      totalSpent: 5500.00,
      lastPayment: '2024-10-20',
      nextBilling: '2025-01-20',
      paymentMethod: 'Boleto',
      invoices: 8
    }
  },
  {
    id: '5',
    name: 'Ana Costa',
    email: 'digitalsys',
    company: 'Digital Systems SA',
    role: 'client',
    createdAt: '2024-05-05T12:00:00Z',
    lastLogin: '2025-08-13T16:15:00Z',
    isActive: true,
    credits: {
      total: 10000,
      used: 7500,
      remaining: 2500,
      exceeded: false
    },
    subscription: {
      plan: 'enterprise',
      status: 'active',
      startDate: '2024-05-05',
      endDate: '2025-05-05',
      monthlyLimit: 10000
    },
    usage: {
      thisMonth: 7500,
      lastMonth: 8200,
      averageMonthly: 8000,
      peakUsage: 9500,
      peakDate: '2024-10-12'
    },
    billing: {
      totalSpent: 45000.00,
      lastPayment: '2024-12-05',
      nextBilling: '2025-01-05',
      paymentMethod: 'Transferência',
      invoices: 8
    }
  },
  {
    id: '6',
    name: 'Roberto Lima',
    email: 'smartech',
    company: 'SmarTech Industries',
    role: 'client',
    createdAt: '2024-04-12T14:20:00Z',
    lastLogin: '2025-07-30T10:00:00Z',
    isActive: true,
    credits: {
      total: 3000,
      used: 2800,
      remaining: 200,
      exceeded: false
    },
    subscription: {
      plan: 'premium',
      status: 'active',
      startDate: '2024-04-12',
      endDate: '2025-04-12',
      monthlyLimit: 3000
    },
    usage: {
      thisMonth: 2800,
      lastMonth: 2950,
      averageMonthly: 2850,
      peakUsage: 3000,
      peakDate: '2024-09-22'
    },
    billing: {
      totalSpent: 18500.00,
      lastPayment: '2024-12-12',
      nextBilling: '2025-01-12',
      paymentMethod: 'Cartão **** 5678',
      invoices: 9
    }
  }
]

// Statistics for dashboard
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalCreditsUsed: number
  totalRevenue: number
  averageUsage: number
  usersExceeded: number
  pendingPayments: number
  newUsersThisMonth: number
  churnRate: number
}

export const getDashboardStats = (): DashboardStats => {
  const clients = mockUsers.filter(user => user.role === 'client')
  
  return {
    totalUsers: clients.length,
    activeUsers: clients.filter(user => user.isActive).length,
    inactiveUsers: clients.filter(user => !user.isActive).length,
    totalCreditsUsed: clients.reduce((sum, user) => sum + user.credits.used, 0),
    totalRevenue: clients.reduce((sum, user) => sum + user.billing.totalSpent, 0),
    averageUsage: clients.length > 0 ? clients.reduce((sum, user) => sum + user.usage.averageMonthly, 0) / clients.length : 0,
    usersExceeded: clients.filter(user => user.credits.exceeded).length,
    pendingPayments: clients.filter(user => user.subscription.status === 'suspended').length,
    newUsersThisMonth: clients.filter(user => {
      const created = new Date(user.createdAt)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length,
    churnRate: clients.length > 0 ? (clients.filter(user => !user.isActive).length / clients.length) * 100 : 0
  }
}
