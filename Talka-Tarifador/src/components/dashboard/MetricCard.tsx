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
  cardColor?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  variant = "default",
  cardColor
}: MetricCardProps) {
  const variantStyles = {
    default: "border-card-border",
    accent: "border-[color:var(--client-primary,theme(colors.accent.DEFAULT))]/20 bg-gradient-to-br from-[color:var(--client-primary,theme(colors.accent.DEFAULT))]/5 to-[color:var(--client-primary,theme(colors.accent.DEFAULT))]/10",
    warning: "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10",
    success: "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
    destructive: "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
  }

  // Deixa o fundo mais claro e borda mais visível
  const bg = cardColor ? cardColor.replace(/10|20|22|30|40|50|60|70|80|90|A0|B0|C0|D0|E0|F0/g, '22') : undefined;
  const border = cardColor ? cardColor.replace(/10|20|22|30|40|50|60|70|80|90|A0|B0|C0|D0|E0|F0/g, '99') : undefined;
  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-elegant animate-fade-in",
        variantStyles[variant],
        className
      )}
      style={cardColor ? { background: bg, borderColor: border } : {}}
    >
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