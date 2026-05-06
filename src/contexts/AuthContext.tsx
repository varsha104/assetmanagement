import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Keep the app in a single-role mode. */
function mapDepartmentToRole(_department: string): UserRole {
  return 'higher_management';
}

function loadStoredUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawUser = window.localStorage.getItem('auth_user');
    if (!rawUser) return null;

    const parsed = JSON.parse(rawUser) as Partial<User>;
    if (!parsed.id || !parsed.username || !parsed.role) return null;

    return {
      id: String(parsed.id),
      username: parsed.username,
      name: parsed.name || parsed.username,
      email: parsed.email || '',
      role: parsed.role,
      department: parsed.department || 'Higher Management',
    };
  } catch {
    window.localStorage.removeItem('auth_user');
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.login({ username, password });

      if (result.ok && result.data) {
        const userData: User = {
          id: String(result.data.id),
          username: result.data.username || username,
          name: result.data.username || username,
          email: result.data.email,
          role: mapDepartmentToRole(result.data.department),
          department: result.data.department,
        };

        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('EmployeeId', String(result.data.id));
        localStorage.setItem('Department', 'Higher Management');
        localStorage.setItem('Email', result.data.email);

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'An error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('EmployeeId');
    localStorage.removeItem('Department');
    localStorage.removeItem('Email');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Admin',
    higher_management: 'Higher Management',
    hr_manager: 'HR Manager',
    employee: 'Employee',
    accounts: 'Accounts',
    it_admin: 'IT Admin',
  };
  return labels[role] || 'Higher Management';
}
