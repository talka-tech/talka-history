import { AlertTriangle, Ban, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AlertCardProps {
  type: "warning" | "blocked" | "success"
  percentage: number
  clientType: "comum" | "projeto"
  onUpgrade?: () => void
}

export function AlertCard({ type, percentage, clientType, onUpgrade }: AlertCardProps) {
  if (clientType === "projeto" && type !== "success") {
    return null // Projetos não mostram alertas de limite
  }

  const alertConfig = {
    warning: {
      icon: AlertTriangle,
      title: "Atenção: Limite Próximo",
      message: `Você utilizou ${percentage}% dos seus créditos mensais. Considere fazer upgrade do seu plano.`,
      variant: "warning" as const,
      buttonText: "Fazer Upgrade"
    },
    blocked: {
      icon: Ban,
      title: "Limite Atingido",
      message: "Você atingiu 100% do limite mensal. Upgrade necessário para continuar usando a IA.",
      variant: "destructive" as const,
      buttonText: "Upgrade Obrigatório"
    },
    success: {
      icon: CheckCircle,
      title: "Tudo certo!",
      message: "Seu consumo está dentro do limite esperado.",
      variant: "success" as const,
      buttonText: ""
    }
  }

  const config = alertConfig[type]
  const Icon = config.icon

  const variantStyles = {
    warning: "border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5 shadow-warning/20",
    destructive: "border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 shadow-destructive/20 animate-pulse-glow",
    success: "border-success/30 bg-gradient-to-br from-success/10 to-success/5 shadow-success/20"
  }

  const iconStyles = {
    warning: "text-warning",
    destructive: "text-destructive animate-pulse",
    success: "text-success"
  }

  return (
    <Card className={cn(
      "transition-all duration-300 animate-slide-up",
      variantStyles[config.variant]
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", iconStyles[config.variant])} />
          <h3 className="font-semibold text-foreground">{config.title}</h3>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {config.message}
        </p>
        {config.buttonText && onUpgrade && (
          <Button 
            onClick={onUpgrade}
            variant={config.variant === "destructive" ? "destructive" : "default"}
            size="sm"
            className="w-full"
          >
            {config.buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}