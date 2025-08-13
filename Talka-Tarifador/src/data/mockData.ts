export interface ClientData {
  id: string
  name: string
  type: "comum" | "projeto"
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
}

// Gerar dados de consumo diário para o mês atual
const generateMonthlyData = (usedCredits: number) => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const currentDay = today.getDate()
  
  const data = []
  let remainingCredits = usedCredits
  
  // Distribuir os créditos usados ao longo dos dias do mês (até hoje)
  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(currentYear, currentMonth, day)
    const dayName = date.toLocaleDateString('pt-BR', { day: '2-digit' })
    const fullDate = date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long' 
    })
    
    // Distribuição mais realista - mais uso durante a semana
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const baseUsage = isWeekend ? 50 : 150
    const variation = Math.random() * 100 - 50 // -50 a +50
    let dailyUsage = Math.max(0, Math.floor(baseUsage + variation))
    
    // Garantir que não exceda os créditos restantes
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

// Simular diferentes cenários de clientes
export const mockClients: ClientData[] = [
  {
    id: "1",
    name: "Empresa ABC",
    type: "comum",
    credits: {
      total: 10000,
      used: 8900, // 89% - próximo do limite
      remaining: 1100
    },
    lastUsage: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    monthlyConsumption: generateMonthlyData(8900)
  },
  {
    id: "2", 
    name: "Startup XYZ",
    type: "comum",
    credits: {
      total: 5000,
      used: 5000, // 100% - bloqueado
      remaining: 0
    },
    lastUsage: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
    monthlyConsumption: generateMonthlyData(5000)
  },
  {
    id: "3",
    name: "Projeto Enterprise",
    type: "projeto",
    credits: {
      total: 50000, // Valor alto para projetos
      used: 12500,
      remaining: 37500
    },
    lastUsage: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    monthlyConsumption: generateMonthlyData(12500)
  },
  {
    id: "4",
    name: "Cliente Premium",
    type: "comum",
    credits: {
      total: 15000,
      used: 3200, // 21% - uso normal
      remaining: 11800
    },
    lastUsage: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
    monthlyConsumption: generateMonthlyData(3200)
  }
]

// Cliente ativo atual (pode ser alterado para simular diferentes cenários)
export const getCurrentClient = (): ClientData => {
  // Para demonstração, retornar cliente com 89% de uso (cenário de alerta)
  return mockClients[0]
  
  // Para testar diferentes cenários, descomente uma das linhas abaixo:
  // return mockClients[1] // Cliente bloqueado (100%)
  // return mockClients[2] // Projeto (sem limite)
  // return mockClients[3] // Cliente normal (21%)
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