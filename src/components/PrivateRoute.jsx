import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Aguardando from '../pages/Aguardando';

export default function PrivateRoute({ children }) {
  const { user, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  // 1. Se não tá logado, manda pro Login
  if (!user) return <Navigate to="/login" />;

  // 2. Se tá logado mas o perfil ainda não carregou (raro, mas acontece), carrega
  if (!perfil) return null;

  // 3. SE ESTIVER AGUARDANDO APROVAÇÃO, MOSTRA TELA DE BLOQUEIO
  if (perfil.cargo === 'aguardando') {
    return <Aguardando />;
  }

  // 4. Se passou por tudo, mostra o sistema
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 print:ml-0 print:p-0 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}