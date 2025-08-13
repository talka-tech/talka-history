import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  variant?: "default" | "accent" | "warning" | "success" | "destructive"
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  variant = "default"
}: MetricCardProps) {
  const variantStyles = {
    default: "border-card-border",
    accent: "border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10",
    warning: "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10",
    success: "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
    destructive: "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
  }

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-elegant animate-fade-in",
      variantStyles[variant],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mb-2">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center text-xs">
            <span className={cn(
              "flex items-center",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}