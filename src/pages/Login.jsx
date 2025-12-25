import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { notificar } from '../utils';

export default function Login() {
  const { user } = useAuth();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dados do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const LOGO_URL = "https://i.imgur.com/8Z0Zk5n.png";

  // Se já estiver logado, manda pro Dashboard
  if (user) return <Navigate to="/" />;

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (modoCadastro) {
        // --- CADASTRAR ---
        if (!nome) throw new Error("Digite seu nome completo.");
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome_completo: nome }
          }
        });
        
        if (error) throw error;
        notificar.sucesso("Cadastro realizado! Verifique seu e-mail.");
        setModoCadastro(false);
        
      } else {
        // --- LOGIN ---
        // Adicionada tentativa com timeout implícito e tratamento de erro de rede
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          // Detecta se o erro é de conexão (CORS ou falha de rede)
          if (error.message.includes('fetch') || error.status === 0) {
            throw new Error("Erro de conexão com o banco. Verifique se o endereço temporipro2.vercel.app está autorizado no painel do Supabase.");
          }
          throw error;
        }
        
        notificar.sucesso("Bem-vindo de volta!");
      }
    } catch (error) {
      console.error("Erro de Autenticação:", error);
      notificar.erro(error.message || "Erro ao tentar conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4 bg-[url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center bg-blend-overlay">
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl w-full max-w-md shadow-2xl border-t-4 border-blue-600 animate-fade-in">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="TemporiPro" className="h-16 mx-auto mb-4 drop-shadow-sm"/>
          <h2 className="text-2xl font-bold text-gray-800">
            {modoCadastro ? 'Crie sua conta' : 'Acesse o Sistema'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Gestão profissional para sua marcenaria.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {modoCadastro && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1 pl-1">Nome Completo</label>
              <input 
                required={modoCadastro}
                className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none transition" 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                placeholder="Ex: João da Silva" 
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 pl-1">Email Corporativo</label>
            <input 
              required
              type="email"
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none transition" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="seu@email.com" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 pl-1">Senha</label>
            <input 
              required
              type="password"
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none transition" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="******" 
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-200"
          >
            {loading ? <Loader2 className="animate-spin" /> : (modoCadastro ? <UserPlus size={20}/> : <LogIn size={20}/>)}
            {modoCadastro ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-6">
          <button 
            onClick={() => setModoCadastro(!modoCadastro)} 
            className="text-sm text-blue-600 hover:underline font-bold transition"
          >
            {modoCadastro ? 'Já tem uma conta? Entrar' : 'Não tem acesso? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}