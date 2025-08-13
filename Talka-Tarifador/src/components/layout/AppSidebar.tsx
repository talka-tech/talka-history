import { BarChart3, Settings, Menu, Home } from "lucide-react"
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
import { getCurrentClient } from "@/data/mockData"

const navigation = [
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

export function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const client = getCurrentClient()

  return (
    <Sidebar className="border-card-border">
      <SidebarHeader className="border-b border-card-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-semibold text-sm">TALKA</h1>
              <p className="text-xs text-muted-foreground">Tarifador + BI</p>
            </div>
          )}
        </div>
        
        {/* Label de Boas-vindas */}
        {!collapsed && (
          <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs text-muted-foreground">Bem-vindo(a),</p>
            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 transition-all hover:bg-accent/10 ${
                          isActive 
                            ? "bg-accent/20 text-accent font-medium shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      <item.icon className={`h-4 w-4 ${collapsed ? '' : ''}`} />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-card-border">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-center'}`}>
          <ThemeToggle />
        </div>
      </div>
    </Sidebar>
  )
}