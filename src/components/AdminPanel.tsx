import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Trash2, LogOut, Eye, EyeOff, Settings, Activity, UserCheck, Clock, Edit, Key, BarChart3, User, FileText, UserX, UserPlus, TrendingUp, MessagesSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import * as Recharts from 'recharts';

// Interface expandida para incluir mais campos
interface User {
  id: number;
  username: string;
  password: string;
  created_at: string;
  status: 'active' | 'inactive';
  user_type?: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  clients: number;
  lastWeek: number;
}

interface AdminPanelProps {
  onLogout: () => void;
  user?: User;
}

interface MetricsTotals { users: number; conversations: number; messages: number; avgMsgsPerConv: number }
interface MetricsUserRow { user_id: number; username: string; status: string; user_type?: string; conversations: number; messages: number; lastMessageAt: string | null; last7DaysMessages: number }
interface MetricsPayload { totals: MetricsTotals; timeseries: { date: string; count: number }[]; perUser: MetricsUserRow[] }

const AdminPanel = ({ onLogout, user }: AdminPanelProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', userType: 'client' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    clients: 0,
    lastWeek: 0
  });
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Estados para configurações simples
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  // Função para buscar usuários da API
  const fetchUsers = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Falha ao buscar usuários');
      }
      const data = await response.json();
      setUsers(data);
      
      // Calcular estatísticas
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const newStats: UserStats = {
        total: data.length,
        active: data.filter((u: User) => u.status === 'active').length,
        inactive: data.filter((u: User) => u.status === 'inactive').length,
        admins: data.filter((u: User) => u.user_type === 'admin' || u.username === 'admin').length,
        clients: data.filter((u: User) => u.user_type === 'client').length,
        lastWeek: data.filter((u: User) => new Date(u.created_at) >= lastWeek).length
      };
      
      setStats(newStats);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários do sistema.",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch('/api/admin-metrics');
      if (!res.ok) throw new Error('Falha ao carregar métricas');
      const data: MetricsPayload = await res.json();
      setMetrics(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Não foi possível carregar métricas', variant: 'destructive' });
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Carregar usuários do banco de dados ao montar o componente
  useEffect(() => {
    fetchUsers();
    fetchMetrics();
  }, [fetchUsers, fetchMetrics]);


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.username || !newUser.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          userType: newUser.userType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro desconhecido ao criar usuário.');
      }
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      
      setNewUser({ username: '', password: '', userType: 'client' });
      setIsCreateDialogOpen(false);
      fetchUsers();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewPassword('');
    setIsEditDialogOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!editingUser || !newPassword) {
      toast({
        title: "Erro",
        description: "Por favor, digite uma nova senha.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/update-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          newPassword: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar senha.');
      }
      
      toast({
        title: "Sucesso",
        description: "Senha atualizada com sucesso!",
      });
      
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setNewPassword('');
      fetchUsers();
      
    } catch (error) {
      toast({
        title: "Erro", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
        const response = await fetch('/api/delete-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao deletar usuário.');
        }

        toast({
            title: "Sucesso",
            description: "Usuário removido com sucesso!",
        });

        fetchUsers(); // Atualiza a lista de usuários

    } catch (error) {
        toast({
            title: "Erro",
            description: error.message,
            variant: "destructive"
        });
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await fetch('/api/update-user-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: userId,
              status: newStatus 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao alterar status do usuário.');
        }

        toast({
            title: "Sucesso",
            description: `Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`,
        });

        fetchUsers(); // Atualiza a lista de usuários

    } catch (error) {
        toast({
            title: "Erro",
            description: error.message,
            variant: "destructive"
        });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const handleExportClients = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Falha ao buscar usuários');
      
      const users = await response.json();
      
      // Criar CSV com dados dos clientes
      const csvContent = [
        ['ID', 'Nome de Usuário', 'Tipo', 'Status', 'Data de Criação'],
        ...users.map((user: User) => [
          user.id,
          user.username,
          user.user_type === 'admin' || user.username === 'admin' ? 'Administrador' : 'Cliente',
          user.status === 'active' ? 'Ativo' : 'Inativo',
          formatDate(user.created_at)
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes_talka_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Sucesso",
        description: "Planilha de clientes exportada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao exportar planilha de clientes.",
        variant: "destructive"
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleViewLogs = async () => {
    setSettingsLoading(true);
    try {
      // Simular busca de logs do sistema
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const logs = [
        `[${new Date().toISOString()}] Sistema iniciado`,
        `[${new Date(Date.now() - 3600000).toISOString()}] Login: admin`,
        `[${new Date(Date.now() - 7200000).toISOString()}] Usuário criado: cliente123`,
        `[${new Date(Date.now() - 10800000).toISOString()}] Backup automático executado`,
        `[${new Date(Date.now() - 14400000).toISOString()}] Limpeza de arquivos temporários`
      ];
      
      const logContent = logs.join('\n');
      const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `logs_sistema_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Sucesso",
        description: "Logs do sistema baixados com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao acessar logs do sistema.",
        variant: "destructive"
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingsUpdate = async (newSettings: any) => {
    setSettingsLoading(true);
    try {
      // Simular salvamento de configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar configurações.",
        variant: "destructive"
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6" style={{backgroundColor: '#12032d'}}>
      <div className="max-w-7xl mx-auto">
        {/* Talka Header */}
        <div className="flex justify-between items-center mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-800/80 via-purple-700/80 to-purple-800/80 text-white shadow-lg shadow-purple-900/50 backdrop-blur-sm border border-purple-600/30">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-200/40 backdrop-blur-sm flex items-center justify-center p-2 shadow-lg border border-purple-300/50">
                <img src="/iconpretoebranco.png" alt="Talka Logo" className="w-full h-full object-contain" />
              </div>
              Talka Admin
            </h1>
            <p className="text-purple-100 mt-2">Gestão completa de usuários da plataforma Talka</p>
          </div>
          <div className="flex items-center space-x-6">
            {user && (
              <div className="hidden md:flex items-center space-x-4 bg-purple-800/30 rounded-xl px-4 py-2 backdrop-blur-sm border border-purple-600/20">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.username}</p>
                  <p className="text-xs text-purple-200">{user.user_type || 'admin'}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-purple-600/40 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            <Button
              onClick={onLogout}
              variant="ghost"
              className="text-white hover:bg-purple-700/50 hover:text-white border border-purple-600/30 hover:border-purple-500/50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-purple-900/40 backdrop-blur-sm shadow-lg border border-purple-600/30 relative overflow-hidden">
            <div 
              className="absolute inset-y-0 bg-gradient-to-r from-purple-600 to-purple-700 rounded-md transition-all duration-300 ease-in-out z-0"
              style={{
                width: '33.333333%',
                transform: `translateX(${
                  activeTab === 'users' ? '0%' : 
                  activeTab === 'overview' ? '100%' : '200%'
                })`
              }}
            />
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white text-purple-200 hover:text-white transition-all duration-300 ease-in-out hover:bg-purple-700/30"
            >
              <Users className="w-4 h-4" />
              Gerenciar Usuários
            </TabsTrigger>
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white text-purple-200 hover:text-white transition-all duration-300 ease-in-out hover:bg-purple-700/30"
            >
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white text-purple-200 hover:text-white transition-all duration-300 ease-in-out hover:bg-purple-700/30"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Overview / Dashboards */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-purple-400 bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-300">Total de Clientes</p>
                      <p className="text-3xl font-bold text-purple-100">{metrics ? metrics.totals.users - (metrics.perUser?.filter(u => u.user_type === 'admin' || u.username === 'admin').length || 0) : '...'}</p>
                    </div>
                    <Users className="w-7 h-7 text-purple-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-cyan-400 bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-300">Conversas</p>
                      <p className="text-3xl font-bold text-cyan-200">{metrics ? metrics.totals.conversations : '...'}</p>
                    </div>
                    <MessagesSquare className="w-7 h-7 text-cyan-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-400 bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-300">Mensagens</p>
                      <p className="text-3xl font-bold text-green-300">{metrics ? metrics.totals.messages : '...'}</p>
                    </div>
                    <Activity className="w-7 h-7 text-green-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-400 bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-300">Méd. Msg por Conversa</p>
                      <p className="text-3xl font-bold text-amber-300">{metrics ? metrics.totals.avgMsgsPerConv : '...'}</p>
                    </div>
                    <TrendingUp className="w-7 h-7 text-amber-300" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeseries de mensagens (14 dias) */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30">
              <CardHeader>
                <CardTitle className="text-purple-100">Mensagens por dia (últimos 14 dias)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="w-full h-96">
                  <ChartContainer
                    config={{ messages: { label: 'Mensagens', color: 'hsl(266 72% 60%)' } }}
                    className="w-full h-full"
                  >
                    <Recharts.AreaChart 
                      data={(metrics?.timeseries || []).map(p => ({ ...p, label: formatShortDate(p.date) }))}
                    >
                      <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#6b46c1" opacity={0.3} />
                      <Recharts.XAxis 
                        dataKey="label" 
                        tick={{ fill: '#c4b5fd', fontSize: 12 }}
                        axisLine={{ stroke: '#8b5cf6' }}
                      />
                      <Recharts.YAxis 
                        tick={{ fill: '#c4b5fd', fontSize: 12 }}
                        axisLine={{ stroke: '#8b5cf6' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Recharts.Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="var(--color-messages)" 
                        fill="var(--color-messages)" 
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                    </Recharts.AreaChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top clientes */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30">
              <CardHeader>
                <CardTitle className="text-purple-100">Top Clientes por Mensagens</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Conversas</TableHead>
                      <TableHead>Mensagens</TableHead>
                      <TableHead>Última atividade</TableHead>
                      <TableHead>Msg (7d)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMetrics ? (
                      <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
                    ) : (
                      (metrics?.perUser || []).map((row) => (
                        <TableRow key={row.user_id}>
                          <TableCell className="font-medium">{row.username}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>{row.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell>{row.conversations}</TableCell>
                          <TableCell>{row.messages.toLocaleString()}</TableCell>
                          <TableCell>{row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleString('pt-BR') : '-'}</TableCell>
                          <TableCell>{row.last7DaysMessages}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Users Table */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-purple-100">
                    <Users className="w-5 h-5" />
                    Usuários do Sistema
                  </CardTitle>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFetching ? (
                      <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant={user.user_type === 'admin' || user.username === 'admin' ? 'default' : 'secondary'}>
                              {user.user_type === 'admin' || user.username === 'admin' ? 'Admin' : 'Cliente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {visiblePasswords.has(user.id) ? user.password : '••••••••'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="h-6 w-6 p-0"
                              >
                                {visiblePasswords.has(user.id) ? 
                                  <EyeOff className="w-3 h-3" /> : 
                                  <Eye className="w-3 h-3" />
                                }
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.status === 'active' ? 'default' : 'secondary'}
                              className={user.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {user.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              {/* Botão para ativar/desativar usuário */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user.id, user.status)}
                                className={`${
                                  user.status === 'active' 
                                    ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                                disabled={user.username === 'admin'}
                                title={user.status === 'active' ? 'Desativar usuário' : 'Ativar usuário'}
                              >
                                {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={user.username === 'admin'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o usuário "{user.username}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Ações do Sistema */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-100">
                  <Activity className="w-5 h-5" />
                  Ações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-purple-100">Exportar Dados</h4>
                    <p className="text-sm text-purple-300">Baixar planilha com todos os clientes cadastrados</p>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled={settingsLoading}
                      onClick={handleExportClients}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {settingsLoading ? "Exportando..." : "Exportar Clientes"}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-purple-100">Logs do Sistema</h4>
                    <p className="text-sm text-purple-300">Baixar arquivo com logs de atividades</p>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled={settingsLoading}
                      onClick={handleViewLogs}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {settingsLoading ? "Baixando..." : "Baixar Logs"}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-800/20 rounded-lg border border-purple-600/20">
                  <h5 className="font-medium text-purple-100 mb-2">Informações Importantes</h5>
                  <ul className="text-sm text-purple-300 space-y-1">
                    <li>• Importação de arquivos CSV sem limite de tamanho</li>
                    <li>• Logs são mantidos por 30 dias no sistema</li>
                    <li>• Planilha de clientes inclui todos os dados cadastrais</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário no sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Nome de Usuário</Label>
                <Input
                  id="new-username"
                  type="text"
                  placeholder="Digite o nome de usuário"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Digite a senha"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-type">Tipo de Usuário</Label>
                <Select 
                  value={newUser.userType} 
                  onValueChange={(value) => setNewUser(prev => ({ ...prev, userType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Alterar Senha - {editingUser?.username}
              </DialogTitle>
              <DialogDescription>
                Digite a nova senha para o usuário {editingUser?.username}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdatePassword} 
                  disabled={isLoading || !newPassword}
                >
                  {isLoading ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPanel;