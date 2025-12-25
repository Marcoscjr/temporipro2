import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';

// --- IMPORTAÇÃO DAS PÁGINAS ---

// Autenticação e Dashboard
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Módulo Comercial e Fluxo de Vendas
import Comercial from './pages/Comercial';
import OrcamentoInterno from './pages/OrcamentoInterno';      
import OrcamentoNegociacao from './pages/OrcamentoNegociacao'; 
import DadosVenda from './pages/DadosVenda';                   
import DetalhesContrato from './pages/DetalhesContrato';       
import VendaPublica from './pages/VendaPublica';               // <-- ADICIONADO PARA ASSINATURA DIGITAL
import Fechamento from './pages/Fechamento';
import RelatorioMontagem from './pages/RelatorioMontagem';     

// Outros Módulos
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

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          {/* Notificações (Toaster) */}
          <Toaster position="top-right" richColors />
          
          <Routes>
            {/* --- ROTAS PÚBLICAS --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/venda-publica/:id" element={<VendaPublica />} /> {/* <-- ROTA DE ASSINATURA DO CLIENTE */}
            <Route path="/aguardando" element={<Aguardando />} />

            {/* --- ROTAS PRIVADAS (Protegidas) --- */}
            
            {/* Home */}
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

            {/* Comercial (Listagem) */}
            <Route path="/comercial" element={<PrivateRoute><Comercial /></PrivateRoute>} />

            {/* Fluxo de Orçamento */}
            <Route path="/novo-orcamento" element={<PrivateRoute><OrcamentoInterno /></PrivateRoute>} />
            <Route path="/negociacao" element={<PrivateRoute><OrcamentoNegociacao /></PrivateRoute>} />

            {/* Pós-Venda e Contratos */}
            <Route path="/venda/:id" element={<PrivateRoute><DadosVenda /></PrivateRoute>} />
            <Route path="/contrato/:id" element={<PrivateRoute><DetalhesContrato /></PrivateRoute>} />
            <Route path="/relatorio-montagem/:id" element={<PrivateRoute><RelatorioMontagem /></PrivateRoute>} /> 
            <Route path="/fechamento/:id" element={<PrivateRoute><Fechamento /></PrivateRoute>} />

            {/* Financeiro e Administrativo */}
            <Route path="/financeiro" element={<PrivateRoute><Financeiro /></PrivateRoute>} />
            <Route path="/resultado-contratos" element={<PrivateRoute><ResultadoContrato /></PrivateRoute>} />
            <Route path="/ranking" element={<PrivateRoute><RankingVendedores /></PrivateRoute>} /> 
            <Route path="/compras" element={<PrivateRoute><Compras /></PrivateRoute>} />
            <Route path="/estoque" element={<PrivateRoute><Estoque /></PrivateRoute>} />
            <Route path="/parceiros" element={<PrivateRoute><Parceiros /></PrivateRoute>} />
            <Route path="/equipe" element={<PrivateRoute><Equipe /></PrivateRoute>} />
            <Route path="/relatorios" element={<PrivateRoute><Relatorios /></PrivateRoute>} />
            
            {/* Configurações e Outros */}
            <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
            <Route path="/assistencia" element={<PrivateRoute><Assistencia /></PrivateRoute>} />
            <Route path="/marketing" element={<PrivateRoute><Marketing /></PrivateRoute>} />
            
            {/* Área Técnica / Montador */}
            <Route path="/montador" element={<PrivateRoute><AreaTecnica /></PrivateRoute>} />
            
            {/* Fallback: Qualquer rota desconhecida volta para o Dashboard */}
            <Route path="*" element={<Navigate to="/" />} />
            
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}