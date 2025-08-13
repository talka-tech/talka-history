import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ProgressCardProps {
  title: string
  current: number
  total: number
  unit?: string
  showPercentage?: boolean
  variant?: "default" | "warning" | "destructive"
}

export function ProgressCard({
  title,
  current,
  total,
  unit = "créditos",
  showPercentage = true,
  variant = "default"
}: ProgressCardProps) {
  const percentage = Math.round((current / total) * 100)
  
  const getVariant = () => {
    if (variant === "warning") return "warning"
    if (variant === "destructive") return "destructive"
    if (percentage >= 85) return "warning"
    if (percentage >= 100) return "destructive"
    return "default"
  }

  const currentVariant = getVariant()

  const variantStyles = {
    default: "border-card-border",
    warning: "border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 shadow-warning/20",
    destructive: "border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-destructive/20 animate-pulse-glow"
  }

  const progressVariants = {
    default: "bg-accent",
    warning: "bg-warning",
    destructive: "bg-destructive"
  }

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-elegant animate-fade-in",
      variantStyles[currentVariant]
    )}>
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
        </div>
      </CardContent>
    </Card>
  )
}