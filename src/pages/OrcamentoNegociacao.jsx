import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Trash2, Plus, X, Loader2, AlertTriangle, RefreshCw, LayoutGrid, Package } from 'lucide-react';
import { notificar } from '../utils'; 

export default function Assistencia() {
  const { user } = useAuth();
  const [pendencias, setPendencias] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [errorConn, setErrorConn] = useState(false);
  const [view, setView] = useState('kanban');
  
  const [novoChamado, setNovoChamado] = useState({ contrato_id: '', ambiente: '', descricao: '', fotos: [] });

  useEffect(() => { 
    if (user) inicializar(); 
    // eslint-disable-next-line
  }, [user]);

  const inicializar = async () => {
    setLoading(true);
    setErrorConn(false);
    try {
        const { data: aData, error: aError } = await supabase
            .from('assistencias')
            .select('*, contratos(numero_contrato, clientes(nome))')
            .order('created_at', { ascending: false });
        
        if (aError) throw aError;
        setPendencias(aData || []);

        const { data: cData, error: cError } = await supabase
            .from('contratos')
            .select('id, numero_contrato, clientes(nome)');
        
        if (cError) throw cError;
        setContratos(cData || []);
    } catch (err) {
        console.error("Erro de conexão:", err);
        setErrorConn(true);
    } finally {
        setLoading(false);
    }
  };

  const handleCriarChamado = async () => {
    if (!novoChamado.contrato_id || !novoChamado.descricao) return notificar.erro("Campos obrigatórios!");
    setSalvando(true);
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
        setNovoChamado({ contrato_id: '', ambiente: '', descricao: '', fotos: [] });
        inicializar();
    } catch (err) {
        notificar.erro("Erro ao salvar. Verifique o console.");
    } finally { setSalvando(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Sincronizando Dados...</p>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
        <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 flex justify-between items-center shadow-sm">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 italic uppercase tracking-tighter">
                <Wrench className="text-blue-600" /> Assistências
            </h1>
            
            <div className="flex items-center gap-3">
                {errorConn && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase animate-pulse">
                        <AlertTriangle size={14}/> Erro de Conexão
                    </div>
                )}
                <button onClick={() => setModalNovo(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2">
                    <Plus size={16}/> Novo
                </button>
            </div>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
            {errorConn && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between">
                    <p className="text-[11px] font-bold text-orange-700 uppercase italic">Aviso: O sistema não conseguiu carregar dados recentes devido a um erro de CORS/Rede.</p>
                    <button onClick={inicializar} className="bg-orange-600 text-white p-2 rounded-lg"><RefreshCw size={16}/></button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[1000px]">
                {['pendente', 'aguardando_material', 'agendado', 'concluido'].map(col => (
                    <div key={col} className="bg-slate-200/20 p-4 rounded-[2.5rem] border border-dashed border-slate-200 min-h-[600px]">
                        <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-6 px-4 italic">{col.replace('_', ' ')}</h2>
                        {pendencias?.filter(p => p.status === col).map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm mb-4 border border-slate-100">
                                <h3 className="font-black text-slate-800 text-xs uppercase truncate mb-1">
                                    {item.contratos?.clientes?.nome || "Cliente Externo"}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mb-4 italic">{item.ambiente || "Geral"}</p>
                                <button className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase">Gerenciar</button>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </main>

        {modalNovo && (
            <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl">
                    <button onClick={() => setModalNovo(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><X size={28}/></button>
                    <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Nova Ocorrência</h2>
                    <div className="space-y-5">
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none" value={novoChamado.contrato_id} onChange={e => setNovoChamado({...novoChamado, contrato_id: e.target.value})}>
                            <option value="">Selecione o Contrato...</option>
                            {contratos?.map(c => <option key={c.id} value={c.id}>{c.clientes?.nome} ({c.numero_contrato})</option>)}
                        </select>
                        <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none" placeholder="Ambiente" value={novoChamado.ambiente} onChange={e => setNovoChamado({...novoChamado, ambiente: e.target.value})}/>
                        <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-32 outline-none resize-none" placeholder="Descrição..." value={novoChamado.descricao} onChange={e => setNovoChamado({...novoChamado, descricao: e.target.value})}/>
                        <button onClick={handleCriarChamado} disabled={salvando} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-xl flex justify-center items-center gap-3">
                            {salvando ? <Loader2 className="animate-spin" size={20}/> : "Abrir Chamado"}
                        </button>
                    </div>
                </div>
            </div>
        ) }
    </div>
  );
}