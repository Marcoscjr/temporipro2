import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Megaphone, Plus, ArrowRight, MessageCircle, Trash2, 
  User, Calendar, X, MapPin, Tag, AlignLeft 
} from 'lucide-react';
import { whatsappLink, masks, notificar } from '../utils';

export default function Marketing() {
  const [leads, setLeads] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  
  // Estados de Modais
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null); // O lead que foi clicado
  
  // Estado do Novo Lead
  const [novoLead, setNovoLead] = useState({ 
    nome: '', telefone: '', origem: 'Instagram',
    interesse: 'Cozinha', interesse_outro: '', 
    indicador_nome: '', observacao: ''
  });
  
  // Configuração Visual das Colunas
  const colunas = [
    { id: 'novo', titulo: 'Novos', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'contato', titulo: 'Em Contato', color: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'orcamento', titulo: 'Orçamento', color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'negociacao', titulo: 'Negociação', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'ganho', titulo: 'Fechado', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  const opcoesInteresse = ['Cozinha', 'Dormitório', 'Apto Completo', 'Casa Completa', 'Corporativo', 'Outros'];

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', {ascending: false});
    setLeads(leadsData || []);
    const { data: parceirosData } = await supabase.from('parceiros').select('*').order('nome', {ascending: true});
    setParceiros(parceirosData || []);
  };

  // --- AÇÕES DO SISTEMA ---
  const salvarLead = async (e) => {
    e.preventDefault();
    let interesseFinal = novoLead.interesse === 'Outros' ? novoLead.interesse_outro : novoLead.interesse;
    
    // Auto-cadastro de parceiro
    if (novoLead.indicador_nome) {
        const existe = parceiros.find(p => p.nome.toLowerCase() === novoLead.indicador_nome.toLowerCase());
        if (!existe) {
            await supabase.from('parceiros').insert([{ nome: novoLead.indicador_nome }]);
            carregarDados();
        }
    }

    const { error } = await supabase.from('leads').insert([{
        nome: novoLead.nome, telefone: novoLead.telefone, origem: novoLead.origem,
        interesse: interesseFinal, indicador_nome: novoLead.indicador_nome,
        observacao: novoLead.observacao, status: 'novo'
    }]);
    
    if (error) notificar.erro(error.message);
    else {
      notificar.sucesso("Lead criado!");
      setNovoLead({ nome: '', telefone: '', origem: 'Instagram', interesse: 'Cozinha', interesse_outro: '', indicador_nome: '', observacao: '' });
      setIsNewLeadOpen(false);
      carregarDados();
    }
  };

  const atualizarObservacao = async (id, novaObs) => {
      // Atualiza estado local e banco sem fechar o modal
      setLeads(leads.map(l => l.id === id ? { ...l, observacao: novaObs } : l));
      if(selectedLead && selectedLead.id === id) setSelectedLead({...selectedLead, observacao: novaObs});
      await supabase.from('leads').update({ observacao: novaObs }).eq('id', id);
  };

  const moverLead = async (lead, direcao) => {
    const ordem = ['novo', 'contato', 'orcamento', 'negociacao', 'ganho'];
    const idx = ordem.indexOf(lead.status);
    const novoStatus = ordem[idx + direcao];
    
    if(novoStatus) {
      const novoLeadState = { ...lead, status: novoStatus };
      setLeads(leads.map(l => l.id === lead.id ? novoLeadState : l));
      if(selectedLead && selectedLead.id === lead.id) setSelectedLead(novoLeadState);
      
      await supabase.from('leads').update({ status: novoStatus }).eq('id', lead.id);
      notificar.sucesso(`Movido para ${novoStatus.toUpperCase()}`);
    }
  };

  const deletarLead = async (id) => {
    if(!window.confirm("Apagar este lead?")) return;
    await supabase.from('leads').delete().eq('id', id);
    setSelectedLead(null);
    carregarDados();
  };

  // --- RENDERIZADORES ---

  // 1. CARD COMPACTO (Aparece na coluna)
  const CardCompacto = ({ lead }) => (
    <div 
        onClick={() => setSelectedLead(lead)}
        className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
    >
        <div className="flex justify-between items-start mb-1">
            <h4 className="font-bold text-slate-700 text-sm truncate pr-2">{lead.nome}</h4>
            {lead.observacao && <div className="w-2 h-2 rounded-full bg-blue-400 mt-1"></div>}
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                {lead.interesse}
            </span>
            {lead.indicador_nome && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 truncate max-w-[80px]">
                    {lead.indicador_nome}
                </span>
            )}
        </div>
        
        <p className="text-[10px] text-slate-400 font-medium">
            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
        </p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-fade-in overflow-hidden">
      {/* HEADER COMPACTO */}
      <div className="h-14 min-h-[56px] bg-white border-b border-slate-200 flex justify-between items-center px-6 shadow-sm z-10">
        <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Megaphone size={18} className="text-blue-600"/> Gestão de Leads
        </h1>
        <button onClick={() => setIsNewLeadOpen(true)} className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex gap-2 hover:bg-slate-700 transition">
            <Plus size={16}/> Novo
        </button>
      </div>

      {/* BOARD (GRID 5 COLUNAS) */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-5 gap-3 h-full">
          {colunas.map(col => {
             const leadsDaColuna = leads.filter(l => l.status === col.id);
             return (
                <div key={col.id} className="flex flex-col h-full rounded-xl bg-slate-100/50 border border-slate-200/60">
                    {/* Header da Coluna */}
                    <div className="p-3 flex justify-between items-center border-b border-slate-200/50 bg-white/50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                            <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wide">{col.titulo}</h3>
                        </div>
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">
                            {leadsDaColuna.length}
                        </span>
                    </div>
                    
                    {/* Área de Scroll dos Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {leadsDaColuna.map(lead => <CardCompacto key={lead.id} lead={lead} />)}
                    </div>
                </div>
             )
          })}
        </div>
      </div>

      {/* --- DRAWER / MODAL DE DETALHES (Onde a mágica acontece) --- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay para fechar */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" onClick={() => setSelectedLead(null)}></div>
            
            {/* Painel Lateral */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-100">
                
                {/* Header do Painel */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white border border-slate-200 text-slate-500`}>
                            {colunas.find(c => c.id === selectedLead.status)?.titulo}
                        </span>
                        <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{selectedLead.nome}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <User size={14}/> {selectedLead.origem}
                        <span className="text-slate-300">|</span>
                        <Calendar size={14}/> {new Date(selectedLead.created_at).toLocaleDateString()}
                    </div>
                </div>

                {/* Conteúdo do Painel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Tags e Info Rápida */}
                    <div className="flex gap-3">
                         <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Interesse</span>
                            <p className="font-bold text-blue-700 text-sm flex items-center gap-1"><Tag size={14}/> {selectedLead.interesse}</p>
                         </div>
                         {selectedLead.indicador_nome && (
                            <div className="flex-1 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                <span className="text-[10px] font-bold text-purple-400 uppercase block mb-1">Indicador</span>
                                <p className="font-bold text-purple-700 text-sm flex items-center gap-1"><User size={14}/> {selectedLead.indicador_nome}</p>
                            </div>
                         )}
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex gap-2">
                        <a 
                            href={whatsappLink(selectedLead.telefone, `Olá ${selectedLead.nome}, tudo bem?`)} 
                            target="_blank" rel="noreferrer"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition"
                        >
                            <MessageCircle size={16}/> Conversar no WhatsApp
                        </a>
                    </div>

                    {/* Observações (Textarea Expandida) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><AlignLeft size={14}/> Notas & Histórico</label>
                        <textarea 
                            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none resize-none transition"
                            placeholder="Escreva aqui detalhes da conversa, medições, preferências..."
                            value={selectedLead.observacao || ''}
                            onChange={(e) => atualizarObservacao(selectedLead.id, e.target.value)}
                        />
                    </div>

                    {/* Controles de Movimentação */}
                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-3">Mover Cartão</p>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <button 
                                onClick={() => moverLead(selectedLead, -1)} 
                                disabled={selectedLead.status === 'novo'}
                                className="p-2 hover:bg-white rounded-lg text-slate-500 hover:shadow-sm disabled:opacity-30 transition"
                            >
                                <ArrowRight size={20} className="rotate-180"/>
                            </button>
                            
                            <span className="font-bold text-slate-700 text-sm uppercase">
                                {colunas.find(c => c.id === selectedLead.status)?.titulo}
                            </span>

                            <button 
                                onClick={() => moverLead(selectedLead, 1)} 
                                disabled={selectedLead.status === 'ganho'}
                                className="p-2 hover:bg-white rounded-lg text-slate-500 hover:shadow-sm disabled:opacity-30 transition"
                            >
                                <ArrowRight size={20}/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Rodapé do Painel */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button onClick={() => deletarLead(selectedLead.id)} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 px-3 py-2 rounded hover:bg-red-50 transition">
                        <Trash2 size={14}/> Excluir Lead
                    </button>
                </div>

            </div>
        </div>
      )}

      {/* MODAL DE NOVO LEAD (Mantido igual, mas com visual limpo) */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-slate-800">Novo Cliente</h2>
                 <button onClick={() => setIsNewLeadOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><X size={18}/></button>
             </div>
             <form onSubmit={salvarLead} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome</label>
                        <input required className="w-full p-2.5 bg-slate-50 border rounded-lg mt-1" value={novoLead.nome} onChange={e=>setNovoLead({...novoLead, nome:e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">WhatsApp</label>
                        <input required className="w-full p-2.5 bg-slate-50 border rounded-lg mt-1" value={novoLead.telefone} onChange={(e) => {masks.celular(e); setNovoLead({...novoLead, telefone:e.target.value})}} maxLength={15} />
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Interesse</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {opcoesInteresse.map(opt => (
                            <button type="button" key={opt} onClick={() => setNovoLead({...novoLead, interesse: opt})}
                                className={`text-xs px-3 py-2 rounded-lg border font-bold transition ${novoLead.interesse === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                 </div>
                 
                 {novoLead.interesse === 'Outros' && (
                     <input className="w-full p-2.5 border rounded-lg" placeholder="Qual ambiente?" value={novoLead.interesse_outro} onChange={e=>setNovoLead({...novoLead, interesse_outro:e.target.value})} />
                 )}

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Indicador</label>
                    <input list="list-parceiros" className="w-full p-2.5 bg-slate-50 border rounded-lg mt-1" placeholder="Nome do parceiro..." value={novoLead.indicador_nome} onChange={e=>setNovoLead({...novoLead, indicador_nome:e.target.value})} />
                    <datalist id="list-parceiros">{parceiros.map(p => <option key={p.id} value={p.nome}/>)}</datalist>
                 </div>

                 <button className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg mt-4">Criar Lead</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}