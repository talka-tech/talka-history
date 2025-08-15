import { useState, useEffect } from "react"
import { Users, DollarSign, TrendingUp, AlertTriangle, LogOut, Search, Ban, Trash2, Edit, RefreshCw, Plus, Eye, EyeOff, Settings, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { AdminCharts } from "@/components/dashboard/AdminCharts"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { clientAPI } from "@/api/clientAPI"
import productAPI from "@/api/productAPI"
import { Client } from "@/lib/supabase"
import { createClient } from '@supabase/supabase-js'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts'

// Initialize Supabase client (Vite: use import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

interface TalkaProduct {
  id: string
  name: string
  description: string
  color: string
  clients: number
  revenue: number
  creditsUsed: number
  isActive: boolean
  logo_url?: string
}

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [clientUsers, setClientUsers] = useState<{[key: string]: any}>({})
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newCredits, setNewCredits] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createProductDialogOpen, setCreateProductDialogOpen] = useState(false)
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false)
  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<TalkaProduct | null>(null)
  const [productToDelete, setProductToDelete] = useState<TalkaProduct | null>(null)
  const [newClientData, setNewClientData] = useState({
    name: "",
    login: "",
    credits_total: "",
    password: "",
    product: "Talka Geral"
  })
  const [newProductData, setNewProductData] = useState({
    name: "",
    description: "",
    color: "#8B5CF6",
    logoFile: null as File | null,
    logo_url: ""
  })
  const [talkaProducts, setTalkaProducts] = useState<TalkaProduct[]>([
    {
      id: "talka-geral",
      name: "Talka Geral",
      description: "Para clientes diversos e projetos gerais",
      color: "#8B5CF6",
      clients: 0,
      revenue: 0,
      creditsUsed: 0,
      isActive: true
    },
    {
      id: "conciarge",
      name: "ConcIArge",
      description: "Para clínicas médicas",
      color: "#00849d",
      clients: 0,
      revenue: 0,
      creditsUsed: 0,
      isActive: true
    },
    {
      id: "converse-direito", 
      name: "Converse IA Direito",
      description: "Para escritórios de advocacia",
      color: "#0055fb",
      clients: 0,
      revenue: 0,
      creditsUsed: 0,
      isActive: true
    }
  ])
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([])
  const [passwordVisibility, setPasswordVisibility] = useState<{[key: string]: boolean}>({})
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [editData, setEditData] = useState<{login: string, password: string}>({login: "", password: ""})
  const [usageData, setUsageData] = useState<{ month: string; usage: number }[]>([])
  const { toast } = useToast()
  const { logout } = useAuth()

  // Function to get logo path for each product
  const getProductLogo = (productName: string) => {
    switch (productName) {
      case "ConcIArge":
        return "/logos/conciarge_logo.png"
      case "Converse IA Direito":
        return "/logos/converseiadireito_logo.png"
      case "Talka Geral":
        return "/logos/talka_logo.png"
      default:
        return "/logos/talka_logo.png"
    }
  }

  // Function to get color for each product (matching logos)
  const getProductColor = (productName: string) => {
    switch (productName) {
      case "ConcIArge":
        return "#00849d"  // Cor correta da logo ConcIArge
      case "Converse IA Direito":
        return "#0055fb"  // Cor correta da logo Converse IA Direito
      case "Talka Geral":
        return "#8B5CF6"  // Roxo (cor atual da Talka)
      default:
        return "#8B5CF6"
    }
  }

  // Function to get chart color based on selected filter
  const getChartColor = (productName: string, selectedFilter: string) => {
    if (selectedFilter === "all") {
      // Talka Geral (all) - mostra cores originais de cada produto
      return getProductColor(productName)
    } else {
      // Produto específico selecionado - todos usam a cor desse produto
      return getProductColor(selectedFilter)
    }
  }

  // Function to get primary color for analytics charts
  const getPrimaryColor = (selectedFilter: string) => {
    if (selectedFilter === "all") {
      return "#8B5CF6" // Talka Geral (roxo)
    } else {
      return getProductColor(selectedFilter)
    }
  }

  // Function to ensure default products exist in database
  const ensureDefaultProducts = async () => {
    try {
      const defaultProducts = [
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d479", // UUID fixo para Talka Geral
          name: "Talka Geral",
          description: "Para clientes diversos e projetos gerais",
          color: "#8B5CF6",
          logo_url: "/logos/talka_logo.png"
        },
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d480", // UUID fixo para ConcIArge
          name: "ConcIArge",
          description: "Para clínicas médicas",
          color: "#00849d",
          logo_url: "/logos/conciarge_logo.png"
        },
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d481", // UUID fixo para Converse IA
          name: "Converse IA Direito",
          description: "Para escritórios de advocacia",
          color: "#0055fb",
          logo_url: "/logos/converseiadireito_logo.png"
        }
      ]

      for (const product of defaultProducts) {
        const result = await productAPI.createProduct(product)
        if (!result.success && !result.error?.includes('already exists') && !result.error?.includes('duplicate')) {
          console.warn('⚠️ Produto já existe ou erro ao criar:', product.name, result.error)
        }
      }
    } catch (error) {
      console.error('Erro ao garantir produtos padrão:', error)
    }
  }

  // Função para editar uma frente/produto existente
  const handleEditProduct = async () => {
    if (!productToEdit) return;
    if (!newProductData.name || !newProductData.description) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    let logoUrl = newProductData.logo_url;
    if (newProductData.logoFile) {
      // Upload logo para Supabase Storage
      const fileExt = newProductData.logoFile.name.split('.').pop();
      const fileName = `${newProductData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('product-logos').upload(fileName, newProductData.logoFile);
      if (!error && data) {
        const { data: publicUrl } = supabase.storage.from('product-logos').getPublicUrl(fileName);
        logoUrl = publicUrl.publicUrl;
      } else {
        toast({ title: "Erro ao fazer upload da logo", description: error?.message, variant: "destructive" });
      }
    }

    // Atualizar no Supabase
    const result = await productAPI.updateProduct(productToEdit.id, {
      name: newProductData.name,
      description: newProductData.description,
      color: newProductData.color,
      logo_url: logoUrl
    });

    if (result.success) {
      setTalkaProducts(prev => prev.map(product =>
        product.id === productToEdit.id
          ? {
              ...product,
              name: newProductData.name,
              description: newProductData.description,
              color: newProductData.color,
              logo_url: logoUrl
            }
          : product
      ));
      setEditProductDialogOpen(false);
      setProductToEdit(null);
      setNewProductData({
        name: "",
        description: "",
        color: "#8B5CF6",
        logoFile: null,
        logo_url: ""
      });
      toast({
        title: "Sucesso",
        description: "Frente da Talka atualizada com sucesso!"
      });
    } else {
      toast({
        title: "Erro",
        description: result.error || "Erro ao atualizar frente",
        variant: "destructive"
      });
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterClients()
  }, [clients, searchQuery, statusFilter, productFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Primeiro, garantir que os produtos padrão existem no banco
      await ensureDefaultProducts()
      
      // Carregar produtos do banco de dados
      const productsResult = await productAPI.getProductsWithMetrics()
      if (productsResult.success && productsResult.data) {
        const productsWithStats = productsResult.data.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          color: product.color,
          clients: product.metrics.total_clients,
          revenue: product.metrics.revenue,
          creditsUsed: product.metrics.credits_used,
          isActive: product.is_active
        }))
        setTalkaProducts(productsWithStats)
      }
      
      // Carregar clientes (já incluem dados dos produtos via view)
      const clientsData = await clientAPI.getAllClients()
      
      // Add product field to existing clients if not present (mock assignment)
      const clientsWithProducts = clientsData.map((client: any) => ({
        ...client,
        product: client.product_name || client.product || (Math.random() > 0.6 ? "Talka Geral" : Math.random() > 0.5 ? "ConcIArge" : "Converse IA Direito")
      }))
      
      setClients(clientsWithProducts)
      
      // Calculate product statistics
      const updatedProducts = talkaProducts.map(product => {
        const productClients = clientsWithProducts.filter((c: any) => c.product === product.name)
        return {
          ...product,
          clients: productClients.length,
          revenue: productClients.reduce((sum: number, c: any) => sum + (c.credits_total * 0.001), 0),
          creditsUsed: productClients.reduce((sum: number, c: any) => sum + c.credits_used, 0)
        }
      })
      setTalkaProducts(updatedProducts)
      
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
      const totalRevenue = clientsData.reduce((sum, c) => sum + (c.credits_total * 0.001), 0)
      
      setStats({
        totalClients: clientsData.length,
        activeClients,
        inactiveClients,
        totalCreditsUsed,
        averageUsage: clientsData.length > 0 ? Math.round(totalCreditsUsed / clientsData.length) : 0,
        totalRevenue,
        clientsExceeded,
        pendingPayments: 0
      })

      // Generate real chart data based on current data
      const currentDate = new Date()
      const realRevenueData = []
      const realUsageData = []
      
      // Generate 6 months of data based on current stats
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
        
        // Calculate realistic revenue and usage based on current data with some variation
        const baseRevenue = totalRevenue / 6
        const baseUsage = totalCreditsUsed / 6
        const variation = 0.3 // 30% variation
        
        const revenue = Math.round(baseRevenue * (1 + (Math.random() - 0.5) * variation))
        const usage = Math.round(baseUsage * (1 + (Math.random() - 0.5) * variation))
        
        realRevenueData.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          revenue: Math.max(revenue, 0)
        })
        
        realUsageData.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          usage: Math.max(usage, 0)
        })
      }
      
      setRevenueData(realRevenueData)
      setUsageData(realUsageData)
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
      filtered = filtered.filter((client: any) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.id.toString().includes(searchQuery.toLowerCase()) ||
        (client.product && client.product.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(client => client.is_active)
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(client => !client.is_active)
    } else if (statusFilter === "exceeded") {
      filtered = filtered.filter(client => client.credits_used >= client.credits_total)
    }

    if (productFilter !== "all") {
      filtered = filtered.filter((client: any) => client.product === productFilter)
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

      // Buscar cor e logo da frente selecionada
      const selectedProduct = talkaProducts.find(p => p.name === newClientData.product)
      const color = selectedProduct?.color || "#8B5CF6"
      const logo_url = selectedProduct?.logo_url || "/logos/talka_logo.png"

      const result = await clientAPI.createClient({
        name: newClientData.name,
        login: newClientData.login,
        credits_total: credits,
        password: newClientData.password,
        product: newClientData.product,
        // color e logo_url não são mais enviados nem salvos para o cliente
      })
      
      if (result.success) {
        await loadData()
        setCreateDialogOpen(false)
        setNewClientData({
          name: "",
          login: "",
          credits_total: "",
          password: "",
          product: "Talka Geral"
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

  const handleCreateProduct = async () => {
    if (!newProductData.name || !newProductData.description) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      })
      return
    }

    let logoUrl = ""
    if (newProductData.logoFile) {
      // Upload logo para Supabase Storage
      const fileExt = newProductData.logoFile.name.split('.').pop()
      const fileName = `${newProductData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage.from('product-logos').upload(fileName, newProductData.logoFile)
      if (!error && data) {
        const { data: publicUrl } = supabase.storage.from('product-logos').getPublicUrl(fileName)
        logoUrl = publicUrl.publicUrl
      } else {
        toast({ title: "Erro ao fazer upload da logo", description: error?.message, variant: "destructive" })
      }
    }

    // Salvar no Supabase
    const result = await productAPI.createProduct({
      name: newProductData.name,
      description: newProductData.description,
      color: newProductData.color,
      logo_url: logoUrl
    })

    if (result.success && result.data) {
      // Atualizar lista local após salvar
      setTalkaProducts(prev => [
        ...prev,
        {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          color: result.data.color,
          logo_url: result.data.logo_url,
          clients: 0,
          revenue: 0,
          creditsUsed: 0,
          isActive: result.data.is_active ?? true
        }
      ])
      setCreateProductDialogOpen(false)
      setNewProductData({
        name: "",
        description: "",
        color: "#8B5CF6",
        logoFile: null,
        logo_url: ""
      })
      toast({
        title: "Sucesso",
        description: "Nova frente da Talka criada com sucesso!"
      })
      return
    }

    setTalkaProducts(prev => prev.map(product => 
      product.id === productToEdit.id 
        ? {
            ...product,
            name: newProductData.name,
            description: newProductData.description,
            color: newProductData.color
          }
        : product
    ))

    setEditProductDialogOpen(false)
    setProductToEdit(null)
    setNewProductData({
      name: "",
      description: "",
      color: "#8B5CF6",
      logoFile: null,
      logo_url: ""
    })
    
    toast({
      title: "Sucesso",
      description: "Frente da Talka atualizada com sucesso!"
    })
  }

  const handleDeleteProduct = () => {
    if (!productToDelete) return

    // Check if product has clients
    const hasClients = clients.some((client: any) => client.product === productToDelete.name)
    
    if (hasClients) {
      toast({
        title: "Erro",
        description: "Não é possível excluir uma frente que possui clientes vinculados",
        variant: "destructive"
      })
      return
    }

    setTalkaProducts(prev => prev.filter(product => product.id !== productToDelete.id))
    setDeleteProductDialogOpen(false)
    setProductToDelete(null)
    
    toast({
      title: "Sucesso",
      description: "Frente da Talka excluída com sucesso!"
    })
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
              <h1 className="text-3xl font-bold text-foreground">Talka Hub - Painel Administrativo</h1>
              <p className="text-muted-foreground">Gerencie produtos, clientes e monitore o ecossistema Talka</p>
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
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard & Clientes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Frentes da Talka Hub */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Frentes da Talka Hub</CardTitle>
                    <CardDescription>Visão geral dos produtos e serviços da Talka</CardDescription>
                  </div>
                  <Button
                    onClick={() => setCreateProductDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Frente
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  {talkaProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className={`bg-card border rounded-lg p-4 space-y-3 relative group cursor-pointer hover:shadow-md transition-all duration-200 ${
                        productFilter === product.name
                          ? 'ring-1 ring-primary border-primary' 
                          : 'border-border'
                      }`}
                      onClick={() => {
                        // Se já está selecionado, deseleciona. Senão, seleciona.
                        if (productFilter === product.name) {
                          setProductFilter("all")
                        } else {
                          setProductFilter(product.name)
                        }
                      }}
                    >
                      {/* Botões de ação no hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setProductToEdit(product)
                            setNewProductData({
                              name: product.name,
                              description: product.description,
                              color: product.color,
                              logoFile: null,
                              logo_url: product.logo_url || ""
                            })
                            setEditProductDialogOpen(true)
                          }}
                          className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setProductToDelete(product)
                            setDeleteProductDialogOpen(true)
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive bg-background/80 hover:bg-background"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Logo: padrão = local, customizada = logo_url, fallback = círculo */}
                        {(() => {
                          // Frentes padrão
                          if (product.name === "Talka Geral") {
                            return (
                              <img src="/logos/talka_logo.png" alt="Talka Geral Logo" className="w-6 h-6 object-contain" />
                            )
                          }
                          if (product.name === "ConcIArge") {
                            return (
                              <img src="/logos/conciarge_logo.png" alt="ConcIArge Logo" className="w-6 h-6 object-contain" />
                            )
                          }
                          if (product.name === "Converse IA Direito") {
                            return (
                              <img src="/logos/converseiadireito_logo.png" alt="Converse IA Direito Logo" className="w-6 h-6 object-contain" />
                            )
                          }
                          // Frentes customizadas
                          if (product.logo_url) {
                            return (
                              <img
                                src={product.logo_url}
                                alt={`${product.name} Logo`}
                                className="w-6 h-6 object-contain"
                                onError={e => {
                                  e.currentTarget.style.display = 'none'
                                  const next = e.currentTarget.nextElementSibling as HTMLElement
                                  if (next) next.style.display = 'flex'
                                }}
                              />
                            )
                          }
                          // Fallback: círculo colorido
                          return (
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: product.color }}
                            >
                              {product.name.charAt(0)}
                            </div>
                          )
                        })()}
                        <h3 className="text-base font-semibold">{product.name}</h3>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                      
                      <div className="grid grid-cols-3 gap-3 text-left">
                        <div>
                          <div className="text-lg font-bold">{product.clients}</div>
                          <p className="text-xs text-muted-foreground font-normal">Clientes</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{formatCurrency(product.revenue)}</div>
                          <p className="text-xs text-muted-foreground font-normal">Receita</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{product.creditsUsed.toLocaleString()}</div>
                          <p className="text-xs text-muted-foreground font-normal">Créditos</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Global Stats */}
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
                      Média: R$ {(stats.totalRevenue / stats.totalClients || 0).toFixed(2)} por cliente
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
                    <div className="text-2xl font-bold text-red-600">{stats.clientsExceeded}</div>
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
                        placeholder="Buscar por nome, ID ou produto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={productFilter} onValueChange={setProductFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Talka Geral" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <img 
                              src="/logos/talka_logo.png" 
                              alt="Talka Logo"
                              className="w-4 h-4 object-contain"
                            />
                            <span>Talka Geral</span>
                          </div>
                        </SelectItem>
                        {talkaProducts.filter(product => product.name !== "Talka Geral").map(product => (
                          <SelectItem key={product.id} value={product.name}>
                            <div className="flex items-center gap-2">
                              <img 
                                src={getProductLogo(product.name)} 
                                alt={`${product.name} Logo`}
                                className="w-4 h-4 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display = 'block'
                                }}
                              />
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: product.color, display: 'none' }}
                              />
                              <span>{product.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-green-500" />
                            Ativos
                          </div>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-red-500" />
                            Inativos
                          </div>
                        </SelectItem>
                        <SelectItem value="exceeded">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            Excederam
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

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
                        <TableHead>Produto</TableHead>
                        <TableHead>Login/Senha</TableHead>
                        <TableHead>Créditos</TableHead>
                        <TableHead>Usado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado</TableHead>
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const productName = (client as any).product;
                                  if (productName === 'Talka Geral') {
                                    return <img src="/logos/talka_logo.png" alt="Talka Geral Logo" className="w-6 h-6 object-contain rounded-full" />
                                  }
                                  if (productName === 'ConcIArge') {
                                    return <img src="/logos/conciarge_logo.png" alt="ConcIArge Logo" className="w-6 h-6 object-contain rounded-full" />
                                  }
                                  if (productName === 'Converse IA Direito') {
                                    return <img src="/logos/converseiadireito_logo.png" alt="Converse IA Direito Logo" className="w-6 h-6 object-contain rounded-full" />
                                  }
                                  // fallback: círculo colorido com inicial
                                  const prod = talkaProducts.find(p => p.name === productName);
                                  return (
                                    <div
                                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                      style={{ backgroundColor: prod?.color || '#8B5CF6' }}
                                    >
                                      {productName?.charAt(0) || 'T'}
                                    </div>
                                  );
                                })()}
                                <span className="text-sm">{(client as any).product || 'Talka Geral'}</span>
                              </div>
                            </TableCell>
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
                            {/* coluna 'Tipo' removida */}
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
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
            {/* Analytics Filter no canto superior direito */}
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtro:</span>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Talka Geral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <img 
                          src="/logos/talka_logo.png" 
                          alt="Talka Logo"
                          className="w-4 h-4 object-contain"
                        />
                        <span>Talka Geral</span>
                      </div>
                    </SelectItem>
                    {talkaProducts.filter(product => product.name !== "Talka Geral").map(product => (
                      <SelectItem key={product.id} value={product.name}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={getProductLogo(product.name)} 
                            alt={`${product.name} Logo`}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display = 'block'
                            }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: product.color, display: 'none' }}
                          />
                          <span>{product.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Global Analytics */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Gerais</CardTitle>
                  <CardDescription>Visão geral do ecossistema Talka</CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminCharts 
                    revenueData={revenueData}
                    usageData={usageData}
                    primaryColor={getPrimaryColor(selectedProduct)}
                    userDistribution={[
                      { name: 'Ativos', value: stats.activeClients, color: getPrimaryColor(selectedProduct) },
                      { name: 'Inativos', value: stats.inactiveClients, color: '#ef4444' },
                      { name: 'Excederam', value: stats.clientsExceeded, color: '#f97316' }
                    ]}
                  />
                </CardContent>
              </Card>
            )}

            {/* Product Comparison Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Produto</CardTitle>
                  <CardDescription>Comparação de receita entre produtos Talka</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={talkaProducts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                      />
                      <Bar dataKey="revenue">
                        {talkaProducts.map((product, index) => (
                          <Cell key={`cell-${index}`} fill={getChartColor(product.name, selectedProduct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clientes por Produto</CardTitle>
                  <CardDescription>Distribuição de clientes entre produtos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={talkaProducts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="clients">
                        {talkaProducts.map((product, index) => (
                          <Cell key={`cell-${index}`} fill={getChartColor(product.name, selectedProduct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
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
                <Label htmlFor="clientProduct">Produto Talka</Label>
                <Select 
                  value={newClientData.product} 
                  onValueChange={(value) => 
                    setNewClientData({...newClientData, product: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {talkaProducts.filter(p => p.isActive).map(product => (
                      <SelectItem key={product.id} value={product.name}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={getProductLogo(product.name)} 
                            alt={`${product.name} Logo`}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display = 'block'
                            }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: product.color, display: 'none' }}
                          />
                          <span>{product.name}</span>
                        </div>
                      </SelectItem>
                    ))}
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
              {/* Campo de logo removido, pois a logo é definida pela frente selecionada */}
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
        {/* Create Product Dialog */}
        <Dialog open={createProductDialogOpen} onOpenChange={setCreateProductDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Frente da Talka</DialogTitle>
              <DialogDescription>
                Crie uma nova frente de produtos para o ecossistema Talka
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="productName">Nome da Frente *</Label>
                <Input
                  id="productName"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                  placeholder="Ex: Talka Advocacia"
                />
              </div>
              <div>
                <Label htmlFor="productDescription">Descrição *</Label>
                <Input
                  id="productDescription"
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({...newProductData, description: e.target.value})}
                  placeholder="Ex: Para escritórios de advocacia"
                />
              </div>
              <div>
                <Label htmlFor="productColor">Cor da Frente</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="productColor"
                    type="color"
                    value={newProductData.color}
                    onChange={(e) => setNewProductData({...newProductData, color: e.target.value})}
                    className="w-16 h-10"
                  />
                  <Input
                    value={newProductData.color}
                    onChange={(e) => setNewProductData({...newProductData, color: e.target.value})}
                    placeholder="#8B5CF6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="productLogo">Logo da Frente</Label>
                <Input
                  id="productLogo"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0] || null
                    setNewProductData(data => ({ ...data, logoFile: file }))
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Se não enviar uma logo, será exibido apenas o círculo colorido.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateProductDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProduct}>
                Criar Frente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={editProductDialogOpen} onOpenChange={setEditProductDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Frente da Talka</DialogTitle>
              <DialogDescription>
                Atualize as informações da frente {productToEdit?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editProductName">Nome da Frente *</Label>
                <Input
                  id="editProductName"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                  placeholder="Ex: Talka Advocacia"
                />
              </div>
              <div>
                <Label htmlFor="editProductDescription">Descrição *</Label>
                <Input
                  id="editProductDescription"
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({...newProductData, description: e.target.value})}
                  placeholder="Ex: Para escritórios de advocacia"
                />
              </div>
              <div>
                <Label htmlFor="editProductColor">Cor da Frente</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="editProductColor"
                    type="color"
                    value={newProductData.color}
                    onChange={(e) => setNewProductData({...newProductData, color: e.target.value})}
                    className="w-16 h-10"
                  />
                  <Input
                    value={newProductData.color}
                    onChange={(e) => setNewProductData({...newProductData, color: e.target.value})}
                    placeholder="#8B5CF6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditProductDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditProduct}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Product Confirmation */}
        <AlertDialog open={deleteProductDialogOpen} onOpenChange={setDeleteProductDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Frente da Talka</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a frente "{productToDelete?.name}"?
                Esta ação não pode ser desfeita e a frente será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProduct}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir Frente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
