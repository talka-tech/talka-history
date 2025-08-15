import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Layout } from "@/components/layout/Layout"

import { getCurrentClient, ClientData } from "@/data/mockData"
import { useClient } from "@/contexts/ClientContext"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { clientAPI } from "@/api/clientAPI"
import { useAuth } from "@/contexts/AuthContext"

export default function Configuracoes() {

  const { client, loading } = useClient();
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
    if (client) {
      setCompanyName(client.name)
      setEmail(user?.email || "")
    }
  }, [client, user])

  const handleSaveCompanyInfo = async () => {
    if (!client || !user) return
    setSaving(true)
    try {
      // Atualizar o nome da empresa no banco
      const result = await clientAPI.updateClient(parseInt(client.id), {
        name: companyName
      })
      if (result.success) {
        // Disparar evento para atualizar sidebar e contexto
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

  const clientColor = client?.color || "#4f46e5";
  if (loading || !client) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: `2px solid ${clientColor}` }}></div>
        </div>
      </Layout>
    )
  }

  // Helper for subtle backgrounds
  const cardBg = `${clientColor}20` // ~12% opacity
  const cardBorder = clientColor

  return (
    <Layout>
  <div className="min-h-screen" style={{ background: '#151518' }}>
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-zinc-200">
              Configurações
            </h1>
            <p className="text-zinc-300">
              Gerencie suas preferências e configurações da conta
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações da Conta */}
            <Card className="animate-fade-in flex flex-col h-full" style={{ borderColor: cardBorder, background: cardBg }}>
              <CardHeader>
                <CardTitle className="text-zinc-200">Informações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base text-zinc-300">Nome da Empresa</Label>
                    <Input 
                      id="name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nome da sua empresa"
                      className="h-12 text-base bg-zinc-800 text-zinc-200 border"
                      style={{ borderColor: clientColor, borderWidth: 1 }}
                      focusRingColor="#fde047"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-base text-zinc-300">Tipo de Cliente</Label>
                    <Input 
                      id="type"
                      value={client.type === "individual" ? "Individual" : "Projeto"}
                      disabled
                      className="bg-zinc-800 text-zinc-200 h-12 text-base border"
                      style={{ borderColor: clientColor, borderWidth: 1 }}
                      focusRingColor="#fde047"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-base text-zinc-300">E-mail de Contato</Label>
                    <Input 
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="h-12 text-base bg-zinc-800 text-zinc-200 border"
                      style={{ borderColor: clientColor, borderWidth: 1 }}
                      focusRingColor="#fde047"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSaveCompanyInfo} 
                  className="w-full mt-8 h-12 text-base bg-zinc-800 text-zinc-200 border" 
                  style={{ borderColor: clientColor, borderWidth: 1 }}
                  disabled={saving || !companyName.trim()}
                  onMouseOver={e => { e.currentTarget.style.background = clientColor; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </CardContent>
            </Card>

            {/* Configurações de Sistema */}
            <Card className="animate-fade-in flex flex-col h-full" style={{ borderColor: cardBorder, background: cardBg }}>
              <CardHeader>
                <CardTitle className="text-zinc-200">Preferências do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="space-y-6">
                    <Label className="text-base text-zinc-300">Notificações por E-mail</Label>
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <Checkbox 
                          id="creditAlert85"
                          checked={notifications.creditAlert85}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, creditAlert85: checked === true }))
                          }
                          className="h-5 w-5"
                          style={{ borderColor: clientColor }}
                          color={clientColor}
                          checkedBgColor="#fde047"
                          checkedCheckColor="#fff"
                        />
                        <Label htmlFor="creditAlert85" className="text-base font-normal cursor-pointer text-zinc-200">
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
                          style={{ borderColor: clientColor }}
                          color={clientColor}
                          checkedBgColor="#fde047"
                          checkedCheckColor="#fff"
                        />
                        <Label htmlFor="creditEmpty" className="text-base font-normal cursor-pointer text-zinc-200">
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
                          style={{ borderColor: clientColor }}
                          color={clientColor}
                          checkedBgColor="#fde047"
                          checkedCheckColor="#fff"
                        />
                        <Label htmlFor="monthlyReport" className="text-base font-normal cursor-pointer text-zinc-200">
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
                          style={{ borderColor: clientColor }}
                          color={clientColor}
                          checkedBgColor="#fde047"
                          checkedCheckColor="#fff"
                        />
                        <Label htmlFor="anomalousUsage" className="text-base font-normal cursor-pointer text-zinc-200">
                          Alertas de uso anômalo (picos de consumo)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-8 h-12 text-base bg-zinc-800 text-zinc-200 border" 
                  style={{ borderColor: clientColor, borderWidth: 1 }}
                  onClick={() => toast({
                    title: "Preferências salvas",
                    description: "Suas preferências de notificação foram atualizadas.",
                  })}
                  onMouseOver={e => { e.currentTarget.style.background = clientColor; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                >
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>

            {/* Plano Atual */}
            <Card className="animate-fade-in" style={{ borderColor: cardBorder, background: cardBg }}>
              <CardHeader>
                <CardTitle className="text-zinc-200">Plano Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-zinc-300">Tipo:</span>
                    <span className="text-sm capitalize text-zinc-400">{client.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-zinc-300">Créditos Mensais:</span>
                    <span className="text-sm text-zinc-400">{client.credits.total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-zinc-300">Status:</span>
                    <span className={`text-sm font-medium ${client.credits.remaining > 0 ? 'text-zinc-400' : 'text-red-500'}`}> 
                      {client.credits.remaining > 0 ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-zinc-800 text-zinc-200 border" 
                  style={{ borderColor: clientColor, borderWidth: 1 }}
                  onMouseOver={e => { e.currentTarget.style.background = clientColor; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                >
                  Fazer Upgrade
                </Button>
              </CardContent>
            </Card>

            {/* Suporte */}
            <Card className="animate-fade-in" style={{ borderColor: cardBorder, background: cardBg }}>
              <CardHeader>
                <CardTitle className="text-zinc-200">Suporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-300">
                  Precisa de ajuda? Entre em contato com o suporte da Talka.
                </p>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-zinc-800 text-zinc-200 border" 
                    style={{ borderColor: clientColor, borderWidth: 1 }}
                    onClick={() => {
                      const phoneNumber = "5581991085679"
                      const message = "Olá, tive um problema com o Tarifador da Talka"
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
                      window.open(whatsappUrl, '_blank')
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = clientColor; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                  >
                    Contato: +55 (81) 99108-5679
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-zinc-800 text-zinc-200 border" 
                    style={{ borderColor: clientColor, borderWidth: 1 }}
                    onMouseOver={e => { e.currentTarget.style.background = clientColor; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                  >
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
