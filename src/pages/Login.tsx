import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import loginBackground from '@/assets/loginbackground.png';
import headerLogo from '@/assets/headerlogo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(username, password);
    if (!result.success) {
      toast({
        title: 'Login Failed',
        description: result.error || 'Invalid username or password.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900/10 px-4">
      <div
        className="absolute inset-0 bg-center bg-cover"
        // Image prompt: High-fidelity UI design for a professional Asset Management login page.
        // The interface features a sleek Glassmorphism card with a soft frosted-glass effect,
        // white translucent background, and subtle border-glow. The typography uses a modern
        // sans-serif like Inter, bold and clean. The 'Sign In' button is a vibrant blue gradient
        // with a soft drop shadow. The background is a minimalist, abstract 3D workspace with
        // soft blue and white clay-morphic shapes, out of focus. Extremely clean, high-end
        // enterprise feel, 4k, trending on Dribbble.
        style={{ backgroundImage: `url(${loginBackground})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-900/45" aria-hidden="true" />

      <Card className="relative z-10 w-full max-w-[350px] rounded-2xl border border-white/30 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.28)] backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-2 pt-8 text-center">
          <div className="mx-auto flex items-center justify-center">
            <img src={headerLogo} alt="Company logo" className="h-20 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Sign In</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Access the Higher Management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-800">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  disabled={isLoading}
                  className="h-11 rounded-xl border-slate-300 bg-white/90 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-800">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                  className="h-11 rounded-xl border-slate-300 bg-white/90 pl-10"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-base font-semibold shadow-[0_10px_24px_rgba(37,99,235,0.32)] hover:from-blue-700 hover:to-blue-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
