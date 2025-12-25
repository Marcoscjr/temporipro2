import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  MapPin, Clock, Camera, CheckCircle, Navigation, 
  ArrowRight, LogOut, ChevronLeft, Phone, Play, X, Package
} from 'lucide-react';
import { notificar } from '../utils';
import SignatureCanvas from 'react-signature-canvas';

export default function AreaTecnica() {
  const { user, signOut } = useAuth();
  
  const [tarefas, setTarefas] = useState([]);
  const [tarefaAtiva, setTarefaAtiva] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('pendentes'); 

  const [etapa, setEtapa] = useState('inicio'); 
  const [dadosExecucao, setDadosExecucao] = useState({ fotos_antes: [], fotos_depois: [], obs_tecnica: '' });
  
  const sigCanvas = useRef(null);

  useEffect(() => { 
    if (user) { carregarMinhaAgenda(); } 
  }, [user]);

  const carregarMinhaAgenda = async () => {
    setLoading(true);
    try {
        // Busca apenas serviços agendados para o ID do usuário logado
        const { data, error } = await supabase
          .from('assistencias')
          .select(`*, contratos (numero_contrato, clientes (nome, endereco, numero, cidade, telefone, bairro))`)
          .eq('tecnico_id', user.id)
          .order('data_agendamento', { ascending: true });
        
        if (error) throw error;
        setTarefas(data || []);
    } catch (error) {
        notificar.erro("Erro ao carregar sua agenda.");
    } finally {
        setLoading(false);
    }
  };

  const handleFotoUpload = (e, target) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setDadosExecucao(prev => ({ ...prev, [target]: [...prev[target], reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const finalizarServico = async () => {
    if (sigCanvas.current.isEmpty()) return notificar.erro("Assinatura do cliente é obrigatória.");
    if (dadosExecucao.fotos_depois.length === 0) return notificar.erro("Anexe as fotos do serviço concluído.");

    setLoading(true);
    try {
        const assinatura = sigCanvas.current.getCanvas().toDataURL('image/png');
        const { error } = await supabase
          .from('assistencias')
          .update({
            status: 'concluido',
            checkout_at: new Date().toISOString(),
            fotos_antes: dadosExecucao.fotos_antes,
            fotos_depois: dadosExecucao.fotos_depois,
            observacoes_tecnicas: dadosExecucao.obs_tecnica,
            assinatura_cliente: assinatura
          })
          .eq('id', tarefaAtiva.id);

        if (error) throw error;
        notificar.sucesso("Serviço finalizado com sucesso!");
        setTarefaAtiva(null);
        carregarMinhaAgenda();
    } catch (err) {
        notificar.erro("Erro ao salvar finalização.");
    } finally {
        setLoading(false);
    }
  };

  if (!tarefaAtiva) {
    const lista = tarefas.filter(t => aba === 'pendentes' ? t.status !== 'concluido' : t.status === 'concluido');

    return (
      <div className="min-h-screen bg-slate-50 pb-20 animate-fade-in">
        <div className="bg-slate-900 text-white p-6 pb-12 rounded-b-[3rem] shadow-2xl flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter">Minha Agenda</h1>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Técnico: {user.email.split('@')[0]}</p>
            </div>
            <button onClick={signOut} className="p-3 bg-white/10 rounded-2xl"><LogOut size={20}/></button>
        </div>

        <div className="px-6 -mt-6 space-y-4">
            <div className="flex bg-white p-1 rounded-2xl shadow-md border border-slate-100">
                <button onClick={()=>setAba('pendentes')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${aba==='pendentes'?'bg-slate-900 text-white shadow-lg':'text-slate-400'}`}>PARA HOJE</button>
                <button onClick={()=>setAba('historico')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${aba==='historico'?'bg-slate-900 text-white shadow-lg':'text-slate-400'}`}>HISTÓRICO</button>
            </div>

            {lista.length === 0 ? (
                <div className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhum serviço agendado</div>
            ) : (
                lista.map(t => (
                    <div key={t.id} onClick={() => { setTarefaAtiva(t); setEtapa('inicio'); }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 active:scale-95 transition-all">
                        <div className="flex justify-between mb-4">
                            <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase bg-blue-50 text-blue-600 border border-blue-100 italic">
                                {t.data_agendamento ? new Date(t.data_agendamento).toLocaleDateString() : 'Data não definida'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {t.data_agendamento ? new Date(t.data_agendamento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                        </div>
                        <h3 className="font-black text-slate-900 text-lg leading-tight uppercase">{t.contratos?.clientes?.nome}</h3>
                        <p className="text-xs text-slate-400 font-bold mb-4 flex items-center gap-1"><MapPin size={12}/> {t.contratos?.clientes?.bairro}</p>
                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">#{t.contratos?.numero_contrato} • {t.ambiente}</span>
                            <ArrowRight size={18} className="text-slate-300"/>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-fade-in">
        <header className="bg-white p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
            <button onClick={() => setTarefaAtiva(null)} className="p-2 bg-slate-50 rounded-xl text-slate-400"><ChevronLeft size={24}/></button>
            <span className="font-black text-slate-900 uppercase text-xs">Ordem de Serviço</span>
            <div className="w-10"></div>
        </header>

        <main className="p-6 flex-1 max-w-lg mx-auto w-full space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
                <h2 className="text-2xl font-black tracking-tighter mb-4 leading-tight uppercase">{tarefaAtiva.contratos?.clientes?.nome}</h2>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => window.open(`https://wa.me/55${tarefaAtiva.contratos?.clientes?.telefone?.replace(/\D/g, '')}`)} className="p-4 bg-green-500 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase shadow-lg shadow-green-100 active:scale-95 transition-all"><Phone size={16}/> WhatsApp</button>
                    <button onClick={() => {
                        const c = tarefaAtiva.contratos?.clientes;
                        const end = `${c.endereco}, ${c.numero} - ${c.bairro}, ${c.cidade}`;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
                    }} className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase active:scale-95 shadow-lg transition-all"><Navigation size={16}/> Ver Rota</button>
                </div>
            </div>

            {etapa === 'inicio' ? (
                <div className="space-y-4">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="font-black text-blue-600 mb-4 uppercase text-[10px] tracking-widest border-b border-blue-50 pb-2">Instruções do Serviço:</p>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{tarefaAtiva.descricao}"</p>
                    
                    {tarefaAtiva.fotos_abertura?.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                            {tarefaAtiva.fotos_abertura.map((img, i) => <img key={i} src={img} className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-sm" />)}
                        </div>
                    )}
                  </div>
                  <button onClick={() => { 
                    supabase.from('assistencias').update({ status: 'em_execucao', checkin_at: new Date().toISOString() }).eq('id', tarefaAtiva.id)
                    .then(() => { setTarefaAtiva({...tarefaAtiva, status: 'em_execucao'}); setEtapa('execucao'); });
                  }} className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                      <Play size={28} fill="currentColor"/> INICIAR AGORA
                  </button>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1"><Camera size={14}/> Fotos do Serviço Concluído</label>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            <label className="w-24 h-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 cursor-pointer flex-shrink-0">
                                <X size={32} className="rotate-45"/><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFotoUpload(e, 'fotos_depois')}/>
                            </label>
                            {dadosExecucao.fotos_depois.map((f,i)=><img key={i} src={f} className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-lg flex-shrink-0"/>)}
                        </div>
                    </div>
                    <textarea className="w-full p-6 rounded-[2rem] border border-slate-100 font-bold text-sm h-32 outline-none mt-1 shadow-inner bg-slate-50/50" placeholder="Alguma observação sobre o que foi feito?" value={dadosExecucao.obs_tecnica} onChange={e=>setDadosExecucao({...dadosExecucao, obs_tecnica:e.target.value})}/>
                    
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 text-center shadow-lg">
                        <p className="text-[10px] font-black mb-6 uppercase tracking-[0.2em] text-slate-400 border-b pb-4">Assinatura Digital do Cliente</p>
                        <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden mb-4 touch-none shadow-inner">
                            <SignatureCanvas ref={sigCanvas} penColor="#000" canvasProps={{width: 320, height: 200, className: 'sigCanvas'}} />
                        </div>
                        <button onClick={()=>sigCanvas.current.clear()} className="text-[10px] text-red-500 font-black uppercase tracking-widest underline decoration-2">Limpar e Refazer</button>
                    </div>
                    
                    <button onClick={finalizarServico} disabled={loading} className="w-full py-8 bg-green-600 text-white rounded-[2.5rem] font-black text-xl uppercase shadow-xl shadow-green-100 active:scale-95 transition-all">
                        {loading ? 'Processando...' : 'FINALIZAR E ENVIAR'}
                    </button>
                </div>
            )}
        </main>
    </div>
  );
}