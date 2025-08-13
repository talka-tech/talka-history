import { useState } from "react"
import { Eye, EyeOff, LogIn, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Por favor, preencha todos os campos")
      return
    }

    try {
      const success = await login(email, password)
      if (!success) {
        setError("Credenciais inválidas. Tente novamente.")
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao sistema TALKA",
        })
      }
    } catch (err) {
      setError("Erro interno. Tente novamente mais tarde.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo e Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
            <Building2 className="h-8 w-8 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">TALKA</h1>
            <p className="text-sm text-muted-foreground">Tarifador + BI</p>
          </div>
        </div>

        {/* Card de Login */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Entrar na plataforma</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-accent/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botão Submit */}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            {/* Credenciais de demonstração */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Credenciais de demonstração:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Admin:</strong> admin@talka.com.br / 123456</p>
                <p><strong>Cliente:</strong> cliente@empresa.com.br / 123456</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2025 TALKA Technologies. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
