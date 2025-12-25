import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

// --- IMPORTAÇÃO DAS PÁGINAS ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Comercial from './pages/Comercial';
import OrcamentoInterno from './pages/OrcamentoInterno';      
import OrcamentoNegociacao from './pages/OrcamentoNegociacao'; 
import DadosVenda from './pages/DadosVenda';                   
import DetalhesContrato from './pages/DetalhesContrato';       
import VendaPublica from './pages/VendaPublica';               
import Fechamento from './pages/Fechamento';
import RelatorioMontagem from './pages/RelatorioMontagem';     
import Equipe from './pages/Equipe';
import Relatorios from './pages/Relatorios';
import Compras from './pages/Compras';
import Estoque from './pages/Estoque';
import Financeiro from './pages/FinanceiroPro';
import ResultadoContrato from './pages/ResultadoContrato'; 
import RankingVendedores from './pages/RankingVendedores';     
import Assistencia from './pages/Assistencia';
import Marketing from './pages/Marketing';
import Parceiros from './pages/Parceiros';
import Configuracoes from './pages/Configuracoes';
import AreaTecnica from './pages/AreaTecnica'; 
import Aguardando from './pages/Aguardando';

// Componente de carregamento para evitar saltos de tela
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
    <Loader2 className="animate-spin text-blue-600" size={40} />
    <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest italic">Tempori Pro carregando...</p>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          
          {/* Suspense envolve as rotas para garantir que nada renderize "pela metade" */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* --- ROTAS PÚBLICAS --- */}
              <Route path="/login" element={<Login />} />
              <Route path="/venda-publica/:id" element={<VendaPublica />} />
              <Route path="/aguardando" element={<Aguardando />} />

              {/* --- ROTAS PRIVADAS --- */}
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/comercial" element={<PrivateRoute><Comercial /></PrivateRoute>} />
              <Route path="/novo-orcamento" element={<PrivateRoute><OrcamentoInterno /></PrivateRoute>} />
              <Route path="/negociacao" element={<PrivateRoute><OrcamentoNegociacao /></PrivateRoute>} />
              <Route path="/venda/:id" element={<PrivateRoute><DadosVenda /></PrivateRoute>} />
              <Route path="/contrato/:id" element={<PrivateRoute><DetalhesContrato /></PrivateRoute>} />
              <Route path="/relatorio-montagem/:id" element={<PrivateRoute><RelatorioMontagem /></PrivateRoute>} /> 
              <Route path="/fechamento/:id" element={<PrivateRoute><Fechamento /></PrivateRoute>} />
              <Route path="/financeiro" element={<PrivateRoute><Financeiro /></PrivateRoute>} />
              <Route path="/resultado-contratos" element={<PrivateRoute><ResultadoContrato /></PrivateRoute>} />
              <Route path="/ranking" element={<PrivateRoute><RankingVendedores /></PrivateRoute>} /> 
              <Route path="/compras" element={<PrivateRoute><Compras /></PrivateRoute>} />
              <Route path="/estoque" element={<PrivateRoute><Estoque /></PrivateRoute>} />
              <Route path="/parceiros" element={<PrivateRoute><Parceiros /></PrivateRoute>} />
              <Route path="/equipe" element={<PrivateRoute><Equipe /></PrivateRoute>} />
              <Route path="/relatorios" element={<PrivateRoute><Relatorios /></PrivateRoute>} />
              <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
              <Route path="/assistencia" element={<PrivateRoute><Assistencia /></PrivateRoute>} />
              <Route path="/marketing" element={<PrivateRoute><Marketing /></PrivateRoute>} />
              <Route path="/montador" element={<PrivateRoute><AreaTecnica /></PrivateRoute>} />
              
              {/* Fallback Seguro */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}