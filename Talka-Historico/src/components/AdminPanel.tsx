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
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Trash2, LogOut, Eye, EyeOff, Settings, Shield, Activity, UserCheck, Clock, Edit, Key, BarChart3, User, RefreshCw, FileText, UserX, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

  // Carregar usuários do banco de dados ao montar o componente
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6" style={{backgroundColor: '#12032d'}}>
      <div className="max-w-7xl mx-auto">
        {/* Talka Header */}
        <div className="flex justify-between items-center mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-800/80 via-purple-700/80 to-purple-800/80 text-white shadow-lg shadow-purple-900/50 backdrop-blur-sm border border-purple-600/30">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-200/40 backdrop-blur-sm flex items-center justify-center p-2 shadow-lg border border-purple-300/50">
                <img src="/img/logo.png" alt="Talka Logo" className="w-full h-full object-contain" />
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

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-purple-900/40 backdrop-blur-sm shadow-lg border border-purple-600/30">
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-purple-200 hover:text-white transition-colors">
              <Users className="w-4 h-4" />
              Gerenciar Usuários
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-purple-200 hover:text-white transition-colors">
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-purple-200 hover:text-white transition-colors">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards com tema roxo escuro */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-purple-400 bg-gradient-to-br from-purple-900/50 to-purple-800/30 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-600/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-200">Total de Usuários</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">{isFetching ? '...' : stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-300" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-400 bg-gradient-to-br from-purple-900/50 to-green-900/20 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-600/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-200">Usuários Ativos</p>
                      <p className="text-3xl font-bold text-green-400">{isFetching ? '...' : stats.active}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-400 bg-gradient-to-br from-purple-900/50 to-blue-900/20 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-600/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-200">Administradores</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">{isFetching ? '...' : stats.admins}</p>
                    </div>
                    <Shield className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-cyan-400 bg-gradient-to-br from-purple-900/50 to-cyan-900/20 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-600/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-200">Novos (7 dias)</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-100 bg-clip-text text-transparent">{isFetching ? '...' : stats.lastWeek}</p>
                    </div>
                    <Clock className="w-8 h-8 text-cyan-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions com visual melhorado */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-100">
                  <Settings className="w-5 h-5 text-purple-300" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2 h-16 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-500/30"
                  >
                    <Plus className="w-5 h-5" />
                    Criar Novo Usuário
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={fetchUsers}
                    className="flex items-center gap-2 h-16 border-purple-400 bg-purple-800/20 hover:bg-purple-700/30 text-purple-200 hover:text-white hover:border-purple-300 transition-all duration-200"
                  >
                    <RefreshCw className="w-5 h-5 text-purple-300" />
                    Atualizar Dados
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 h-16 border-purple-400 bg-purple-800/20 hover:bg-purple-700/30 text-purple-200 hover:text-white hover:border-purple-300 transition-all duration-200"
                  >
                    <FileText className="w-5 h-5 text-purple-300" />
                    Logs de Acesso
                  </Button>
                </div>
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
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-600/30 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-100">
                  <Settings className="w-5 h-5" />
                  Configurações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-purple-100">Configurações Gerais</h3>
                    <p className="text-purple-200">Configure as preferências globais do sistema.</p>
                  </div>
                  <Separator className="bg-purple-600/30" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200">Política de Senhas</Label>
                      <p className="text-sm text-purple-300">Atualmente: Mínimo 6 caracteres</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">Sessão</Label>
                      <p className="text-sm text-purple-300">Timeout: 24 horas</p>
                    </div>
                  </div>
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