import { Clock, CreditCard, TrendingUp, Users } from "lucide-react"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { ProgressCard } from "@/components/dashboard/ProgressCard"
import { AlertCard } from "@/components/dashboard/AlertCard"
import { ConsumptionChart } from "@/components/dashboard/ConsumptionChart"
import { getCurrentClient, formatLastUsage, ClientData } from "@/data/mockData"
import { useToast } from "@/hooks/use-toast"
import { Layout } from "@/components/layout/Layout"
import { useState, useEffect } from "react"

export default function Inicio() {
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  
  useEffect(() => {
    const loadClient = async () => {
      try {
        setLoading(true)
        const clientData = await getCurrentClient()
        setClient(clientData)
      } catch (error) {
        console.error('Error loading client:', error)
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do cliente",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [toast])

  if (loading || !client) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </Layout>
    )
  }
  
  const usagePercentage = Math.round((client.credits.used / client.credits.total) * 100)
  
  const getAlertType = () => {
    if (client.type === "projeto") return "success"
    if (usagePercentage >= 100) return "blocked"
    if (usagePercentage >= 85) return "warning"
    return "success"
  }

  const handleUpgrade = () => {
    toast({
      title: "Upgrade solicitado",
      description: "Em breve você será redirecionado para as opções de upgrade.",
    })
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Início
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo ao painel de controle do {client.name} • 
              Tipo: <span className="capitalize font-medium text-accent">{client.type}</span>
            </p>
          </div>

          {/* Consumo Mensal */}
          <div className="grid gap-6 md:grid-cols-1">
            <ProgressCard
              title="Consumo Mensal"
              current={client.credits.used}
              total={client.credits.total}
              variant={usagePercentage >= 100 ? "destructive" : usagePercentage >= 85 ? "warning" : "default"}
              showAlert={getAlertType() === "warning" || getAlertType() === "blocked"}
              alertType={getAlertType() as "warning" | "blocked"}
              onUpgrade={handleUpgrade}
            />
          </div>

          {/* Cards de Métricas */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Créditos Totais"
              value={client.credits.total.toLocaleString('pt-BR')}
              icon={<CreditCard />}
              subtitle={client.type === "projeto" ? "Pré-pago" : "Limite mensal"}
              variant="accent"
            />
            
            <MetricCard
              title="Créditos Consumidos"
              value={client.credits.used.toLocaleString('pt-BR')}
              subtitle={`${usagePercentage}% do total`}
              icon={<TrendingUp />}
              variant={usagePercentage >= 85 ? "warning" : "default"}
            />
            
            <MetricCard
              title="Créditos Restantes"
              value={client.credits.remaining.toLocaleString('pt-BR')}
              subtitle={client.type === "projeto" ? "Saldo atual" : "Até fim do mês"}
              icon={<Users />}
              variant={client.credits.remaining < 1000 ? "destructive" : "success"}
            />
            
            <MetricCard
              title="Último Uso"
              value={formatLastUsage(client.lastUsage)}
              subtitle="Interação com IA"
              icon={<Clock />}
            />
          </div>

          {/* Gráfico de Consumo */}
          <ConsumptionChart data={client.monthlyConsumption} />
        </div>
      </div>
    </Layout>
  )
}