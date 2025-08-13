import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ConsumptionData {
  day: string
  credits: number
  date: string
}

interface ConsumptionChartProps {
  data: ConsumptionData[]
}

export function ConsumptionChart({ data }: ConsumptionChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="rounded-lg border border-card-border bg-card p-3 shadow-elegant">
          <p className="text-sm font-medium text-foreground">{data?.date}</p>
          <p className="text-sm text-accent">
            <span className="font-medium">{payload[0]?.value}</span> créditos
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="col-span-full transition-all duration-300 hover:shadow-elegant animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Consumo Diário - {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Créditos consumidos por dia neste mês
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
              />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="credits" 
                fill="hsl(var(--accent))"
                radius={[4, 4, 0, 0]}
                className="drop-shadow-sm"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}