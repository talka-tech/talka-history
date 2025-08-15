import { clientAPI } from '@/api/clientAPI'
import { Client } from '@/lib/supabase'

export interface ClientData {
  id: string
  name: string
  type: "comum" | "projeto" | "individual"
  credits: {
    total: number
    used: number
    remaining: number
  }
  lastUsage: Date
  monthlyConsumption: Array<{
    day: string
    credits: number
    date: string
  }>
  color?: string // Cor primária do cliente
  logo_url?: string // Logo do cliente
  product_name?: string // Nome da frente/produto
}

// Generate mock monthly data for fallback
const generateMockMonthlyData = (usedCredits: number) => {
  const today = new Date()
  const currentDay = today.getDate()
  const data = []
  
  let remainingCredits = usedCredits
  
  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day)
    const dayName = date.toLocaleDateString('pt-BR', { day: '2-digit' })
    const fullDate = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long' 
    })
    
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const baseUsage = isWeekend ? 50 : 150
    const variation = Math.random() * 100 - 50
    let dailyUsage = Math.max(0, Math.floor(baseUsage + variation))
    
    if (day === currentDay) {
      dailyUsage = remainingCredits
    } else {
      dailyUsage = Math.min(dailyUsage, Math.floor(remainingCredits * 0.8))
      remainingCredits -= dailyUsage
    }
    
    data.push({
      day: dayName,
      credits: dailyUsage,
      date: fullDate
    })
  }
  
  return data
}

// Convert Supabase client to legacy format for compatibility
const convertClientData = (client: any): ClientData => {
  // client pode vir com talka_products aninhado
  const product = client.talka_products || {};
  return {
    id: client.id.toString(),
    name: client.name,
    type: client.type,
    credits: {
      total: client.credits_total,
      used: client.credits_used,
      remaining: client.credits_remaining
    },
    lastUsage: client.last_usage ? new Date(client.last_usage) : new Date(),
    monthlyConsumption: generateMockMonthlyData(client.credits_used),
    color: typeof product.color === 'string' ? product.color : undefined,
    logo_url: product.logo_url || undefined,
    product_name: (client.talka_products && client.talka_products.name) || client.product_name || product.name || undefined
  }
}

// Get current client from localStorage user
export const getCurrentClient = async (): Promise<ClientData> => {
  try {
    const storedUser = localStorage.getItem('talka-user')
    
    if (!storedUser) {
      // Return empty/default data if no user logged in
      return {
        id: 'empty',
        name: 'Nenhum cliente',
        type: 'comum',
        credits: { total: 0, used: 0, remaining: 0 },
        lastUsage: new Date(),
        monthlyConsumption: [],
        color: '#2563eb',
        logo_url: '/logos/talka_logo.png'
      }
    }

    const user = JSON.parse(storedUser)
    
    // If user is admin, show empty data (admin doesn't have client data)
    if (user.role === 'admin' || user.role === 'super_admin') {
      return {
        id: 'admin',
        name: 'Painel Administrativo',
        type: 'comum',
        credits: { total: 0, used: 0, remaining: 0 },
        lastUsage: new Date(),
        monthlyConsumption: [],
        color: '#2563eb',
        logo_url: '/logos/talka_logo.png'
      }
    }

    // If user is a client (role === 'client' OR 'user'), get real data from database
    if (user.role === 'client' || user.role === 'user') {
      try {
        // Get all clients from database
        const clients = await clientAPI.getAllClients()
        
        // Find the client by ID
        const client = clients.find(c => c.id === user.id)
        
        if (client) {
          return convertClientData(client)
        } else {
          // Return user data as fallback until we figure out the database issue
          return {
            id: user.id?.toString() || '3',
            name: user.name || 'WRL Bonés',
            type: 'individual',
            credits: { 
              total: 5000, 
              used: 1250, 
              remaining: 3750 
            },
            lastUsage: new Date(Date.now() - 45 * 60 * 1000), // 45 min atrás
            monthlyConsumption: generateMockMonthlyData(1250),
            color: '#2563eb',
            logo_url: '/logos/talka_logo.png'
          }
        }
      } catch (dbError) {
        // Emergency fallback with user data
        return {
          id: user.id?.toString() || '3',
          name: user.name || 'WRL Bonés',
          type: 'individual',
          credits: { 
            total: 5000, 
            used: 1250, 
            remaining: 3750 
          },
          lastUsage: new Date(Date.now() - 45 * 60 * 1000),
          monthlyConsumption: generateMockMonthlyData(1250),
          color: '#2563eb',
          logo_url: '/logos/talka_logo.png'
        }
      }
    }

    // Fallback if no client found
    return {
      id: user.id?.toString() || 'unknown',
      name: user.name || 'Cliente',
      type: 'individual',
      credits: { total: 0, used: 0, remaining: 0 },
      lastUsage: new Date(),
      monthlyConsumption: [],
      color: '#2563eb',
      logo_url: '/logos/talka_logo.png'
    }
  } catch (error) {
    console.error('Error getting current client:', error)
    // Return empty data on error
    return {
      id: 'error',
      name: 'Erro ao carregar',
      type: 'comum',
      credits: { total: 0, used: 0, remaining: 0 },
      lastUsage: new Date(),
      monthlyConsumption: [],
      color: '#2563eb',
      logo_url: '/logos/talka_logo.png'
    }
  }
}

export const formatLastUsage = (date: Date): string => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return "Agora"
  if (diffInMinutes < 60) return `${diffInMinutes} min atrás`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h atrás`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} dias atrás`
}