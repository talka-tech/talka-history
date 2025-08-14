import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Layout } from "@/components/layout/Layout"
import { getCurrentClient, ClientData } from "@/data/mockData"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { clientAPI } from "@/api/clientAPI"
import { useAuth } from "@/contexts/AuthContext"

export default function Configuracoes() {
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [notifications, setNotifications] = useState({
    creditAlert85: true,
    creditEmpty: true,
    monthlyReport: false,
    anomalousUsage: false
  })
  const { toast } = useToast()
  const { user } = useAuth()
  
  useEffect(() => {
    const loadClient = async () => {
      try {
        setLoading(true)
        const clientData = await getCurrentClient()
        setClient(clientData)
        setCompanyName(clientData.name)
        setEmail(user?.email || "")
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
  }, [toast, user])

  const handleSaveCompanyInfo = async () => {
    if (!client || !user) return
    
    setSaving(true)
    try {
      // Atualizar o nome da empresa no banco
      const result = await clientAPI.updateClient(parseInt(client.id), {
        name: companyName
      })
      
      if (result.success) {
        // Atualizar estado local
        setClient(prev => prev ? { ...prev, name: companyName } : null)
        
        // Disparar evento para atualizar sidebar
        window.dispatchEvent(new CustomEvent('clientDataUpdated'))
        
        toast({
          title: "Sucesso",
          description: "Nome da empresa atualizado com sucesso!",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !client) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas preferências e configurações da conta
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações da Conta */}
            <Card className="animate-fade-in flex flex-col h-full">
              <CardHeader>
                <CardTitle>Informações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base">Nome da Empresa</Label>
                    <Input 
                      id="name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nome da sua empresa"
                      className="h-12 text-base"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-base">Tipo de Cliente</Label>
                    <Input 
                      id="type"
                      value={client.type === "individual" ? "Individual" : "Projeto"}
                      disabled
                      className="bg-muted h-12 text-base"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-base">E-mail de Contato</Label>
                    <Input 
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSaveCompanyInfo} 
                  className="w-full mt-8 h-12 text-base"
                  disabled={saving || !companyName.trim()}
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </CardContent>
            </Card>

            {/* Configurações de Sistema */}
            <Card className="animate-fade-in flex flex-col h-full">
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="space-y-6">
                    <Label className="text-base">Notificações por E-mail</Label>
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <Checkbox 
                          id="creditAlert85"
                          checked={notifications.creditAlert85}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, creditAlert85: checked === true }))
                          }
                          className="h-5 w-5"
                        />
                        <Label htmlFor="creditAlert85" className="text-base font-normal cursor-pointer">
                          Alertas quando os créditos atingirem 80%
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Checkbox 
                          id="creditEmpty"
                          checked={notifications.creditEmpty}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, creditEmpty: checked === true }))
                          }
                          className="h-5 w-5"
                        />
                        <Label htmlFor="creditEmpty" className="text-base font-normal cursor-pointer">
                          Notificação quando os créditos esgotarem
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Checkbox 
                          id="monthlyReport"
                          checked={notifications.monthlyReport}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, monthlyReport: checked === true }))
                          }
                          className="h-5 w-5"
                        />
                        <Label htmlFor="monthlyReport" className="text-base font-normal cursor-pointer">
                          Relatório mensal de consumo
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Checkbox 
                          id="anomalousUsage"
                          checked={notifications.anomalousUsage}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, anomalousUsage: checked === true }))
                          }
                          className="h-5 w-5"
                        />
                        <Label htmlFor="anomalousUsage" className="text-base font-normal cursor-pointer">
                          Alertas de uso anômalo (picos de consumo)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-8 h-12 text-base"
                  onClick={() => toast({
                    title: "Preferências salvas",
                    description: "Suas preferências de notificação foram atualizadas.",
                  })}
                >
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>

            {/* Plano Atual */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Plano Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tipo:</span>
                    <span className="text-sm capitalize">{client.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Créditos Mensais:</span>
                    <span className="text-sm">{client.credits.total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={`text-sm font-medium ${
                      client.credits.remaining > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {client.credits.remaining > 0 ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </div>
                </div>
                
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  Fazer Upgrade
                </Button>
              </CardContent>
            </Card>

            {/* Suporte */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Suporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Precisa de ajuda? Entre em contato com o suporte da Talka.
                </p>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      const phoneNumber = "5581991085679"
                      const message = "Olá, tive um problema com o Tarifador da Talka"
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
                      window.open(whatsappUrl, '_blank')
                    }}
                  >
                    Contato: +55 (81) 99108-5679
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    E-mail: suporte@talka.tech
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}