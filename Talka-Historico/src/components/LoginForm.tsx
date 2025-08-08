import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare, Github, Mail, Eye, EyeOff } from 'lucide-react';

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
        onLogin(data.user);
      } else {
        setError(data.message || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Gradient Background inspirado na RocketSeat */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Talka Gradient Background - Purple to Cyan */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500" />
        
        {/* Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white/30 rounded-full" />
          <div className="absolute top-40 left-40 w-96 h-96 border border-white/20 rounded-full" />
          <div className="absolute bottom-20 right-20 w-80 h-80 border border-white/25 rounded-full" />
          <div className="absolute bottom-40 right-40 w-48 h-48 border border-white/35 rounded-full" />
        </div>

        {/* Talka Logo and Brand */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="text-center space-y-8">
            {/* Talka Logo */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold">Talka</h1>
                <p className="text-white/80 text-lg">Análise de Conversas</p>
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-6 max-w-lg">
              <h2 className="text-4xl font-bold leading-tight">
                Transforme suas{' '}
                <span className="text-cyan-300">conversas</span>{' '}
                em insights poderosos
              </h2>
              <p className="text-xl text-white/80 leading-relaxed">
                Plataforma avançada para análise e gestão de históricos de chat. 
                Descubra padrões, métricas e insights valiosos em suas comunicações.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 max-w-sm">
              <div className="flex items-center space-x-3 text-white/90">
                <div className="w-2 h-2 rounded-full bg-cyan-300" />
                <span>Análise em tempo real</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="w-2 h-2 rounded-full bg-cyan-300" />
                <span>Dashboard intuitivo</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="w-2 h-2 rounded-full bg-cyan-300" />
                <span>Relatórios detalhados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form inspirado na RocketSeat */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
                Talka
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Acesse sua conta</h2>
            <p className="text-gray-600">Entre com suas credenciais para continuar</p>
          </div>

          {/* Social Login Buttons - Estilo RocketSeat */}
          <div className="space-y-3">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50"
              disabled
            >
              <Github className="w-5 h-5 mr-3" />
              Entrar com GitHub
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50"
              disabled
            >
              <Mail className="w-5 h-5 mr-3" />
              Entrar com Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">ou continue com</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Nome de usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Digite seu usuário"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Senha
                  </Label>
                  <button
                    type="button"
                    className="text-sm text-purple-600 hover:text-purple-500"
                    disabled
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base pr-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
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
            <p className="text-sm text-gray-500">
              Plataforma segura e confiável para análise de conversas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;

