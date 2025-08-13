import { ReactNode } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-card-border/50 bg-card/30 backdrop-blur-md flex items-center px-6 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              asChild
            >
              <SidebarTrigger>
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
            </Button>
            
            <div className="ml-4 flex-1">
              <h2 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                TALKA
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Tarifador + Business Intelligence
              </p>
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