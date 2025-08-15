import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  footer?: ReactNode;
  variant?: "default" | "accent" | "warning" | "success" | "destructive";
  cardColor?: string;
  className?: string;
  children?: ReactNode;
}

function MetricCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  footer,
  variant = "default",
  cardColor,
  className,
  children
}: MetricCardProps) {
  // ...existing code...
// ...existing code...
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
        <CardTitle className="text-sm font-medium" style={{ color: '#e4e4e7' }}>
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4" style={{ color: '#e4e4e7' }}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color: '#f4f4f5' }}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs mb-2" style={{ color: '#ececf0' }}>
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
            <span className="ml-1" style={cardColor ? { color: cardColor.replace('10', '') } : { color: '#3f3f46' }}>vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricCard;