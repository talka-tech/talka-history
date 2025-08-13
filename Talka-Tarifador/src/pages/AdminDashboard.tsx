import { useState, useEffect } from "react"
import { Search, Users, TrendingUp, AlertTriangle, DollarSign, Eye, Ban, RotateCcw, Edit3, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/api"
import { User, DashboardStats } from "@/api/userData"
import { AdminCharts } from "@/components/dashboard/AdminCharts"

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newCredits, setNewCredits] = useState("")
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([])
  const [usageData, setUsageData] = useState<{ month: string; usage: number }[]>([])
  const { toast } = useToast()
  const { logout } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, statsData, revenueResponse, usageResponse] = await Promise.all([
        apiClient.users.getAll(),
        apiClient.dashboard.getStatistics(),
        apiClient.dashboard.getRevenueData(),
        apiClient.dashboard.getUsageData()
      ])
      setUsers(usersData)
      setStats(statsData)
      setRevenueData(revenueResponse)
      setUsageData(usageResponse)
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

  const filterUsers = () => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(user => user.isActive)
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(user => !user.isActive)
    } else if (statusFilter === "exceeded") {
      filtered = filtered.filter(user => user.credits.exceeded)
    }

    setFilteredUsers(filtered)
  }

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const success = await apiClient.users.updateStatus(userId, !currentStatus)
      if (success) {
        await loadData()
        toast({
          title: "Sucesso",
          description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do usuário",
        variant: "destructive"
      })
    }
  }

  const handleResetCredits = async (userId: string) => {
    try {
      const success = await apiClient.users.resetCredits(userId)
      if (success) {
        await loadData()
        toast({
          title: "Sucesso",
          description: "Créditos resetados com sucesso"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao resetar créditos",
        variant: "destructive"
      })
    }
  }

  const handleUpdateCredits = async () => {
    if (!selectedUser || !newCredits) return

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

      const success = await apiClient.users.updateCredits(selectedUser.id, credits)
      if (success) {
        await loadData()
        setDialogOpen(false)
        setSelectedUser(null)
        setNewCredits("")
        toast({
          title: "Sucesso",
          description: "Créditos atualizados com sucesso"
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
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
            <p className="text-muted-foreground">Gerencie usuários e monitore o sistema</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={logout}
          className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair da Conta
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Dashboard & Usuários</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} ativos, {stats.inactiveUsers} inativos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Média: {formatCurrency(stats.totalRevenue / stats.totalUsers)} por usuário
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
                    Média: {Math.round(stats.averageUsage).toLocaleString()} por usuário
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários com Problemas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.usersExceeded + stats.pendingPayments}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.usersExceeded} excederam, {stats.pendingPayments} pendentes
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros e Busca de Usuários</CardTitle>
              <CardDescription>Filtre e busque usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por empresa ou login..."
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
                </div>
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taxa de Churn:</span>
                    <span className="text-sm font-medium">{stats.churnRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Novos usuários (mês):</span>
                    <span className="text-sm font-medium">{stats.newUsersThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pagamentos pendentes:</span>
                    <span className="text-sm font-medium text-destructive">{stats.pendingPayments}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
              <CardDescription>Lista de todos os usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Créditos</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.company}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.subscription.plan.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className={user.credits.exceeded ? "text-destructive font-medium" : ""}>
                              {user.credits.used.toLocaleString()} / {user.credits.total.toLocaleString()}
                            </div>
                            {user.credits.exceeded && (
                              <Badge variant="destructive" className="text-xs mt-1">
                                Excedeu limite
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? formatDate(user.lastLogin) : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Usuário</DialogTitle>
                                  <DialogDescription>
                                    Informações completas de {user.name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Nome</Label>
                                      <p className="text-sm font-medium">{user.name}</p>
                                    </div>
                                    <div>
                                      <Label>Login</Label>
                                      <p className="text-sm font-medium">{user.email}</p>
                                    </div>
                                    <div>
                                      <Label>Empresa</Label>
                                      <p className="text-sm font-medium">{user.company}</p>
                                    </div>
                                    <div>
                                      <Label>Data de Criação</Label>
                                      <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <Label>Uso Este Mês</Label>
                                      <p className="text-sm font-medium">{user.usage.thisMonth.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Uso Mês Passado</Label>
                                      <p className="text-sm font-medium">{user.usage.lastMonth.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Média Mensal</Label>
                                      <p className="text-sm font-medium">{user.usage.averageMonthly.toLocaleString()}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Total Gasto</Label>
                                      <p className="text-sm font-medium">{formatCurrency(user.billing.totalSpent)}</p>
                                    </div>
                                    <div>
                                      <Label>Próximo Pagamento</Label>
                                      <p className="text-sm font-medium">{formatDate(user.billing.nextBilling)}</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setNewCredits(user.credits.total.toString())
                                setDialogOpen(true)
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetCredits(user.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>

                            <Button
                              variant={user.isActive ? "destructive" : "default"}
                              size="sm"
                              onClick={() => handleStatusToggle(user.id, user.isActive)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                { name: 'Ativos', value: stats.activeUsers, color: 'hsl(var(--accent))' },
                { name: 'Inativos', value: stats.inactiveUsers, color: '#ef4444' },
                { name: 'Excederam', value: stats.usersExceeded, color: '#f97316' }
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
              Atualize o limite de créditos para {selectedUser?.name}
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
    </div>
  )
}
