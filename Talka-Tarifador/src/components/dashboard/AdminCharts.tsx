import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

interface AdminChartsProps {
  revenueData: { month: string; revenue: number }[]
  usageData: { month: string; usage: number }[]
  userDistribution: { name: string; value: number; color: string }[]
  primaryColor?: string // Nova prop para cor primária dos gráficos
}

export function AdminCharts({ revenueData, usageData, userDistribution, primaryColor = "hsl(var(--accent))" }: AdminChartsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR')
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Revenue Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Receita Mensal</CardTitle>
          <CardDescription>
            Evolução da receita nos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="revenue" fill={primaryColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Usuários</CardTitle>
          <CardDescription>
            Status dos usuários no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Usage Chart */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Uso de Créditos</CardTitle>
          <CardDescription>
            Evolução do consumo de créditos nos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip formatter={(value) => formatNumber(value as number)} />
              <Line 
                type="monotone" 
                dataKey="usage" 
                stroke={primaryColor} 
                strokeWidth={3}
                dot={{ fill: primaryColor, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
