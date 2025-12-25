import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Printer, Calendar, FileText, 
  Wallet, CheckCircle, ChevronDown, 
  XCircle, AlertTriangle, Clock, 
  Ruler, PenTool, Factory, Truck, CheckCircle2,
  HardDrive, Plus, FilePlus, ExternalLink, Image, Trash2, ClipboardCheck,
  HardHat // Adicionado para o relatório
} from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function DadosVenda() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [itensExpandidos, setItensExpandidos] = useState({});

  // ESTADOS DOCUMENTOS
  const [documentos, setDocumentos] = useState([]);
  const [abaDocs, setAbaDocs] = useState('engenharia');
  const [modalDoc, setModalDoc] = useState(false);
  const [novoDoc, setNovoDoc] = useState({ nome: '', url: '', categoria: 'engenharia' });

  // ESTADOS CHECKLIST
  const [checklist, setChecklist] = useState({
    puxadores: false,
    regulagem_portas: false,
    limpeza_interna: false,
    limpeza_externa: false,
    furos_passagem: false,
    silicone_venda: false,
    ferragens_completas: false
  });
  const [obsChecklist, setObsChecklist] = useState('');

  const passosProducao = [
    { id: 'medicao', label: 'Medição', icon: Ruler, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'projeto', label: 'Projeto Final', icon: PenTool, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'fabrica', label: 'Em Fábrica', icon: Factory, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'entrega', label: 'Montagem/Entrega', icon: Truck, color: 'text-green-500', bg: 'bg-green-50' },
    { id: 'concluido', label: 'Concluído', icon: CheckCircle2, color: 'text-slate-600', bg: 'bg-slate-100' }
  ];

  useEffect(() => {
    carregarDadosIniciais();
  }, [id]);

  async function carregarDadosIniciais() {
    try {
        setLoading(true);
        // 1. Dados da Venda
        const { data: vendaData, error } = await supabase.from('contratos').select('*, clientes(*)').eq('id', id).single();
        if (error) throw error;
        
        if (vendaData.condicoes_pagamento && typeof vendaData.condicoes_pagamento === 'string') {
            try { vendaData.condicoes_pagamento = JSON.parse(vendaData.condicoes_pagamento); } catch (e) {}
        }
        setVenda(vendaData);

        // 2. Documentos e Checklist
        await carregarDocumentos();
        await carregarChecklist();

        setLoading(false);
    } catch (err) {
        navigate('/comercial');
    }
  }

  async function carregarDocumentos() {
    const { data } = await supabase.from('documentos_venda').select('*').eq('contrato_id', id).order('created_at', { ascending: false });
    setDocumentos(data || []);
  }

  async function carregarChecklist() {
    const { data } = await supabase.from('checklists_montagem').select('*').eq('contrato_id', id).single();
    if (data) {
        setChecklist(data.itens_concluidos);
        setObsChecklist(data.observacoes || '');
    }
  }

  async function salvarChecklist() {
    const payload = { contrato_id: id, itens_concluidos: checklist, observacoes: obsChecklist };
    const { error } = await supabase.from('checklists_montagem').upsert([payload], { onConflict: 'contrato_id' });
    if (!error) notificar.sucesso("Checklist de montagem salvo!");
    else notificar.erro("Erro ao salvar checklist.");
  }

  async function salvarDocumento() {
    if (!novoDoc.nome || !novoDoc.url) return notificar.erro("Preencha nome e URL");
    const { error } = await supabase.from('documentos_venda').insert([{ ...novoDoc, contrato_id: id }]);
    if (!error) {
      setModalDoc(false);
      setNovoDoc({ nome: '', url: '', categoria: abaDocs });
      carregarDocumentos();
      notificar.sucesso("Documento anexado!");
    }
  }

  async function excluirDoc(docId) {
    if (!window.confirm("Remover este arquivo?")) return;
    await supabase.from('documentos_venda').delete().eq('id', docId);
    carregarDocumentos();
  }

  const atualizarStatusProducao = async (novoStatus) => {
    if (venda.status === 'cancelado') return;
    setUpdating(true);
    try {
        const { error } = await supabase.from('contratos').update({ status_producao: novoStatus }).eq('id', id);
        if (error) throw error;
        setVenda({ ...venda, status_producao: novoStatus });
        notificar.sucesso(`Status atualizado para ${novoStatus.toUpperCase()}`);
    } catch (err) { notificar.erro("Erro ao atualizar status."); } 
    finally { setUpdating(false); }
  };

  const cancelarContrato = async () => {
      if (!window.confirm("ATENÇÃO: Cancelar este contrato é irreversível. Deseja continuar?")) return;
      setLoading(true);
      try {
          await supabase.from('contratos').update({ status: 'cancelado' }).eq('id', id);
          notificar.sucesso("Contrato cancelado.");
          navigate('/comercial');
      } catch (err) { notificar.erro("Erro ao cancelar."); }
      finally { setLoading(false); }
  };

  const toggleItem = (index) => setItensExpandidos(prev => ({ ...prev, [index]: !prev[index] }));

  if (loading) return <div className="text-center py-20 font-black text-slate-400 uppercase animate-pulse">Sincronizando Dados da Venda...</div>;

  const pagamentos = venda.condicoes_pagamento || [];
  const somaItens = venda.itens_venda?.reduce((acc, i) => acc + (i.valor || 0), 0) || 0;
  const currentIndex = passosProducao.findIndex(p => p.id === venda.status_producao);

  return (
    <div className="max-w-7xl mx-auto pb-24 p-6 animate-fade-in font-sans">
       {/* HEADER */}
       <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
              <button onClick={() => navigate('/comercial')} className="flex items-center gap-2 text-slate-400 font-black text-xs mb-4 uppercase tracking-widest"><ArrowLeft size={16}/> Voltar</button>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                  Venda #{venda.numero_contrato || venda.id} {venda.status === 'cancelado' && <span className="text-red-500 text-sm bg-red-100 px-3 py-1 rounded-full font-black">CANCELADA</span>}
              </h1>
              <p className="text-slate-500 font-medium">{venda.clientes?.nome}</p>
          </div>
          <div className="flex gap-3">
              {venda.status !== 'cancelado' && (
                  <>
                  <button onClick={cancelarContrato} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 flex gap-2 transition-all active:scale-95"><XCircle size={18}/> Cancelar</button>
                  <button onClick={() => navigate(`/relatorio-montagem/${venda.id}`)} className="bg-white border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex gap-2 items-center transition-all active:scale-95"><HardHat size={18}/> Relatório Montagem</button>
                  </>
              )}
              <button onClick={() => navigate(`/contrato/${venda.id}`)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex gap-2 items-center transition-all active:scale-95"><Printer size={18}/> Contrato</button>
          </div>
      </div>

      {/* WORKFLOW */}
      {venda.status !== 'cancelado' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2 italic">
                    <Clock size={18} className="text-blue-500"/> Workflow de Produção
                </h3>
                {updating && <span className="text-[10px] font-black text-blue-500 animate-pulse uppercase">Sincronizando...</span>}
            </div>

            <div className="relative flex justify-between items-start px-4">
                <div className="absolute top-6 left-0 w-full h-1 bg-slate-100 -z-0"></div>
                {passosProducao.map((passo, idx) => {
                    const ativo = idx <= currentIndex;
                    const atual = idx === currentIndex;
                    return (
                        <div key={passo.id} onClick={() => atualizarStatusProducao(passo.id)} className="relative z-10 flex flex-col items-center cursor-pointer group w-1/5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${ativo ? `${passo.bg} ${passo.color} shadow-lg scale-110` : 'bg-white border-2 border-slate-100 text-slate-300'} ${atual ? 'ring-4 ring-white ring-offset-2 ring-blue-100' : ''} group-hover:scale-110`}>
                                {idx < currentIndex ? <CheckCircle2 size={24}/> : <passo.icon size={22}/>}
                            </div>
                            <span className={`mt-4 text-[8px] font-black uppercase tracking-widest text-center leading-tight ${ativo ? 'text-slate-800' : 'text-slate-300'}`}>{passo.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* CENTRAL DE DOCUMENTOS */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2 italic">
            <HardDrive size={18} className="text-blue-500"/> Central de Documentos
          </h3>
          <button onClick={() => { setNovoDoc({...novoDoc, categoria: abaDocs}); setModalDoc(true); }} className="bg-blue-600 text-white p-2 rounded-xl shadow-lg"><Plus size={20}/></button>
        </div>
        <div className="flex gap-2 mb-6 bg-slate-50 p-1 rounded-2xl w-fit">
          {[{id: 'engenharia', label: 'Projetos/PDF', icon: <PenTool size={14}/>}, {id: 'checkin', label: 'Check-in Obra', icon: <Ruler size={14}/>}, {id: 'portfolio', label: 'Fotos/Entrega', icon: <Image size={14}/>}].map(aba => (
            <button key={aba.id} onClick={() => setAbaDocs(aba.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${abaDocs === aba.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{aba.icon} {aba.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentos.filter(d => d.categoria === abaDocs).map(doc => (
            <div key={doc.id} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-md transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-white rounded-lg text-blue-500"><FileText size={16}/></div>
                <p className="text-[10px] font-black uppercase truncate text-slate-800">{doc.nome}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 p-1 hover:bg-blue-50 rounded-md"><ExternalLink size={14}/></a>
                <button onClick={() => excluirDoc(doc.id)} className="text-red-400 p-1 hover:bg-red-50 rounded-md"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {documentos.filter(d => d.categoria === abaDocs).length === 0 && (
            <div className="col-span-full py-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center text-[10px] font-black text-slate-300 uppercase italic">Nenhum arquivo nesta pasta</div>
          )}
        </div>
      </div>

      {/* CHECKLIST DE MONTAGEM */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2 italic">
                <ClipboardCheck size={18} className="text-green-500"/> Checklist de Inspeção Técnica
            </h3>
            <button onClick={salvarChecklist} className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Salvar Checklist</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                  {Object.keys(checklist).map((item) => (
                      <label key={item} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                          <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-green-600 focus:ring-green-500" checked={checklist[item]} onChange={e => setChecklist({...checklist, [item]: e.target.checked})}/>
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{item.replace(/_/g, ' ')}</span>
                      </label>
                  ))}
              </div>
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Observações Finais da Obra</label>
                  <textarea className="w-full p-6 bg-slate-50 rounded-[2rem] border-none focus:ring-2 focus:ring-green-500 text-sm font-bold min-h-[200px]" placeholder="Descreva detalhes da finalização ou pendências..." value={obsChecklist} onChange={e => setObsChecklist(e.target.value)}/>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ITENS DO PROJETO */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 text-xl uppercase italic tracking-tighter">Itens do Projeto</h3>
                  <div className="text-right"><span className="text-[10px] font-black text-slate-400 uppercase">Valor Total</span><p className="font-black text-slate-800 text-lg">{BRL(venda.valor_total)}</p></div>
              </div>
              <div className="space-y-4">
                  {venda.itens_venda?.map((item, i) => (
                      <div key={i} className="border border-slate-100 rounded-3xl overflow-hidden">
                          <div onClick={() => toggleItem(i)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all">
                              <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-xl transition-all ${itensExpandidos[i] ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`}><ChevronDown size={18}/></div>
                                  <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.ambiente}</p>
                              </div>
                              <p className="font-black text-slate-700">{BRL(item.valor)}</p>
                          </div>
                          {itensExpandidos[i] && (
                              <div className="bg-slate-50 border-t border-slate-100 p-6 animate-fade-in">
                                  <table className="w-full text-left text-[11px]">
                                      <thead className="text-[9px] uppercase text-slate-400 font-black tracking-widest">
                                          <tr><th className="pb-3">Qtd</th><th className="pb-3">Descrição</th><th className="pb-3 text-right">Unit.</th><th className="pb-3 text-right">Total</th></tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                          {item.detalhes?.map((d, idx) => (
                                              <tr key={idx} className="group hover:bg-white transition-all"><td className="py-3 font-black text-slate-600">{d.quantidade}</td><td className="py-3 font-bold text-slate-700 uppercase">{d.descricao}</td><td className="py-3 text-right text-slate-400">{BRL(d.precoUnit)}</td><td className="py-3 text-right font-black text-slate-800">{BRL(d.quantidade * d.precoUnit)}</td></tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>

          {/* PLANO DE PAGAMENTO */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-fit">
              <h3 className="font-black text-slate-800 text-xl uppercase italic tracking-tighter mb-6 flex items-center gap-2"><Calendar className="text-orange-500"/> Pagamentos</h3>
              <div className="space-y-3">
                  {pagamentos.map((p, i) => (
                      <div key={i} className={`flex flex-col p-4 rounded-2xl border ${p.pago ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <div className="flex justify-between items-center mb-1">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${p.pago ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{p.pago ? 'PAGO' : 'PENDENTE'}</span>
                              <p className="font-black text-slate-400 text-[10px]">{new Date(p.data).toLocaleDateString()}</p>
                          </div>
                          <p className="font-black text-slate-800">{BRL(p.valor)}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">{p.metodo} {p.obs && `(${p.obs})`}</p>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* MODAL DOCUMENTO */}
      {modalDoc && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-scale-up">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase italic">Anexar em {abaDocs.toUpperCase()}</h2>
            <div className="space-y-4">
              <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome do Arquivo" value={novoDoc.nome} onChange={e => setNovoDoc({...novoDoc, nome: e.target.value})}/>
              <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Link (URL)" value={novoDoc.url} onChange={e => setNovoDoc({...novoDoc, url: e.target.value})}/>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalDoc(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Cancelar</button>
                <button onClick={salvarDocumento} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Anexar Arquivo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}