import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Trash2, Plus, X, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { notificar } from '../utils'; 

export default function Assistencia() {
  const { user } = useAuth();
  const [pendencias, setPendencias] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [errorConn, setErrorConn] = useState(false);
  
  const [novoChamado, setNovoChamado] = useState({ contrato_id: '', ambiente: '', descricao: '', fotos: [] });

  useEffect(() => { if (user) inicializar(); }, [user]);

  const inicializar = async () => {
    setLoading(true);
    setErrorConn(false);
    try {
        await Promise.all([carregarDados()]);
    } catch (err) {
        console.error("Erro de conexão detectado:", err);
        setErrorConn(true);
    } finally {
        setLoading(false);
    }
  };

  const carregarDados = async () => {
    try {
        // Buscamos dados com segurança extra
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
    } catch (e) {
        setErrorConn(true);
        throw e;
    }
  };

  const handleCriarChamado = async () => {
    if (!novoChamado.contrato_id || !novoChamado.descricao) return notificar.erro("Preencha os campos obrigatórios!");
    setSalvando(true);
    try {
        const { error } = await supabase.from('assistencias').insert([{
            contrato_id: parseInt(novoChamado.contrato_id),
            ambiente: novoChamado.ambiente,
            descricao: novoChamado.descricao,
            fotos_abertura: novoChamado.fotos,
            status: 'pendente'
        }]);
        if (error) throw error;
        notificar.sucesso("Ocorrência aberta!");
        setModalNovo(false);
        setNovoChamado({ contrato_id: '', ambiente: '', descricao: '', fotos: [] });
        inicializar();
    } catch (err) {
        notificar.erro("Erro ao salvar. Verifique sua conexão.");
    } finally { setSalvando(false); }
  };

  // TELA DE CARREGAMENTO BLINDADA
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-black text-slate-400 text-xs uppercase tracking-widest text-center px-4">
            Sincronizando com Tempori Pro...
        </p>
    </div>
  );

  // TELA DE ERRO DE CONEXÃO (EVITA TELA BRANCA)
  if (errorConn) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertTriangle className="text-orange-500 mb-4" size={60} />
        <h2 className="text-2xl font-black uppercase mb-2">Falha na Conexão</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            O navegador bloqueou o acesso ao banco de dados por segurança (CORS) ou sua internet oscilou.
        </p>
        <button 
            onClick={() => window.location.reload()} 
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-slate-800 transition-all mx-auto"
        >
            <RefreshCw size={16}/> Tentar Reconectar
        </button>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
        <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 flex justify-between items-center shadow-sm">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 italic uppercase tracking-tighter">
                <Wrench className="text-blue-600" /> Assistências
            </h1>
            <button onClick={() => setModalNovo(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                <Plus size={16}/> Nova Assistência
            </button>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[1000px]">
                {['pendente', 'aguardando_material', 'agendado', 'concluido'].map(col => (
                    <div key={col} className="bg-slate-200/20 p-4 rounded-[2.5rem] border border-dashed border-slate-200 min-h-[600px]">
                        <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-6 px-4 italic border-b border-slate-200 pb-2">{col.replace('_', ' ')}</h2>
                        {pendencias?.filter(p => p.status === col).map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm mb-4 border border-slate-100 hover:shadow-md transition-all">
                                <h3 className="font-black text-slate-800 text-xs uppercase truncate mb-1">
                                    {item.contratos?.clientes?.nome || "Cliente Externo"}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mb-4 italic leading-tight">
                                    {item.ambiente || "Geral"}
                                </p>
                                <button className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
                                    Gerenciar
                                </button>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </main>

        {/* MODAL NOVO CHAMADO */}
        {modalNovo && (
            <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl animate-in zoom-in-95 duration-200">
                    <button onClick={() => setModalNovo(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={28}/></button>
                    <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Nova Ocorrência</h2>
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Vínculo com Contrato</label>
                            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={novoChamado.contrato_id} onChange={e => setNovoChamado({...novoChamado, contrato_id: e.target.value})}>
                                <option value="">Selecione o Cliente / Contrato...</option>
                                {contratos?.map(c => <option key={c.id} value={c.id}>{c.clientes?.nome} (Contrato: {c.numero_contrato})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Ambiente</label>
                            <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Ex: Cozinha, Suíte..." value={novoChamado.ambiente} onChange={e => setNovoChamado({...novoChamado, ambiente: e.target.value})}/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Relato do Problema</label>
                            <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-32 outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none" placeholder="Descreva os detalhes da assistência..." value={novoChamado.descricao} onChange={e => setNovoChamado({...novoChamado, descricao: e.target.value})}/>
                        </div>
                        <button onClick={handleCriarChamado} disabled={salvando} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-xl flex justify-center items-center gap-3 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {salvando ? <Loader2 className="animate-spin" size={20}/> : "Registrar Assistência"}
                        </button>
                    </div>
                </div>
            </div>
        ) }
    </div>
  );
}