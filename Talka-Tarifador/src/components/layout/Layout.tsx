import { ReactNode, useEffect, useState } from "react"
import { getCurrentClient, ClientData } from "@/data/mockData"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [client, setClient] = useState<ClientData | null>(null)

  useEffect(() => {
    // Só busca se não for admin (admin não tem cor personalizada)
    getCurrentClient().then(setClient)
  }, [])

  const clientColor = client?.color || undefined
  const headerBg = clientColor ? `${clientColor}22` : undefined // cor primária bem clarinha

  return (
    <SidebarProvider>
      <div
        className="min-h-screen flex w-full"
        style={clientColor ? { background: `linear-gradient(135deg, ${clientColor}10 0%, #18181b 100%)` } : {}}
      >
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header
            className="h-16 border-b border-card-border/50 flex items-center px-6 shadow-sm"
            style={Object.assign({}, headerBg ? { background: headerBg } : {}, clientColor ? { ['--icon-color']: clientColor } : {})}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <SidebarTrigger>
                <Menu
                  className={"h-4 w-4" + (clientColor ? "" : " text-muted-foreground")}
                  style={clientColor ? { color: clientColor } : undefined}
                />
              </SidebarTrigger>
            </Button>
            <div className="ml-4 flex-1">
              <h2
                className="text-lg font-semibold"
                style={clientColor ? { color: clientColor } : undefined}
              >
                Tarifador + Business Intelligence
              </h2>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}