import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
          description: "Bem-vindo ao sistema Talka",
        })
      }
    } catch (err) {
      setError("Erro interno. Tente novamente mais tarde.")
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Content Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#12032d] via-[#1a0440] to-[#0f0221] relative overflow-hidden">
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.2),transparent)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.1),transparent)]"></div>
        </div>
        
        {/* Giant Background Animations - Geometric Shapes */}
        <div className="absolute inset-0 overflow-hidden opacity-5">
          {/* Giant Triangle */}
          <div className="absolute top-16 right-20 w-24 h-24 animate-float select-none pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-full h-full text-purple-300 transform rotate-12">
              <polygon points="12,2 22,20 2,20" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Giant Chart Bars */}
          <div className="absolute bottom-20 left-10 flex items-end space-x-2 animate-pulse select-none pointer-events-none">
            <div className="w-4 h-16 bg-purple-400/20 rounded-t"></div>
            <div className="w-4 h-24 bg-purple-400/20 rounded-t"></div>
            <div className="w-4 h-12 bg-purple-400/20 rounded-t"></div>
            <div className="w-4 h-20 bg-purple-400/20 rounded-t"></div>
          </div>
          
          {/* Giant Hexagon */}
          <div className="absolute top-1/2 left-16 w-20 h-20 animate-bounce-slow select-none pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-full h-full text-purple-300 transform -rotate-12">
              <polygon points="6,2 18,2 22,12 18,22 6,22 2,12" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Giant Circle with rotating element */}
          <div className="absolute bottom-32 right-16 w-32 h-32 border-8 border-purple-400/20 rounded-full animate-spin-slow select-none pointer-events-none">
            <div className="absolute top-0 left-1/2 w-16 h-16 bg-purple-400/10 rounded-full transform -translate-x-1/2"></div>
          </div>
          
          {/* Giant Diamond */}
          <div className="absolute top-40 left-1/3 w-16 h-16 animate-pulse select-none pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-full h-full text-purple-300/30 transform rotate-45">
              <rect x="4" y="4" width="16" height="16" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Giant Rounded Rectangle */}
          <div className="absolute top-24 left-1/4 w-24 h-16 bg-purple-400/10 rounded-2xl animate-float select-none pointer-events-none transform rotate-6">
            <div className="absolute top-2 left-2 w-4 h-2 bg-purple-400/20 rounded"></div>
            <div className="absolute bottom-2 left-2 w-16 h-1 bg-purple-400/20 rounded"></div>
          </div>
          
          {/* Giant Analytics Line */}
          <svg className="absolute bottom-40 left-1/3 w-40 h-20 animate-pulse select-none pointer-events-none" viewBox="0 0 160 80">
            <path d="M10 60 Q40 20 80 40 T150 20" stroke="rgba(147,51,234,0.1)" strokeWidth="3" fill="none"/>
            <circle cx="10" cy="60" r="2" fill="rgba(147,51,234,0.15)"/>
            <circle cx="80" cy="40" r="2" fill="rgba(147,51,234,0.15)"/>
            <circle cx="150" cy="20" r="2" fill="rgba(147,51,234,0.15)"/>
          </svg>
          
          {/* Giant Octagon */}
          <div className="absolute bottom-16 right-32 w-18 h-18 animate-bounce-slow select-none pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-full h-full text-purple-300/20">
              <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" fill="currentColor"/>
            </svg>
          </div>
        </div>
        
        {/* Enhanced Animated floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-3 h-3 bg-purple-400/60 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-2 h-2 bg-purple-300/80 rounded-full animate-ping"></div>
          <div className="absolute bottom-32 left-16 w-2.5 h-2.5 bg-purple-500/70 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 right-12 w-1.5 h-1.5 bg-purple-200/90 rounded-full animate-pulse"></div>
          <div className="absolute top-60 left-32 w-1 h-1 bg-purple-600/60 rounded-full animate-ping"></div>
          <div className="absolute bottom-60 right-32 w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-bounce"></div>
        </div>
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-20 text-white w-full">
          {/* Centered Header with Logo - Even Lower Position */}
          <div className="text-center mb-4 animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-purple-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 border border-purple-400/30 hover:scale-110 transition-transform duration-300 cursor-pointer">
                <img 
                  src="/logo.png" 
                  alt="Talka Logo" 
                  className="h-8 w-auto filter brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Tarifador Talka</h1>
                <p className="text-purple-200 text-sm">Controle de créditos e métricas BI</p>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="space-y-12 animate-fade-in-delay">
            <div className="space-y-6 text-center">
              <h2 className="text-5xl font-bold text-white leading-tight animate-slide-up">
                Transforme seus dados em <br />
                <span className="text-purple-300">insights valiosos</span>
              </h2>
              <p className="text-xl text-purple-100 max-w-lg mx-auto animate-slide-up-delay">
                Plataforma inteligente para tarifação, controle de créditos e Business Intelligence em tempo real.
              </p>
            </div>
            
            {/* Features List with Icons - Vertically Aligned */}
            <div className="space-y-6 animate-fade-in-delay max-w-md mx-auto">
              <div className="flex items-center space-x-4 animate-slide-up-delay-2">
                <div className="w-8 h-8 bg-purple-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-purple-400/30 hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="text-lg text-purple-100">Controle de créditos em tempo real</span>
              </div>
              
              <div className="flex items-center space-x-4 animate-slide-up-delay-3">
                <div className="w-8 h-8 bg-purple-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-purple-400/30 hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                  </svg>
                </div>
                <span className="text-lg text-purple-100">Tarifação automatizada e precisa</span>
              </div>
              
              <div className="flex items-center space-x-4 animate-slide-up-delay-4">
                <div className="w-8 h-8 bg-purple-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-purple-400/30 hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </div>
                <span className="text-lg text-purple-100">Dashboard com métricas importantes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#0f0221] via-[#1a0440] to-[#12032d] relative overflow-hidden">
        {/* Background Pattern for Right Side */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-tl from-purple-500/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(120,119,198,0.2),transparent)]"></div>
        </div>
        
        {/* Subtle floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-32 right-16 w-1 h-1 bg-purple-300 rounded-full animate-pulse"></div>
          <div className="absolute bottom-40 right-24 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></div>
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center space-y-6">
            <div className="w-16 h-16 bg-purple-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto border border-purple-400/30 hover:scale-110 transition-transform duration-300 cursor-pointer">
              <img 
                src="/logo.png" 
                alt="Talka Logo" 
                className="h-8 w-auto filter brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Tarifador Talka</h1>
              <p className="text-purple-200">Controle de créditos e métricas BI</p>
            </div>
          </div>

          {/* Welcome Section - Desktop */}
          <div className="hidden lg:block text-center space-y-4">
            <h2 className="text-3xl font-bold text-white hover:scale-105 transition-transform duration-300 cursor-default">Bem-vindo!</h2>
            <p className="text-purple-200">Entre com suas credenciais para continuar</p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Login */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-purple-100 font-medium">Login</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Digite seu login"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12 bg-white/10 border-purple-400/30 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-purple-100 font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 pr-12 bg-white/10 border-purple-400/30 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 hover:scale-110 transition-all duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-purple-300" />
                    ) : (
                      <Eye className="h-4 w-4 text-purple-300" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <Alert variant="destructive" className="text-sm bg-red-500/10 border-red-400/30 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botão Submit */}
              <Button
                type="submit"
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 hover:scale-105 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Entrando...
                  </>
                ) : (
                  "Entrar na Plataforma"
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center space-y-3">
            <p className="text-sm text-purple-200">
              Plataforma segura para controle de créditos e tarifação
            </p>
            <p className="text-xs text-purple-300">
              © 2025 Talka. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
