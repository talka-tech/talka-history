import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProgressCardProps {
  title: string
  current: number
  total: number
  unit?: string
  showPercentage?: boolean
  variant?: "default" | "warning" | "destructive"
  showAlert?: boolean
  alertType?: "warning" | "blocked"
  onUpgrade?: () => void
  cardColor?: string
}

export function ProgressCard({
  title,
  current,
  total,
  unit = "créditos",
  showPercentage = true,
  variant = "default",
  showAlert = false,
  alertType = "warning",
  onUpgrade,
  cardColor
}: ProgressCardProps) {
  const percentage = Math.round((current / total) * 100)

  const getVariant = () => {
    if (variant === "warning") return "warning"
    if (variant === "destructive") return "destructive"
    if (percentage >= 100) return "destructive"
    if (percentage >= 85) return "warning"
    return "default"
  }

  const currentVariant = getVariant()

  const variantStyles = {
    default: "border-[color:var(--client-primary,theme(colors.accent.DEFAULT))]/30 bg-gradient-to-br from-[color:var(--client-primary,theme(colors.accent.DEFAULT))]/5 to-[color:var(--client-primary,theme(colors.accent.DEFAULT))]/10",
    warning: "border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 shadow-warning/20",
    destructive: "border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-destructive/20 animate-pulse-glow"
  }

  const progressVariants = {
    default: "bg-[color:var(--client-primary,theme(colors.accent.DEFAULT))]",
    warning: "bg-warning",
    destructive: "bg-destructive"
  }

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-elegant animate-fade-in",
        variantStyles[currentVariant]
      )}
      style={cardColor ? { background: cardColor } : {}}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-foreground">
              {current.toLocaleString('pt-BR')}
            </span>
            <span className="text-sm text-muted-foreground">
              / {total.toLocaleString('pt-BR')} {unit}
            </span>
          </div>
          
          <Progress 
            value={percentage} 
            className={`h-2 [&>div]:${progressVariants[currentVariant]}`}
          />
          
          {showPercentage && (
            <div className="flex justify-between items-center text-sm">
              <span className={cn(
                "font-medium",
                currentVariant === "warning" && "text-warning",
                currentVariant === "destructive" && "text-destructive"
              )}>
                {percentage}% utilizado
              </span>
              <span className="text-muted-foreground">
                {(total - current).toLocaleString('pt-BR')} restantes
              </span>
            </div>
          )}

          {/* Alerta integrado - mais discreto e em baixo */}
          {showAlert && (
            <div className={cn(
              "mt-4 p-3 rounded-md border border-dashed flex items-start gap-2",
              alertType === "warning" 
                ? "bg-warning/5 border-warning/20"
                : "bg-destructive/5 border-destructive/20"
            )}>
              <TriangleAlert className={cn(
                "h-3.5 w-3.5 mt-0.5 flex-shrink-0 opacity-70",
                alertType === "warning" ? "text-warning" : "text-destructive"
              )} />
              <div className="space-y-2 flex-1">
                <p className={cn(
                  "font-medium text-xs",
                  alertType === "warning" ? "text-warning" : "text-destructive"
                )}>
                  {alertType === "warning" ? "Atenção: Limite Próximo" : "Limite Excedido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {alertType === "warning" 
                    ? "Você utilizou a maior parte dos seus créditos mensais. Considere fazer upgrade do seu plano."
                    : "Você excedeu o limite de créditos. Faça upgrade para continuar usando os serviços."
                  }
                </p>
                {onUpgrade && (
                  <Button 
                    size="sm" 
                    onClick={onUpgrade}
                    variant="outline"
                    className={cn(
                      "mt-2 text-xs h-7 px-3 border-dashed",
                      alertType === "warning" 
                        ? "text-warning border-warning/30 hover:bg-warning/10"
                        : "text-destructive border-destructive/30 hover:bg-destructive/10"
                    )}
                  >
                    Fazer Upgrade
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}