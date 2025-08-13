import { BarChart3, Settings, Menu, Home, LogOut, User, Users, Shield } from "lucide-react"
import { NavLink } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { getCurrentClient } from "@/data/mockData"

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, logout, isAdmin } = useAuth()
  const collapsed = state === "collapsed"
  const client = getCurrentClient()

  // Navigation items based on user role
  const navigation = isAdmin ? [
    {
      title: "Painel Admin",
      url: "/",
      icon: Shield,
    },
    {
      title: "Gerenciar Usuários",
      url: "/admin",
      icon: Users,
    },
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: Settings,
    },
  ] : [
    {
      title: "Início",
      url: "/",
      icon: Home,
    },
    {
      title: "Dashboard BI",
      url: "/dashboard",
      icon: BarChart3,
    },
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: Settings,
    },
  ]

  return (
    <Sidebar className="border-card-border bg-card/50 backdrop-blur-sm">
      <SidebarHeader className="border-b border-card-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-md">
            <BarChart3 className="h-5 w-5 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <h1 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                TALKA
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Tarifador + BI</p>
            </div>
          )}
        </div>
        
        {/* Informações do usuário */}
        {!collapsed && user && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-6 w-6 rounded-full ${isAdmin ? 'bg-orange-500/20' : 'bg-accent/20'} flex items-center justify-center`}>
                {isAdmin ? (
                  <Shield className="h-3 w-3 text-orange-500" />
                ) : (
                  <User className="h-3 w-3 text-accent" />
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {isAdmin ? 'Administrador' : 'Bem-vindo(a)'}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.company}</p>
            {isAdmin && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  Acesso Total
                </span>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative ${
                          isActive 
                            ? "bg-gradient-to-r from-accent/20 to-accent/10 text-accent font-semibold shadow-sm border border-accent/20" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/5 hover:shadow-sm"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Indicador visual para página ativa */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full" />
                          )}
                          
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-accent' : ''} transition-colors duration-200`} />
                          
                          {!collapsed && (
                            <span className="text-sm font-medium transition-colors duration-200">
                              {item.title}
                            </span>
                          )}
                          
                          {/* Efeito hover */}
                          {!isActive && (
                            <div className="absolute inset-0 rounded-xl bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-card-border/50 space-y-3">
        {/* Theme Toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-center'}`}>
          <ThemeToggle />
        </div>
        
        {/* Logout Button */}
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        )}
        
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Sidebar>
  )
}