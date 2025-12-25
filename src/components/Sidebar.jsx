import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Wrench, Megaphone, LogOut, Briefcase, 
  ShoppingCart, Users, Smartphone, Settings, TrendingUp, Box, Trophy // Adicionado ícone Trophy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { perfil, logout } = useAuth();
  const location = useLocation();

  const menus = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20}/>, roles: ['admin', 'financeiro', 'consultor', 'conferente', 'montador', 'marketing'] },
    { name: 'Ranking / Metas', path: '/ranking', icon: <Trophy size={20}/>, roles: ['admin', 'financeiro', 'consultor'] }, // <-- ADICIONADO AQUI
    { name: 'Relatórios', path: '/relatorios', icon: <TrendingUp size={20}/>, roles: ['admin', 'financeiro'] },
    { name: 'CRM / Leads', path: '/marketing', icon: <Megaphone size={20}/>, roles: ['admin', 'consultor', 'marketing', 'financeiro'] },
    { name: 'Comercial', path: '/comercial', icon: <Briefcase size={20}/>, roles: ['admin', 'consultor', 'financeiro'] },
    { name: 'Compras', path: '/compras', icon: <ShoppingCart size={20}/>, roles: ['admin', 'financeiro', 'consultor'] },
    { name: 'Estoque', path: '/estoque', icon: <Settings size={20}/>, roles: ['admin', 'financeiro', 'conferente'] }, 
    { name: 'Parceiros', path: '/parceiros', icon: <Users size={20}/>, roles: ['admin', 'consultor', 'marketing'] },
    { name: 'Financeiro', path: '/financeiro', icon: <Wallet size={20}/>, roles: ['admin', 'financeiro'] },
    { name: 'Técnico / Obras', path: '/assistencia', icon: <Wrench size={20}/>, roles: ['admin', 'consultor', 'conferente', 'montador', 'financeiro'] },
    { name: 'Área do Montador', path: '/montador', icon: <Smartphone size={20}/>, roles: ['admin', 'montador', 'conferente'] },
    { name: 'Configurações', path: '/configuracoes', icon: <Settings size={20}/>, roles: ['admin', 'financeiro'] },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed z-50 overflow-y-auto print:hidden shadow-xl">
      <div className="p-6 border-b border-slate-800 flex flex-col items-center">
        
        {/* LOGOMARCA NATIVA (Nunca quebra) */}
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Box size={24} className="text-white" strokeWidth={3} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Tempori<span className="text-blue-400">Pro</span>
          </span>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Bem-vindo,</p>
          <p className="text-sm font-bold text-white truncate max-w-[180px]" title={perfil?.nome_completo}>
            {perfil?.nome_completo?.split(' ')[0] || 'Usuário'}
          </p>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-blue-300 uppercase font-bold mt-1 inline-block">
            {perfil?.cargo}
          </span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 mt-2">
        {menus.map(m => {
          if (perfil?.cargo !== 'admin' && !m.roles.includes(perfil?.cargo)) return null;
          const active = location.pathname === m.path || (m.path !== '/' && location.pathname.includes(m.path));
          return (
            <Link key={m.path} to={m.path} className={`flex gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-md font-bold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
              {m.icon} <span>{m.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button onClick={logout} className="flex gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 w-full p-2 rounded-lg transition"><LogOut size={20}/> Sair</button>
      </div>
    </aside>
  );
}