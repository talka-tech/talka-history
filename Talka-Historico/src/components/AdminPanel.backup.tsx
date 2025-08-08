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
import { Users, Plus, Trash2, LogOut, Eye, EyeOff, Settings, Shield, Activity, UserCheck, Clock, Edit, Key, UserPlus, BarChart3 } from 'lucide-react';
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
  recent: number;
}

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel = ({ onLogout }: AdminPanelProps) => {
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
        lastWeek: data.filter((u: User) => new Date(u.created_at) >= lastWeek).length,
        recent: data.filter((u: User) => new Date(u.created_at) >= lastWeek).length
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-cyan-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Talka Header */}
        <div className="flex justify-between items-center mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Shield className="w-10 h-10 text-white" />
              Talka Admin
            </h1>
            <p className="text-white/80 mt-2">Gestão completa de usuários da plataforma Talka</p>
          </div>
          <Button
            onClick={onLogout}
            variant="ghost"
            className="text-white hover:bg-white/20 hover:text-white border-white/30 hover:border-white/50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm shadow-sm border border-purple-100">
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              Gerenciar Usuários
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Gerenciar Usuários
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-violet-500 data-[state=active]:text-white">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards com cores Talka */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50/30 shadow-lg shadow-purple-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{isFetching ? '...' : stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 shadow-lg shadow-blue-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{isFetching ? '...' : stats.active}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-br from-white to-cyan-50/30 shadow-lg shadow-cyan-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Administradores</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{isFetching ? '...' : stats.admins}</p>
                    </div>
                    <Shield className="w-8 h-8 text-cyan-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-violet-500 bg-gradient-to-br from-white to-violet-50/30 shadow-lg shadow-violet-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Novos (7 dias)</p>
                                            <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{isFetching ? '...' : stats.recent}</p>
                    </div>
                    <UserPlus className="w-8 h-8 text-violet-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients Cards com styling Talka */}
            <Card className="bg-gradient-to-br from-white to-purple-50/20 border border-purple-100 shadow-lg shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Users className="w-5 h-5" />
                  Clientes do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isFetching ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Carregando clientes...</span>
                      </div>
                    </div>
                  ) : (
                    users.filter(user => user.user_type === 'client' || (user.user_type !== 'admin' && user.username !== 'admin')).map((client) => (
                      <Card key={client.id} className="border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50/30 border-blue-200 hover:border-purple-300">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-purple-700">{client.username}</h3>
                              <p className="text-sm text-gray-600">Cliente</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUser(client)}
                                className="border-purple-200 hover:bg-purple-50"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  
                  {/* Empty state quando não há clientes */}
                  {!isFetching && users.filter(user => user.user_type === 'client' || (user.user_type !== 'admin' && user.username !== 'admin')).length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
                      <p className="text-gray-500 mb-4">Adicione novos usuários para começar</p>
                      <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Cliente
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{client.username}</h3>
                            <Badge 
                              variant={client.status === 'active' ? 'default' : 'secondary'}
                              className={client.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {client.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">Criado:</span> {formatDate(client.created_at)}
                            </p>
                            <p>
                              <span className="font-medium">ID:</span> #{client.id}
                            </p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(client)}
                              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  {!isFetching && users.filter(user => user.user_type === 'client' || (user.user_type !== 'admin' && user.username !== 'admin')).length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                      <p className="text-sm">Crie o primeiro cliente para começar</p>
                      <Button 
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="mt-4"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Cliente
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2 h-16"
                  >
                    <Plus className="w-5 h-5" />
                    Criar Novo Usuário
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={fetchUsers}
                    className="flex items-center gap-2 h-16"
                  >
                    <Activity className="w-5 h-5" />
                    Atualizar Dados
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 h-16"
                  >
                    <Shield className="w-5 h-5" />
                    Logs do Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Users Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Usuários do Sistema
                  </CardTitle>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Configurações Gerais</h3>
                    <p className="text-gray-600">Configure as preferências globais do sistema.</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Política de Senhas</Label>
                      <p className="text-sm text-gray-600">Atualmente: Mínimo 6 caracteres</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sessão</Label>
                      <p className="text-sm text-gray-600">Timeout: 24 horas</p>
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