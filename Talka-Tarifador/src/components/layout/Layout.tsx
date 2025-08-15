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
        style={{ background: '#151518' }}
      >
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header
            className="h-16 border-b border-zinc-700/70 flex items-center px-6 shadow-sm"
            style={Object.assign({ background: '#151518', borderBottomColor: '#3f3f46' }, clientColor ? { ['--icon-color']: clientColor } : {})}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 group"
              asChild
            >
              <SidebarTrigger>
                <Menu
                  className="h-4 w-4"
                  style={clientColor ? { color: clientColor } : undefined}
                />
              </SidebarTrigger>
            </Button>
            {clientColor && (
              <style>{`
                .h-8.w-8.group:hover {
                  background: ${clientColor}22 !important;
                }
                .h-8.w-8.group:hover .h-4.w-4,
                .h-8.w-8.group:focus .h-4.w-4 {
                  color: ${clientColor} !important;
                }
              `}</style>
            )}
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