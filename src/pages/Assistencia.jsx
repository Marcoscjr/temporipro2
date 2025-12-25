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
  const [erroDeConexao, setErroDeConexao] = useState(false);
  
  const [novoChamado, setNovoChamado] = useState({ contrato_id: '', ambiente: '', descricao: '' });

  useEffect(() => {
    if (user) carregarDadosSeguro();
  }, [user]);

  async function carregarDadosSeguro() {
    setLoading(true);
    setErroDeConexao(false);
    try {
      // Carregamento com tratamento de erro individual para evitar crash total
      const fetchAssistencias = supabase
        .from('assistencias')
        .select('*, contratos(numero_contrato, clientes(nome))')
        .then(({ data, error }) => { if (error) throw error; return data; });

      const fetchContratos = supabase
        .from('contratos')
        .select('id, numero_contrato, clientes(nome)')
        .then(({ data, error }) => { if (error) throw error; return data; });

      const [aData, cData] = await Promise.all([fetchAssistencias, fetchContratos]);
      
      setPendencias(aData || []);
      setContratos(cData || []);
    } catch (err) {
      console.error("Erro na comunicação com Supabase:", err);
      setErroDeConexao(true);
    } finally {
      setLoading(false);
    }
  }

  // TELA DE ERRO AMIGÁVEL (IMPEDE A TELA BRANCA)
  if (erroDeConexao) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <AlertTriangle size={50} className="text-orange-500 mb-4" />
        <h2 className="text-xl font-black uppercase text-slate-800">Conexão Bloqueada ou Falhou</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm max-w-xs">
          O navegador não conseguiu falar com o banco de dados. Verifique se o endereço <strong>temporipro2.vercel.app</strong> está autorizado no Supabase (CORS).
        </p>
        <button onClick={carregarDadosSeguro} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2">
          <RefreshCw size={16} /> Tentar Reconectar
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Sincronizando Assistências...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <header className="bg-white p-6 border-b flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 italic text-slate-900">
          <Wrench className="text-blue-600" /> Assistência Técnica
        </h1>
        <button onClick={() => setModalNovo(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
          + Novo Chamado
        </button>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['pendente', 'aguardando_material', 'agendado', 'concluido'].map(col => (
            <div key={col} className="bg-slate-200/30 p-4 rounded-[2.5rem] border-2 border-dashed border-slate-200 min-h-[500px]">
              <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-6 px-2 italic text-center">{col.replace('_', ' ')}</h2>
              
              {(pendencias || []).filter(p => p.status === col).map(item => (
                <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm mb-4 border border-slate-100 hover:shadow-md transition-shadow">
                  <h3 className="font-black text-slate-800 text-xs uppercase truncate">
                    {/* Proteção extra para objetos aninhados */}
                    {item.contratos?.clientes?.nome || "Cliente não vinculado"}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-4 italic leading-tight">
                    {item.ambiente || "Geral"}
                  </p>
                  <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
                    Gerenciar
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      {/* MODAL SIMPLIFICADO PARA EVITAR ERROS */}
      {modalNovo && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setModalNovo(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={28}/></button>
            <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Nova Assistência</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Contrato</label>
                <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none"
                    value={novoChamado.contrato_id}
                    onChange={e => setNovoChamado({...novoChamado, contrato_id: e.target.value})}
                >
                    <option value="">Selecione...</option>
                    {contratos?.map(c => (
                    <option key={c.id} value={c.id}>{c.clientes?.nome} ({c.numero_contrato})</option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Ambiente</label>
                <input 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none" 
                    placeholder="Ex: Cozinha"
                    value={novoChamado.ambiente}
                    onChange={e => setNovoChamado({...novoChamado, ambiente: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Descrição</label>
                <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-32 outline-none resize-none" 
                    placeholder="Detalhes do problema..."
                    value={novoChamado.descricao}
                    onChange={e => setNovoChamado({...novoChamado, descricao: e.target.value})}
                />
              </div>
              <button 
                onClick={async () => {
                    if (!novoChamado.contrato_id || !novoChamado.descricao) return notificar.erro("Preencha os campos!");
                    try {
                        const { error } = await supabase.from('assistencias').insert([{
                            contrato_id: parseInt(novoChamado.contrato_id),
                            ambiente: novoChamado.ambiente,
                            descricao: novoChamado.descricao,
                            status: 'pendente'
                        }]);
                        if (error) throw error;
                        notificar.sucesso("Ocorrência aberta!");
                        setModalNovo(false);
                        carregarDadosSeguro();
                    } catch (e) {
                        notificar.erro("Erro ao salvar. Verifique conexão.");
                    }
                }}
                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
              >
                Registrar Assistência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}