import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, Save, Target, Shield, User } from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function Equipe() {
  const [equipe, setEquipe] = useState([]);
  const [config, setConfig] = useState({ meta_loja: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    // 1. Carrega Equipe
    const { data: users } = await supabase.from('perfis').select('*').order('nome');
    setEquipe(users || []);

    // 2. Carrega Meta da Loja
    const { data: conf } = await supabase.from('configuracoes').select('*').single();
    if (conf) setConfig(conf);
    
    setLoading(false);
  };

  const salvarMetaIndividual = async (id, novaMeta) => {
    await supabase.from('perfis').update({ meta_mensal: novaMeta }).eq('id', id);
    notificar.sucesso("Meta do colaborador atualizada!");
  };

  const salvarMetaLoja = async () => {
    await supabase.from('configuracoes').update({ meta_loja: config.meta_loja }).eq('id', config.id);
    notificar.sucesso("Meta GLOBAL da loja atualizada!");
  };

  const alterarCargo = async (id, novoCargo) => {
    await supabase.from('perfis').update({ cargo: novoCargo }).eq('id', id);
    notificar.sucesso("Cargo atualizado!");
    carregarDados();
  };

  if (loading) return <div className="p-10">Carregando equipe...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-3 rounded-xl"><Users className="text-white" size={24}/></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Equipe & Metas</h1>
          <p className="text-slate-500 text-sm">Defina os objetivos comerciais da loja e de cada consultor.</p>
        </div>
      </div>

      {/* META GLOBAL DA LOJA */}
      <div className="card bg-slate-900 text-white border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2"><Target className="text-blue-400"/> Meta Global da Loja</h3>
          <button onClick={salvarMetaLoja} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Salvar Global</button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Objetivo Mensal (R$)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-2xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={config.meta_loja}
              onChange={e => setConfig({...config, meta_loja: e.target.value})}
            />
          </div>
          <div className="text-right px-4 border-l border-slate-700">
            <span className="text-xs text-slate-400 block">Consultores</span>
            <span className="text-2xl font-bold">{equipe.length}</span>
          </div>
        </div>
      </div>

      {/* LISTA DE COLABORADORES */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Colaboradores</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {equipe.map((user) => (
            <div key={user.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.cargo === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.cargo === 'admin' ? <Shield size={20}/> : <User size={20}/>}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{user.email?.split('@')[0]}</p>
                  <select 
                    className="text-xs bg-transparent border-none p-0 text-slate-500 cursor-pointer outline-none font-medium hover:text-blue-600"
                    value={user.cargo}
                    onChange={(e) => alterarCargo(user.id, e.target.value)}
                  >
                    <option value="vendedor">Consultor</option>
                    <option value="admin">Gerente / Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Meta Individual</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      className="input-base h-10 font-bold text-slate-700"
                      defaultValue={user.meta_mensal}
                      onBlur={(e) => salvarMetaIndividual(user.id, e.target.value)}
                    />
                  </div>
                </div>
                <div className="hidden md:block text-right">
                  <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">Ativo</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}