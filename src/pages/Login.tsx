"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { api } from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Preencha o email e a senha.');
      return;
    }

    setIsLoading(true);
    try {
      const { token, user } = await api.post<{ token: string; user: any }>('/api/auth/login', {
        email,
        password,
      });
      login(token, user);
      navigate('/');
    } catch (err: any) {
      showError(err.message || 'Erro ao fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--background))] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-[hsl(var(--card-bg))] rounded-lg shadow-lg border border-[hsl(var(--border-color))]">
        <h2 className="text-2xl font-bold text-center text-[hsl(var(--foreground))]">
          Bem-vindo de volta!
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[hsl(var(--foreground))]">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[hsl(var(--foreground))]">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[hsl(var(--accent-turquoise))] text-[hsl(var(--background))] font-semibold hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
