import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function Aguardando() {
  const { logout, user } = useAuth();

  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl text-center">
        <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="text-orange-600" size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Cadastro em Análise</h1>
        <p className="text-gray-600 mb-6">
          Olá, <strong>{user?.user_metadata?.nome_completo}</strong>. <br/>
          Seu cadastro foi realizado com sucesso, mas o acesso aos dados da <strong>Tempori Planejados</strong> é restrito.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-8 border border-blue-100">
          Solicite ao Administrador para liberar seu acesso no painel de Configurações.
        </div>

        <button 
          onClick={logout} 
          className="w-full bg-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-300 transition flex items-center justify-center gap-2"
        >
          <LogOut size={18}/> Sair e Tentar Novamente
        </button>
      </div>
    </div>
  );
}