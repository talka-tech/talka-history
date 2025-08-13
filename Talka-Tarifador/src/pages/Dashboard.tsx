import { BarChart3, Building2, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout/Layout"

export default function Dashboard() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard BI
            </h1>
            <p className="text-muted-foreground">
              Análises avançadas e relatórios de consumo integrados
            </p>
          </div>

          {/* Indicador de Integração Futura */}
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-xl">Dashboard BI em Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Esta seção será integrada com ferramentas de Business Intelligence como Looker 
                para fornecer análises avançadas e insights detalhados sobre consumo e performance.
              </p>
              
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                <div className="p-4 rounded-lg border border-card-border bg-card/50">
                  <BarChart3 className="h-8 w-8 text-accent mb-2 mx-auto" />
                  <h3 className="font-medium text-sm">Relatórios Avançados</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gráficos interativos e métricas personalizadas
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border border-card-border bg-card/50">
                  <Building2 className="h-8 w-8 text-accent mb-2 mx-auto" />
                  <h3 className="font-medium text-sm">Análise Multi-Cliente</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comparativos e benchmarks entre empresas
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border border-card-border bg-card/50">
                  <FileText className="h-8 w-8 text-accent mb-2 mx-auto" />
                  <h3 className="font-medium text-sm">Exportação</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Relatórios em PDF, Excel e integração via API
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Solicitar Acesso Beta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview de Features */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="text-lg">Próximas Funcionalidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent"></div>
                    <span className="text-sm">Dashboards personalizáveis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent"></div>
                    <span className="text-sm">Alertas inteligentes via e-mail/SMS</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent"></div>
                    <span className="text-sm">Previsões de consumo com IA</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent"></div>
                    <span className="text-sm">Integração com Looker/Tableau</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="text-lg">Suporte Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Para integração e configuração do Dashboard BI, entre em contato com nossa equipe especializada.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    📧 bi@talka.com.br
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    📞 (11) 9999-9999 ramal 200
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}