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
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useClient } from "@/contexts/ClientContext"

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, logout, isAdmin } = useAuth()
  const { client, loading: clientLoading } = useClient();
  const collapsed = state === "collapsed"

  // Get display name - prioritize user name, then client name
  const getDisplayName = () => {
    if (isAdmin) {
      return user?.name || 'Administrador'
    }
    // For clients, use user name first (more reliable), then client name as fallback
    return user?.name || client?.name || 'Cliente'
  }

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

  // White label: cor e logo do cliente
  const clientColor = !isAdmin && client?.color ? client.color : undefined;
  const clientLogo = !isAdmin && client?.logo_url ? client.logo_url : "/logo.png";
  const clientName = !isAdmin && client?.name ? client.name : undefined;

  if (!isAdmin && clientLoading) {
    // Show skeleton or nothing while loading client data
    return (
      <Sidebar className="border-zinc-700 bg-card/50 backdrop-blur-sm">
        <SidebarHeader className="border-b border-zinc-700/70 p-4">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-xl" />
            {!collapsed && <div className="h-6 w-32 bg-muted rounded" />}
          </div>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
  <Sidebar className="border-zinc-700 bg-card/50 backdrop-blur-sm">
      <SidebarHeader className="border-b border-zinc-700/70 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center">
            <img 
              src={clientLogo} 
              alt={clientName ? `Logo ${clientName}` : "Talka Logo"} 
              className="h-10 w-10 object-contain rounded-xl"
            />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <h1 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Tarifador{clientName ? ` ${clientName}` : ' Talka'}
              </h1>
            </div>
          )}
        </div>
        
        {/* Informações do usuário */}
        {!collapsed && user && (
          <div className="mt-4 p-3 rounded-xl border" style={clientColor ? { borderColor: clientColor, background: clientColor + '20' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={clientColor ? { background: clientColor } : {}}>
                <User className="h-3 w-3 stroke-[1.5] text-background" />
              </div>
              <p className="text-xs font-medium" style={clientColor ? { color: clientColor } : {}}>
                {isAdmin ? 'Administrador' : 'Bem-vindo(a)'}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{getDisplayName()}</p>
            <p className="text-xs font-semibold truncate" style={clientColor ? { color: clientColor } : {}}>Empresa</p>
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
                      className={({ isActive }) => {
                        // Sempre aplica border-zinc-700, mesmo com clientColor
                        const base = `flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative border border-zinc-700`;
                        if (isActive) {
                          return base + (clientColor ? ` bg-[${clientColor}]/20 text-[${clientColor}] font-semibold shadow-sm` : " font-semibold shadow-sm");
                        } else {
                          return base + (clientColor ? ` text-[${clientColor}] hover:text-foreground hover:bg-[${clientColor}]/10 hover:shadow-sm` : " text-muted-foreground hover:text-foreground hover:bg-accent/5 hover:shadow-sm");
                        }
                      }}
                      style={{ borderColor: '#3f3f46' }}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Indicador visual para página ativa */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={clientColor ? { background: clientColor } : {}} />
                          )}
                          
                          <item.icon className={`h-5 w-5`} style={clientColor ? { color: clientColor } : {}} />
                          
                          {!collapsed && (
                            <span className="text-sm font-medium transition-colors duration-200" style={clientColor ? { color: clientColor } : {}}>
                              {item.title}
                            </span>
                          )}
                          
                          {/* Efeito hover */}
                          {!isActive && clientColor && (
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: clientColor + '10', borderColor: clientColor }} />
                          )}
                          {!isActive && !clientColor && (
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

  <div className="mt-auto p-4 border-t border-zinc-700/70">
        {/* Logout Button */}
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start gap-2 transition-colors"
            style={clientColor ? { color: clientColor, borderColor: clientColor } : {}}
            onMouseOver={e => { if (clientColor) e.currentTarget.style.background = clientColor + '10'; }}
            onMouseOut={e => { if (clientColor) e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut className="h-4 w-4" style={clientColor ? { color: clientColor } : {}} />
            Sair
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-center transition-colors"
            style={clientColor ? { color: clientColor, borderColor: clientColor } : {}}
            onMouseOver={e => { if (clientColor) e.currentTarget.style.background = clientColor + '10'; }}
            onMouseOut={e => { if (clientColor) e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut className="h-4 w-4" style={clientColor ? { color: clientColor } : {}} />
          </Button>
        )}
      </div>
    </Sidebar>
  )
}