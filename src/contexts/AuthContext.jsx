import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { 
        setUser(session.user); 
        const { data } = await supabase.from('perfis').select('*').eq('id', session.user.id).single();
        setPerfil(data);
      }
      // Carregar Configurações Globais
      const { data: cfg } = await supabase.from('configuracoes').select('*');
      const configObj = {};
      if(cfg) cfg.forEach(c => configObj[c.chave] = c.valor);
      setConfig(configObj);
      
      setLoading(false);
    };
    loadAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if(!session?.user) setPerfil(null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const recarregarConfigs = async () => {
     const { data: cfg } = await supabase.from('configuracoes').select('*');
     const configObj = {};
     if(cfg) cfg.forEach(c => configObj[c.chave] = c.valor);
     setConfig(configObj);
  };

  return (
    <AuthContext.Provider value={{ user, perfil, config, recarregarConfigs, loading, logout: () => supabase.auth.signOut() }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);