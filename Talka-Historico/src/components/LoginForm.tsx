import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: (userData: any) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validação no frontend
    if (!username.trim() || !password.trim()) {
      setError('Nome de usuário e senha são obrigatórios');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        setError(data.error || data.message || 'Erro ao fazer login');
      }
    } catch (err) {
      console.error('Erro de login:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{backgroundColor: '#12032d'}}>
      {/* Left Side - Gradient Background com animações */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Talka Gradient Background - Roxo escuro */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900" />
        
        {/* Animated Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 border border-purple-300/30 rounded-full animate-pulse" />
          <div className="absolute top-40 left-40 w-96 h-96 border border-purple-300/20 rounded-full animate-spin" style={{animationDuration: '20s'}} />
          <div className="absolute bottom-20 right-20 w-80 h-80 border border-purple-300/25 rounded-full animate-bounce" style={{animationDuration: '3s'}} />
          <div className="absolute bottom-40 right-40 w-48 h-48 border border-purple-300/35 rounded-full animate-ping" style={{animationDuration: '4s'}} />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-10 w-6 h-6 bg-purple-400/30 rounded-full animate-bounce" style={{animationDelay: '0s', animationDuration: '2s'}} />
          <div className="absolute top-1/3 right-20 w-4 h-4 bg-purple-300/40 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '2.5s'}} />
          <div className="absolute bottom-1/3 left-16 w-3 h-3 bg-purple-500/50 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '2.2s'}} />
          <div className="absolute bottom-1/4 right-16 w-5 h-5 bg-purple-200/30 rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '2.8s'}} />
          
          {/* Chat bubbles animation */}
          <div className="absolute top-1/2 left-8 transform -translate-y-1/2">
            <div className="flex flex-col space-y-3">
              <div className="bg-purple-600/40 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-2 max-w-40 animate-pulse" style={{animationDelay: '0s'}}>
                <div className="h-2 bg-purple-300/60 rounded mb-1" />
                <div className="h-2 bg-purple-300/40 rounded w-3/4" />
              </div>
              <div className="bg-purple-500/30 backdrop-blur-sm rounded-2xl rounded-br-sm px-4 py-2 max-w-32 ml-auto animate-pulse" style={{animationDelay: '2s'}}>
                <div className="h-2 bg-purple-200/60 rounded mb-1" />
                <div className="h-2 bg-purple-200/40 rounded w-2/3" />
              </div>
              <div className="bg-purple-600/40 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-2 max-w-36 animate-pulse" style={{animationDelay: '4s'}}>
                <div className="h-2 bg-purple-300/60 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Talka Logo and Brand */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="text-center space-y-8 animate-fade-in">
            {/* Talka Logo */}
            <div className="flex items-center justify-center space-x-4 mb-8 animate-slide-up">
              <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center border border-purple-200/50 p-3 hover:scale-110 transition-transform duration-300 shadow-lg">
                <img src="/img/logo.png" alt="Talka Logo" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent animate-pulse" style={{animationDuration: '3s'}}>Talka</h1>
                <p className="text-purple-200 text-lg">Análise de Conversas</p>
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-6 max-w-lg animate-slide-up" style={{animationDelay: '0.2s'}}>
              <h2 className="text-4xl font-bold leading-tight">
                Transforme suas{' '}
                <span className="text-purple-300 animate-pulse" style={{animationDuration: '2s'}}>conversas</span>{' '}
                em insights poderosos
              </h2>
              <p className="text-xl text-purple-100 leading-relaxed">
                Plataforma avançada para análise e gestão de históricos de chat. 
                Descubra padrões, métricas e insights valiosos em suas comunicações.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 max-w-sm animate-slide-up" style={{animationDelay: '0.4s'}}>
              <div className="flex items-center space-x-3 text-purple-100 hover:text-white transition-colors duration-200">
                <div className="w-2 h-2 rounded-full bg-purple-300 animate-ping" style={{animationDuration: '2s'}} />
                <span>Análise em tempo real</span>
              </div>
              <div className="flex items-center space-x-3 text-purple-100 hover:text-white transition-colors duration-200">
                <div className="w-2 h-2 rounded-full bg-purple-300 animate-ping" style={{animationDuration: '2.2s', animationDelay: '0.3s'}} />
                <span>Dashboard intuitivo</span>
              </div>
              <div className="flex items-center space-x-3 text-purple-100 hover:text-white transition-colors duration-200">
                <div className="w-2 h-2 rounded-full bg-purple-300 animate-ping" style={{animationDuration: '2.4s', animationDelay: '0.6s'}} />
                <span>Relatórios detalhados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form inspirado na RocketSeat */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center p-2 shadow-lg border border-purple-200/50">
                <img src="/img/logo.png" alt="Talka Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
                Talka
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-white">Acesse sua conta</h2>
            <p className="text-purple-200">Entre com suas credenciais para continuar</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-purple-200">
                  Nome de usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12 text-base border-purple-600/40 bg-purple-900/30 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400 backdrop-blur-sm"
                  placeholder="Digite seu usuário"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-purple-200">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base pr-12 border-purple-600/40 bg-purple-900/30 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400 backdrop-blur-sm"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-purple-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <Alert className="border-red-400/50 bg-red-900/30 backdrop-blur-sm">
                <AlertDescription className="text-red-200 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-purple-300">
              Plataforma segura e confiável para análise de conversas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;

