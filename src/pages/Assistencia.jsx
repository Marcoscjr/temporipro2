import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Plus, X, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { notificar } from '../utils'; 

export default function Assistencia() {
  const { user } = useAuth();
  const [pendencias, setPendencias] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [erroFatal, setErroFatal] = useState(null);
  
  const [novoChamado, setNovoChamado] = useState({ contrato_id: '', ambiente: '', descricao: '' });

  useEffect(() => {
    if (user) {
      carregarTudo();
    }
  }, [user]);

  async function carregarTudo() {
    setLoading(true);
    setErroFatal(null);
    try {
      // Carrega Assistências
      const { data: aData, error: aError } = await supabase
        .from('assistencias')
        .select('*, contratos(numero_contrato, clientes(nome))');
      
      if (aError) throw aError;
      setPendencias(aData || []);

      // Carrega Contratos para o Select
      const { data: cData, error: cError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, clientes(nome)');
      
      if (cError) throw cError;
      setContratos(cData || []);

    } catch (err) {
      console.error("Erro crítico:", err);
      setErroFatal(err.message || "Falha na comunicação com o banco.");
    } finally {
      setLoading(false);
    }
  }

  // Se houver erro de conexão, mostra esta tela em vez de ficar branca
  if (erroFatal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <AlertTriangle size={50} className="text-red-500 mb-4" />
        <h2 className="text-xl font-black uppercase">Erro de Carregamento</h2>
        <p className="text-slate-500 mb-6 text-sm max-w-xs">{erroFatal}</p>
        <button onClick={carregarTudo} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2">
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Carregando Módulo...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <header className="bg-white p-6 border-b flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 italic">
          <Wrench className="text-blue-600" /> Assistência Técnica
        </h1>
        <button onClick={() => setModalNovo(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg">
          + Novo Chamado
        </button>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['pendente', 'aguardando_material', 'agendado', 'concluido'].map(col => (
            <div key={col} className="bg-slate-200/30 p-4 rounded-[2.5rem] border-2 border-dashed border-slate-200 min-h-[500px]">
              <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-6 px-2 italic">{col.replace('_', ' ')}</h2>
              
              {pendencias.filter(p => p.status === col).map(item => (
                <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm mb-4 border border-slate-100">
                  <h3 className="font-black text-slate-800 text-xs uppercase truncate">
                    {/* Uso de ?. para evitar tela branca se o dado estiver incompleto */}
                    {item.contratos?.clientes?.nome || "Cliente não carregado"}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-4 italic">{item.ambiente || "Ambiente Geral"}</p>
                  <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest">
                    Gerenciar
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      {/* MODAL SIMPLIFICADO PARA TESTE */}
      {modalNovo && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative">
            <button onClick={() => setModalNovo(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><X size={28}/></button>
            <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Nova Assistência</h2>
            <div className="space-y-4">
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none"
                value={novoChamado.contrato_id}
                onChange={e => setNovoChamado({...novoChamado, contrato_id: e.target.value})}
              >
                <option value="">Selecione o Contrato...</option>
                {contratos.map(c => (
                  <option key={c.id} value={c.id}>{c.clientes?.nome} ({c.numero_contrato})</option>
                ))}
              </select>
              <input 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none" 
                placeholder="Ambiente"
                value={novoChamado.ambiente}
                onChange={e => setNovoChamado({...novoChamado, ambiente: e.target.value})}
              />
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-32 outline-none" 
                placeholder="Descrição"
                value={novoChamado.descricao}
                onChange={e => setNovoChamado({...novoChamado, descricao: e.target.value})}
              />
              <button 
                onClick={async () => {
                  try {
                    const { error } = await supabase.from('assistencias').insert([{
                      contrato_id: parseInt(novoChamado.contrato_id),
                      ambiente: novoChamado.ambiente,
                      descricao: novoChamado.descricao,
                      status: 'pendente'
                    }]);
                    if (error) throw error;
                    notificar.sucesso("Chamado aberto!");
                    setModalNovo(false);
                    carregarTudo();
                  } catch (e) {
                    notificar.erro("Falha ao salvar no banco.");
                  }
                }}
                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-xl"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}