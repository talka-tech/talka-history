import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatHistoryViewer from '@/components/ChatHistoryViewer';
import LoginForm from '@/components/LoginForm';
import AdminPanel from '@/components/AdminPanel';
import { toast } from './hooks/use-toast';

const queryClient = new QueryClient();

// A interface não precisa mais da senha no front-end
interface User {
  id: number;
  username: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    // Verificar se há sessão ativa no localStorage
    const savedAuth = localStorage.getItem('talkahistory_auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setIsAuthenticated(true);
      setIsAdmin(authData.isAdmin);
      setCurrentUser(authData.username);
      setCurrentUserId(authData.userId);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Credenciais inválidas');
        }

        const userData = await response.json();
        
        setIsAuthenticated(true);
        setIsAdmin(userData.isAdmin);
        setCurrentUser(userData.username);
        setCurrentUserId(userData.id);

        localStorage.setItem('talkahistory_auth', JSON.stringify({
            username: userData.username,
            userId: userData.id,
            isAdmin: userData.isAdmin,
            timestamp: Date.now()
        }));

    } catch (error: any) {
        toast({
            title: "Erro de autenticação",
            description: error.message,
            variant: "destructive"
        });
        // Lança o erro para que o LoginForm possa tratar o estado de loading
        throw error;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser('');
    setCurrentUserId(null);
    localStorage.removeItem('talkahistory_auth');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <div className="App">
            <Routes>
              {/* Rota de login */}
              <Route 
                path="/login" 
                element={
                  !isAuthenticated ? (
                    <LoginForm onLogin={handleLogin} />
                  ) : (
                    <Navigate to={isAdmin ? "/admin" : "/"} replace />
                  )
                } 
              />
              
              {/* Rota do admin */}
              <Route 
                path="/admin" 
                element={
                  isAuthenticated && isAdmin ? (
                    <AdminPanel 
                      onLogout={handleLogout} 
                      user={{
                        id: currentUserId || 0,
                        username: currentUser,
                        password: '',
                        created_at: '',
                        status: 'active',
                        user_type: 'admin'
                      }}
                    />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              {/* Rota principal */}
              <Route 
                path="/" 
                element={
                  isAuthenticated && !isAdmin && currentUserId ? (
                    <ChatHistoryViewer 
                      onLogout={handleLogout} 
                      currentUser={currentUser}
                      currentUserId={currentUserId} // Prop adicionada aqui
                    />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              {/* Rota padrão */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;