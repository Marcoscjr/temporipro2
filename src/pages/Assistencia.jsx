import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  RefreshCw, CheckCircle, AlertCircle, Wrench, Building, Trash2, 
  Calendar, Clock, MessageCircle, FileText, Search, X, 
  Package, Plus, Camera, UserCheck, Maximize2, CalendarX, Truck, Box, Check, 
  Factory, LayoutGrid, ClipboardList, ArrowRight
} from 'lucide-react';
import { notificar } from '../utils'; 

export default function Assistencia() {
  const { user } = useAuth();
  
  const [pendencias, setPendencias] = useState([]);
  const [tecnicos, setTecnicos] = useState([]); 
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [view, setView] = useState('kanban'); // 'kanban' ou 'materiais'
  const [modalNovo, setModalNovo] = useState(false);
  const [modalTriagem, setModalTriagem] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [fotoZoom, setFotoZoom] = useState(null);
  
  const [novoChamado, setNovoChamado] = useState({ contrato_id: '', ambiente: '', descricao: '', fotos: [] });
  const [triagemDados, setTriagemDados] = useState({
    precisa_material: false, origem_material: 'deposito', material_disponivel: false, 
    pecas_necessarias: '', obs_administrativa: '', tecnico_id: '', data_agendamento: ''
  });

  useEffect(() => { if (user) { inicializar(); } }, [user]);

  const inicializar = async () => {
    setLoading(true);
    await Promise.all([carregarDados(), carregarTecnicos()]);
    setLoading(false);
  };

  const carregarDados = async () => {
    try {
      const { data: contData } = await supabase.from('contratos').select('id, numero_contrato, clientes(nome)').order('numero_contrato', { ascending: false });
      setContratos(contData || []);

      const { data: assistData, error } = await supabase
        .from('assistencias')
        .select(`
          id, created_at, status, ambiente, descricao, fotos_abertura, 
          precisa_material, origem_material, material_disponivel, 
          pecas_necessarias, obs_administrativa, tecnico_id, data_agendamento,
          contratos(numero_contrato, clientes(nome))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendencias(assistData || []);
    } catch (err) { console.error(err); }
  };

  const carregarTecnicos = async () => {
    try {
      const { data } = await supabase.from('perfis').select('*');
      const filtrados = (data || [])
        .filter(t => t.cargo?.toLowerCase() === 'montador')
        .map(t => ({ id: t.id, full_name: t.nome || t.full_name || t.email?.split('@')[0] }));
      setTecnicos(filtrados);
    } catch (err) { console.error(err); }
  };

  const alternarDisponibilidade = async (item, statusAtual) => {
    try {
      const novoStatusMaterial = !statusAtual;
      let novoStatusFluxo = item.status;

      if (novoStatusMaterial === true) {
          novoStatusFluxo = (item.tecnico_id && item.data_agendamento) ? 'agendado' : 'pendente';
      } else {
          if (item.precisa_material) novoStatusFluxo = 'aguardando_material';
      }

      const { error } = await supabase
        .from('assistencias')
        .update({ 
            material_disponivel: novoStatusMaterial,
            status: novoStatusFluxo 
        })
        .eq('id', item.id);

      if (error) throw error;
      notificar.sucesso(novoStatusMaterial ? "Material disponível! Chamado atualizado." : "Material marcado como pendente.");
      carregarDados();
    } catch (err) { notificar.erro("Erro ao atualizar status."); }
  };

  const salvarTriagemEAgendamento = async () => {
    const isAgendado = itemSelecionado.status === 'agendado';
    
    let novoStatus = itemSelecionado.status;
    if (isAgendado) {
        novoStatus = 'concluido';
    } else {
        if (triagemDados.precisa_material && !triagemDados.material_disponivel) {
            novoStatus = 'aguardando_material';
        } else if (triagemDados.tecnico_id && triagemDados.data_agendamento) {
            novoStatus = 'agendado';
        } else {
            novoStatus = 'pendente';
        }
    }

    setLoading(true);
    try {
        const { error } = await supabase.from('assistencias').update({
            tecnico_id: triagemDados.tecnico_id || null,
            data_agendamento: triagemDados.data_agendamento || null,
            precisa_material: triagemDados.precisa_material,
            origem_material: triagemDados.origem_material,
            material_disponivel: triagemDados.material_disponivel,
            pecas_necessarias: triagemDados.pecas_necessarias,
            obs_administrativa: triagemDados.obs_administrativa,
            status: novoStatus
        }).eq('id', itemSelecionado.id);
        if (error) throw error;
        notificar.sucesso("Dados atualizados com sucesso!");
        setModalTriagem(false);
        carregarDados();
    } catch (err) { notificar.erro("Erro ao salvar dados."); }
    finally { setLoading(false); }
  };

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm mb-3 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
            <span className={`text-[8px] w-fit font-black px-2 py-0.5 rounded-md uppercase ${
                item.status === 'concluido' ? 'bg-green-50 text-green-600' :
                item.status === 'agendado' ? 'bg-blue-50 text-blue-600' : 
                (item.status === 'aguardando_material' && item.material_disponivel) || item.status === 'pendente' 
                ? 'bg-red-50 text-red-600' 
                : 'bg-orange-50 text-orange-600'
            }`}>
                {(item.status === 'aguardando_material' && item.material_disponivel) ? 'LIBERADO' : item.status.replace('_', ' ')}
            </span>
            
            {item.material_disponivel && item.status !== 'concluido' && (
                <span className="flex items-center gap-1 text-[7px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    <Check size={8}/> PRONTO P/ AGENDAR
                </span>
            )}
        </div>
        <button onClick={() => {if(confirm("Excluir chamado?")) supabase.from('assistencias').delete().eq('id', item.id).then(carregarDados)}} className="text-slate-200 hover:text-red-500"><Trash2 size={13}/></button>
      </div>
      <h3 className="font-black text-slate-800 text-xs uppercase truncate leading-tight">{item.contratos?.clientes?.nome}</h3>
      <p className="text-[9px] text-slate-400 font-bold mb-3 uppercase italic">{item.ambiente}</p>
      <button onClick={() => abrirGerenciamento(item)} className="w-full py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">Gerenciar</button>
    </div>
  );

  const abrirGerenciamento = (item) => {
    setItemSelecionado(item);
    setTriagemDados({
      precisa_material: item.precisa_material || false,
      origem_material: item.origem_material || 'deposito',
      material_disponivel: item.material_disponivel || false,
      pecas_necessarias: item.pecas_necessarias || '',
      obs_administrativa: item.obs_administrativa || '',
      tecnico_id: item.tecnico_id || '',
      data_agendamento: item.data_agendamento ? item.data_agendamento.slice(0, 16) : ''
    });
    setModalTriagem(true);
  };

  // FUNÇÃO DE SALVAMENTO CORRIGIDA
  const handleCriarChamado = async () => {
      if (!novoChamado.contrato_id || !novoChamado.descricao) {
          return notificar.erro("Preencha contrato e descrição!");
      }

      setLoading(true);
      try {
          // Preparamos o objeto exatamente como o banco espera
          const dadosParaEnviar = {
              contrato_id: novoChamado.contrato_id,
              ambiente: novoChamado.ambiente,
              descricao: novoChamado.descricao,
              fotos_abertura: novoChamado.fotos, // Mapeia o array de base64 para a coluna correta
              status: 'pendente'
          };

          const { error } = await supabase
              .from('assistencias')
              .insert([dadosParaEnviar]);

          if (error) throw error;

          notificar.sucesso("Ocorrência aberta!");
          setModalNovo(false);
          setNovoChamado({ contrato_id: '', ambiente: '', descricao: '', fotos: [] });
          carregarDados();
      } catch (err) {
          console.error(err);
          notificar.erro("Erro ao abrir assistência técnica.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 italic uppercase tracking-tighter">
                <Wrench className="text-blue-600" /> Assistências
            </h1>
            
            <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button onClick={() => setView('kanban')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${view === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                        <LayoutGrid size={14}/> Kanban
                    </button>
                    <button onClick={() => setView('materiais')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${view === 'materiais' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>
                        <Package size={14}/> Materiais Pendentes
                    </button>
                </div>
                <button onClick={() => setModalNovo(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={16}/> Novo Chamado
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-x-auto">
        {view === 'kanban' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start min-w-[1000px]">
            {['pendente', 'aguardando_material', 'agendado', 'concluido'].map(col => (
                <div key={col} className="w-full">
                    <h2 className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em] mb-3 flex items-center justify-between px-2 italic">
                        {col.replace('_', ' ')} 
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{pendencias.filter(i => i.status === col).length}</span>
                    </h2>
                    <div className="bg-slate-200/20 p-2 rounded-[2rem] border border-dashed border-slate-200 min-h-[500px]">
                        {pendencias.filter(p => p.status === col && (!busca || p.contratos?.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()))).map(renderCard)}
                    </div>
                </div>
            ))}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2">
                      <ClipboardList className="text-orange-500"/> Materiais em Aquisição
                  </h2>
                  <span className="bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {pendencias.filter(p => p.precisa_material && !p.material_disponivel).length} Aguardando
                  </span>
              </div>
              
              <div className="grid gap-4">
                  {pendencias.filter(p => p.precisa_material && p.status !== 'concluido').map(item => (
                      <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                  {item.origem_material === 'fabrica' ? <Factory size={14} className="text-purple-500"/> : <Box size={14} className="text-blue-500"/>}
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.origem_material}</span>
                              </div>
                              <h4 className="font-black text-slate-800 uppercase text-sm">{item.contratos?.clientes?.nome}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Ambiente: {item.ambiente}</p>
                              <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 italic text-xs font-bold text-slate-600">
                                  "{item.pecas_necessarias}"
                              </div>
                          </div>
                          
                          <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                              <button 
                                onClick={() => alternarDisponibilidade(item, item.material_disponivel)}
                                className={`w-full md:w-48 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    item.material_disponivel ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                                }`}
                              >
                                  {item.material_disponivel ? <><Check size={14} className="inline mr-1"/> Disponível</> : 'Marcar como Chegou'}
                              </button>
                              <button onClick={() => abrirGerenciamento(item)} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-900 flex items-center gap-1 group">
                                  Ver Detalhes <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        )}
      </main>

      {modalTriagem && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setModalTriagem(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X size={24}/></button>
                <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter italic">
                    {itemSelecionado.status === 'agendado' ? 'Concluir Serviço' : 'Gerenciar Assistência'}
                </h2>
                
                <div className="space-y-5">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                            {(itemSelecionado.fotos_abertura || []).map((f, i) => (
                                <img key={i} src={f} onClick={() => setFotoZoom(f)} className="w-16 h-16 rounded-xl object-cover cursor-zoom-in hover:opacity-80 transition-opacity" />
                            ))}
                        </div>
                        <p className="font-bold text-slate-600 text-[11px] italic leading-relaxed">"{itemSelecionado.descricao}"</p>
                    </div>

                    <div className="flex items-center gap-3 p-2">
                        <input type="checkbox" id="mat" className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer" checked={triagemDados.precisa_material} onChange={e => setTriagemDados({...triagemDados, precisa_material: e.target.checked})} />
                        <label htmlFor="mat" className="text-xs font-black uppercase italic cursor-pointer">Precisa de Material?</label>
                    </div>

                    {triagemDados.precisa_material && (
                        <div className="bg-orange-50 p-5 rounded-3xl border border-orange-100 space-y-4 animate-in slide-in-from-top-2">
                            <textarea className="w-full p-3 bg-white rounded-xl font-bold text-[11px] h-16 outline-none focus:ring-2 focus:ring-orange-200" placeholder="Quais peças são necessárias?" value={triagemDados.pecas_necessarias} onChange={e => setTriagemDados({...triagemDados, pecas_necessarias: e.target.value})}/>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setTriagemDados({...triagemDados, origem_material:'deposito'})} className={`py-2.5 rounded-xl font-black text-[9px] uppercase border transition-all ${triagemDados.origem_material === 'deposito' ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-orange-400 border-orange-100'}`}>Depósito</button>
                                <button type="button" onClick={() => setTriagemDados({...triagemDados, origem_material:'fabrica'})} className={`py-2.5 rounded-xl font-black text-[9px] uppercase border transition-all ${triagemDados.origem_material === 'fabrica' ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-orange-400'}`}>Fábrica</button>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-orange-100">
                                <input type="checkbox" id="disp" className="w-4 h-4 accent-green-600 cursor-pointer" checked={triagemDados.material_disponivel} onChange={e => setTriagemDados({...triagemDados, material_disponivel: e.target.checked})} />
                                <label htmlFor="disp" className="text-[9px] font-black uppercase cursor-pointer">Material já está disponível?</label>
                            </div>
                        </div>
                    )}

                    <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-20 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Observações internas / Administrativas..." value={triagemDados.obs_administrativa} onChange={e => setTriagemDados({...triagemDados, obs_administrativa: e.target.value})}/>

                    <div className={`p-6 rounded-[2rem] border-2 transition-all ${(!triagemDados.precisa_material || triagemDados.material_disponivel || itemSelecionado.status === 'agendado') ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-40 pointer-events-none grayscale'}`}>
                        <h3 className="font-black text-blue-700 text-[10px] uppercase mb-4 italic flex items-center gap-2"><UserCheck size={14}/> Agendamento com Profissional</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <select className="p-3 bg-white rounded-xl font-bold text-xs outline-none border border-blue-100" value={triagemDados.tecnico_id} onChange={e => setTriagemDados({...triagemDados, tecnico_id: e.target.value})}>
                                <option value="">Escolher Montador...</option>
                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                            </select>
                            <input type="datetime-local" className="p-3 bg-white rounded-xl font-bold text-xs outline-none border border-blue-100" value={triagemDados.data_agendamento} onChange={e => setTriagemDados({...triagemDados, data_agendamento: e.target.value})} />
                        </div>
                    </div>

                    <button onClick={salvarTriagemEAgendamento} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl transition-all active:scale-95 ${itemSelecionado.status === 'agendado' ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>
                        {itemSelecionado.status === 'agendado' ? 'Finalizar e Concluir Assistência' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {fotoZoom && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setFotoZoom(null)}>
            <img src={fotoZoom} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}

      {modalNovo && (
          <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-2xl">
                  <button onClick={() => setModalNovo(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X size={24}/></button>
                  <h2 className="text-xl font-black text-slate-900 mb-6 uppercase italic tracking-tighter">Nova Ocorrência</h2>
                  <div className="space-y-4">
                      <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs" value={novoChamado.contrato_id} onChange={e => setNovoChamado({...novoChamado, contrato_id: e.target.value})}>
                          <option value="">Selecione o Contrato...</option>
                          {contratos.map(c => <option key={c.id} value={c.id}>{c.clientes?.nome} (Contrato: {c.numero_contrato})</option>)}
                      </select>
                      <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs" placeholder="Ambiente" value={novoChamado.ambiente} onChange={e => setNovoChamado({...novoChamado, ambiente: e.target.value})}/>
                      <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-24" placeholder="Descrição" value={novoChamado.descricao} onChange={e => setNovoChamado({...novoChamado, descricao: e.target.value})}/>
                      <div className="p-4 border-2 border-dashed border-blue-200 rounded-2xl text-center bg-blue-50/30">
                          <input type="file" multiple accept="image/*" className="hidden" id="f-add" onChange={(e) => {
                              const files = Array.from(e.target.files);
                              files.forEach(file => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => setNovoChamado(prev => ({...prev, fotos: [...prev.fotos, reader.result]}));
                                  reader.readAsDataURL(file);
                              });
                          }}/>
                          <label htmlFor="f-add" className="cursor-pointer text-blue-600 font-black text-[9px] uppercase flex flex-col items-center gap-2"><Camera size={24}/> Anexar Fotos ({novoChamado.fotos.length})</label>
                      </div>
                      <button onClick={handleCriarChamado} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest active:scale-95 transition-all">Abrir Assistência</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}