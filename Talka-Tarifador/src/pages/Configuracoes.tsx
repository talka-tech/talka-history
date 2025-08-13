import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Layout } from "@/components/layout/Layout"
import { getCurrentClient, ClientData } from "@/data/mockData"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export default function Configuracoes() {
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

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas configurações foram atualizadas com sucesso.",
    })
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
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Informações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input 
                    id="name"
                    defaultValue={client.name}
                    placeholder="Nome da sua empresa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Cliente</Label>
                  <Input 
                    id="type"
                    value={client.type === "comum" ? "Cliente Comum" : "Projeto"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                  />
                </div>
                
                <Button onClick={handleSave} className="w-full">
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>

            {/* Configurações de Sistema */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Tema</Label>
                    <p className="text-sm text-muted-foreground">
                      Alterne entre modo claro e escuro
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notifications">Notificações por E-mail</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span>Alertas de limite de créditos</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span>Relatórios mensais</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Novidades e atualizações</span>
                    </label>
                  </div>
                </div>
                
                <Button variant="outline" onClick={handleSave} className="w-full">
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
                  Precisa de ajuda? Entre em contato conosco.
                </p>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    📞 Telefone: (11) 9999-9999
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    ✉️ E-mail: suporte@talka.com.br
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    💬 Chat Online
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