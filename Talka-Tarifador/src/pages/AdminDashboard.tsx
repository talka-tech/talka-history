import { useState, useEffect } from "react"
import { Users, DollarSign, TrendingUp, AlertTriangle, LogOut, Search, Ban, Trash2, Edit, RefreshCw, Plus, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AdminCharts } from "@/components/dashboard/AdminCharts"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { clientAPI } from "@/api/clientAPI"
import { Client } from "@/lib/supabase"

interface DashboardStats {
  totalClients: number
  activeClients: number
  inactiveClients: number
  totalCreditsUsed: number
  averageUsage: number
  totalRevenue: number
  clientsExceeded: number
  pendingPayments: number
}

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [clientUsers, setClientUsers] = useState<{[key: string]: any}>({})
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newCredits, setNewCredits] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newClientData, setNewClientData] = useState({
    name: "",
    login: "",
    type: "projeto" as "projeto" | "individual",
    credits_total: "",
    password: ""
  })
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([])
  const [passwordVisibility, setPasswordVisibility] = useState<{[key: string]: boolean}>({})
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [editData, setEditData] = useState<{login: string, password: string}>({login: "", password: ""})
  const [usageData, setUsageData] = useState<{ month: string; usage: number }[]>([])
  const { toast } = useToast()
  const { logout } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterClients()
  }, [clients, searchQuery, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const clientsData = await clientAPI.getAllClients()
      setClients(clientsData)
      
      // No need to fetch user data separately - it's in the clients table now
      console.log('🔍 Clients data:', clientsData)
      const usersMap: {[key: string]: any} = {}
      clientsData.forEach(client => {
        usersMap[client.id] = {
          email: client.login,
          password: client.password
        }
      })
      
      console.log('👥 Final users map:', usersMap)
      setClientUsers(usersMap)
      
      // Calculate stats
      const activeClients = clientsData.filter(c => c.is_active).length
      const inactiveClients = clientsData.filter(c => !c.is_active).length
      const totalCreditsUsed = clientsData.reduce((sum, c) => sum + c.credits_used, 0)
      const clientsExceeded = clientsData.filter(c => c.credits_used >= c.credits_total).length
      
      setStats({
        totalClients: clientsData.length,
        activeClients,
        inactiveClients,
        totalCreditsUsed,
        averageUsage: clientsData.length > 0 ? Math.round(totalCreditsUsed / clientsData.length) : 0,
        totalRevenue: clientsData.reduce((sum, c) => sum + (c.credits_total * 0.001), 0), // Mock revenue calculation
        clientsExceeded,
        pendingPayments: 0 // Mock value
      })

      // Mock chart data
      setRevenueData([
        { month: 'Jan', revenue: 4000 },
        { month: 'Fev', revenue: 3000 },
        { month: 'Mar', revenue: 2000 },
        { month: 'Abr', revenue: 2780 },
        { month: 'Mai', revenue: 1890 },
        { month: 'Jun', revenue: 2390 },
      ])

      setUsageData([
        { month: 'Jan', usage: 400000 },
        { month: 'Fev', usage: 300000 },
        { month: 'Mar', usage: 200000 },
        { month: 'Abr', usage: 278000 },
        { month: 'Mai', usage: 189000 },
        { month: 'Jun', usage: 239000 },
      ])
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (clientId: string) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }))
  }

  const startEditingClient = (client: Client) => {
    const userData = clientUsers[client.id]
    setEditingClient(client.id.toString())
    setEditData({
      login: userData?.email || '',
      password: userData?.password || ''
    })
  }

  const cancelEditing = () => {
    setEditingClient(null)
    setEditData({login: "", password: ""})
  }

  const saveClientEdit = async (clientId: string) => {
    try {
      // Update client credentials via API
      const result = await clientAPI.updateClientCredentials(
        parseInt(clientId),
        editData.login,
        editData.password
      )

      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message,
        })
        
        // Update local state
        setClientUsers(prev => ({
          ...prev,
          [clientId]: {
            ...prev[clientId],
            email: editData.login,
            password: editData.password
          }
        }))
        
        setEditingClient(null)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar credenciais",
        variant: "destructive"
      })
    }
  }

  const filterClients = () => {
    let filtered = clients

    if (searchQuery) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.id.toString().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(client => client.is_active)
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(client => !client.is_active)
    } else if (statusFilter === "exceeded") {
      filtered = filtered.filter(client => client.credits_used >= client.credits_total)
    }

    setFilteredClients(filtered)
  }

  const handleStatusToggle = async (clientId: number, currentStatus: boolean) => {
    try {
      const result = await clientAPI.toggleClientStatus(clientId)
      if (result.success) {
        await loadData()
        toast({
          title: "Sucesso",
          description: result.message
        })
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do cliente",
        variant: "destructive"
      })
    }
  }

  const handleUpdateCredits = async () => {
    if (!selectedClient || !newCredits) return

    try {
      const credits = parseInt(newCredits)
      if (isNaN(credits) || credits < 0) {
        toast({
          title: "Erro",
          description: "Digite um valor válido para os créditos",
          variant: "destructive"
        })
        return
      }

      const result = await clientAPI.updateClientCredits(selectedClient.id, credits)
      if (result.success) {
        await loadData()
        setDialogOpen(false)
        setSelectedClient(null)
        setNewCredits("")
        toast({
          title: "Sucesso",
          description: result.message
        })
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar créditos",
        variant: "destructive"
      })
    }
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      const result = await clientAPI.deleteClient(clientToDelete.id)
      if (result.success) {
        await loadData()
        setDeleteDialogOpen(false)
        setClientToDelete(null)
        toast({
          title: "Sucesso",
          description: result.message
        })
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir cliente",
        variant: "destructive"
      })
    }
  }

  const handleCreateClient = async () => {
    if (!newClientData.name || !newClientData.login || !newClientData.credits_total || !newClientData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      })
      return
    }

    try {
      const credits = parseInt(newClientData.credits_total)
      if (isNaN(credits) || credits <= 0) {
        toast({
          title: "Erro",
          description: "Digite um valor válido para os créditos",
          variant: "destructive"
        })
        return
      }

      const result = await clientAPI.createClient({
        name: newClientData.name,
        login: newClientData.login,
        type: newClientData.type,
        credits_total: credits,
        password: newClientData.password
      })
      
      if (result.success) {
        await loadData()
        setCreateDialogOpen(false)
        setNewClientData({
          name: "",
          login: "",
          type: "projeto",
          credits_total: "",
          password: ""
        })
        toast({
          title: "Sucesso",
          description: "Cliente criado com sucesso"
        })
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar cliente",
        variant: "destructive"
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Header com logo e botão de logout */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="Talka Logo" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel Administrativo TALKA</h1>
              <p className="text-muted-foreground">Gerencie clientes e monitore o sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={logout}
              className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Dashboard & Clientes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalClients}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeClients} ativos, {stats.inactiveClients} inativos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                      Média: {formatCurrency(stats.totalRevenue / (stats.totalClients || 1))} por cliente
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Créditos Utilizados</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCreditsUsed.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Média: {Math.round(stats.averageUsage).toLocaleString()} por cliente
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes com Problemas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.clientsExceeded}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.clientsExceeded} excederam limite
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros e Busca de Clientes</CardTitle>
                <CardDescription>Filtre e busque clientes do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                        <SelectItem value="exceeded">Excederam Limite</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Quick Filter Buttons */}
                    <Button 
                      variant={statusFilter === "exceeded" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(statusFilter === "exceeded" ? "all" : "exceeded")}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Excederam
                    </Button>
                    
                    <Button 
                      variant={statusFilter === "inactive" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(statusFilter === "inactive" ? "all" : "inactive")}
                      className="flex items-center gap-2"
                    >
                      <Ban className="h-4 w-4" />
                      Inativos
                    </Button>

                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={loadData}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Atualizar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Clientes ({filteredClients.length})</CardTitle>
                    <CardDescription>Lista de todos os clientes do sistema</CardDescription>
                  </div>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Cliente
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Empresa</TableHead>
                        <TableHead>Login/Senha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Créditos</TableHead>
                        <TableHead>Uso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => {
                        const usagePercentage = Math.round((client.credits_used / client.credits_total) * 100)
                        const exceeded = client.credits_used >= client.credits_total
                        
                        return (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {clientUsers[client.id] ? (
                                <div className="space-y-1">
                                  {editingClient === client.id.toString() ? (
                                    // Edit mode
                                    <div className="space-y-2">
                                      <Input
                                        value={editData.login}
                                        onChange={(e) => setEditData(prev => ({...prev, login: e.target.value}))}
                                        placeholder="Login"
                                        className="h-8 text-xs"
                                      />
                                      <div className="flex items-center space-x-1">
                                        <Input
                                          type={passwordVisibility[client.id] ? "text" : "password"}
                                          value={editData.password}
                                          onChange={(e) => setEditData(prev => ({...prev, password: e.target.value}))}
                                          placeholder="Senha"
                                          className="h-8 text-xs"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => togglePasswordVisibility(client.id.toString())}
                                          className="h-8 w-8 p-0"
                                        >
                                          {passwordVisibility[client.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                      </div>
                                      <div className="flex space-x-1">
                                        <Button size="sm" onClick={() => saveClientEdit(client.id.toString())} className="h-6 text-xs">
                                          Salvar
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={cancelEditing} className="h-6 text-xs">
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View mode
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-1">
                                        <span className="text-blue-600">{clientUsers[client.id].email}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingClient(client)}
                                          className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <span className="text-green-600">
                                          {passwordVisibility[client.id] ? clientUsers[client.id].password : '••••••••'}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => togglePasswordVisibility(client.id.toString())}
                                          className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                                        >
                                          {passwordVisibility[client.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">-</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={client.type === "projeto" ? "secondary" : "default"}>
                                {client.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{client.credits_total.toLocaleString()}</div>
                                <div className="text-muted-foreground">Total</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className={exceeded ? "text-destructive font-semibold" : ""}>
                                  {client.credits_used.toLocaleString()} ({usagePercentage}%)
                                </div>
                                <div className="text-muted-foreground">
                                  {client.credits_remaining.toLocaleString()} restante
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={client.is_active ? "default" : "secondary"}>
                                {client.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                              {exceeded && (
                                <Badge variant="destructive" className="ml-1">
                                  Excedeu
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(client.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClient(client)
                                    setNewCredits(client.credits_total.toString())
                                    setDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusToggle(client.id, client.is_active)}
                                  className={client.is_active ? "hover:bg-orange-50" : "hover:bg-green-50"}
                                >
                                  <Ban className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setClientToDelete(client)
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filteredClients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum cliente encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {stats && (
              <AdminCharts 
                revenueData={revenueData}
                usageData={usageData}
                userDistribution={[
                  { name: 'Ativos', value: stats.activeClients, color: 'hsl(var(--accent))' },
                  { name: 'Inativos', value: stats.inactiveClients, color: '#ef4444' },
                  { name: 'Excederam', value: stats.clientsExceeded, color: '#f97316' }
                ]}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Credits Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Créditos</DialogTitle>
              <DialogDescription>
                Atualize o limite de créditos para {selectedClient?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="credits">Total de Créditos</Label>
                <Input
                  id="credits"
                  type="number"
                  value={newCredits}
                  onChange={(e) => setNewCredits(e.target.value)}
                  placeholder="Digite o novo limite de créditos"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateCredits}>
                  Atualizar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Client Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              <DialogDescription>
                Crie uma nova conta de cliente no sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Nome da Empresa *</Label>
                <Input
                  id="clientName"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                  placeholder="Digite o nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="clientLogin">Login *</Label>
                <Input
                  id="clientLogin"
                  value={newClientData.login}
                  onChange={(e) => setNewClientData({...newClientData, login: e.target.value})}
                  placeholder="Digite o login do cliente"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este será o nome de usuário para login (sem @talka.local)
                </p>
              </div>
              <div>
                <Label htmlFor="clientPassword">Senha de Acesso *</Label>
                <Input
                  id="clientPassword"
                  type="text"
                  value={newClientData.password}
                  onChange={(e) => setNewClientData({...newClientData, password: e.target.value})}
                  placeholder="Digite a senha do cliente"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta senha será usada pelo cliente para fazer login
                </p>
              </div>
              <div>
                <Label htmlFor="clientType">Tipo de Cliente</Label>
                <Select 
                  value={newClientData.type} 
                  onValueChange={(value: "projeto" | "individual") => 
                    setNewClientData({...newClientData, type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="clientCredits">Total de Créditos *</Label>
                <Input
                  id="clientCredits"
                  type="number"
                  value={newClientData.credits_total}
                  onChange={(e) => setNewClientData({...newClientData, credits_total: e.target.value})}
                  placeholder="Digite o limite de créditos"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateClient}>
                  Criar Cliente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Cliente</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir permanentemente o cliente "{clientToDelete?.name}"?
                Esta ação não pode ser desfeita e todos os dados do histórico serão perdidos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteClient}>
                Excluir Permanentemente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
