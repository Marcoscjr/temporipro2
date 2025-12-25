import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Upload, ArrowRight, DollarSign, FileCode, Users, 
  Search, Plus, Trash2, LayoutGrid, CheckSquare, Square, List, X, AlertCircle,
  ArrowUp, ArrowDown, Save, Loader2
} from 'lucide-react';
import { notificar, BRL } from '../utils';
import { lerXMLPromob } from '../utils/promobParser';

export default function OrcamentoInterno() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  
  // --- ESTADOS GERAIS ---
  const [clientes, setClientes] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [config, setConfig] = useState({ markup_padrao: 0 });
  
  // --- FORMULÁRIO ---
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [parceiroSelecionado, setParceiroSelecionado] = useState('');
  const [comissaoIndicador, setComissaoIndicador] = useState(0);
  const [itens, setItens] = useState([]);
  const [loadingXML, setLoadingXML] = useState(false);
  const [idOrcamentoAtual, setIdOrcamentoAtual] = useState(null);
  
  // --- MODAL DETALHES (SUB-ITENS) ---
  const [itemDetalhe, setItemDetalhe] = useState(null);
  const [novoSubItem, setNovoSubItem] = useState({ quantidade: 1, descricao: '', valor: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'descricao', direction: 'asc' });
  
  // --- ITEM MANUAL (AMBIENTE) ---
  const [novoItem, setNovoItem] = useState({ ambiente: '', valor: '' });

  // --- MODAIS DE CADASTRO RÁPIDO ---
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [novoClienteData, setNovoClienteData] = useState({ nome: '', telefone: '' });
  const [modalNovoParceiro, setModalNovoParceiro] = useState(false);
  const [novoParceiroData, setNovoParceiroData] = useState({ nome: '', comissao: 10 });
  const [loadingCadastro, setLoadingCadastro] = useState(false);

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const { data: clis } = await supabase.from('clientes').select('id, nome').order('nome');
    setClientes(clis || []);
    const { data: parcs } = await supabase.from('parceiros').select('*').order('nome');
    setParceiros(parcs || []);
    const { data: cfg } = await supabase.from('configuracoes').select('*').single();
    if(cfg) setConfig(cfg);

    // RECUPERAÇÃO DE ESTADO (Volta da Negociação ou Edição)
    if (state?.orcamento) {
        const d = state.orcamento;
        setIdOrcamentoAtual(d.idOrcamento || null);
        setClienteSelecionado(d.clienteId || '');
        setParceiroSelecionado(d.parceiroId || '');
        setComissaoIndicador(d.comissaoIndicador || 0);
        if (d.itens) setItens(d.itens);
    } 
    // Integração CRM
    else if (state?.preenchimentoAutomatico) {
        const dadosCRM = state.preenchimentoAutomatico;
        if (dadosCRM.cliente) {
            const clienteExistente = clis?.find(c => c.nome.toLowerCase().trim() === dadosCRM.cliente.toLowerCase().trim());
            if (clienteExistente) setClienteSelecionado(clienteExistente.id);
            else { setNovoClienteData({ nome: dadosCRM.cliente, telefone: dadosCRM.telefone || '' }); setModalNovoCliente(true); }
        }
        if (dadosCRM.ambiente) {
            setItens([{ id: Date.now(), ambiente: dadosCRM.ambiente, descricao: dadosCRM.obs || 'Lead CRM', valor: 0, valorOriginal: 0, detalhes: [], selecionado: true }]);
        }
    }
  };

  const salvarNovoCliente = async () => {
      if(!novoClienteData.nome || !novoClienteData.telefone) return notificar.erro("Nome e Telefone obrigatórios.");
      setLoadingCadastro(true);
      const { data, error } = await supabase.from('clientes').insert([{ nome: novoClienteData.nome, telefone: novoClienteData.telefone }]).select().single();
      setLoadingCadastro(false);
      if(!error) { setClientes([...clientes, data].sort((a,b) => a.nome.localeCompare(b.nome))); setClienteSelecionado(data.id); setModalNovoCliente(false); }
  };

  const salvarNovoParceiro = async () => {
      if(!novoParceiroData.nome) return notificar.erro("Nome obrigatório.");
      setLoadingCadastro(true);
      const { data, error } = await supabase.from('parceiros').insert([{ nome: novoParceiroData.nome, comissao_padrao: novoParceiroData.comissao }]).select().single();
      setLoadingCadastro(false);
      if(!error) { setParceiros([...parceiros, data].sort((a,b) => a.nome.localeCompare(b.nome))); setParceiroSelecionado(data.id); setComissaoIndicador(data.comissao_padrao); setModalNovoParceiro(false); }
  };

  const handleSelectParceiro = (id) => {
      setParceiroSelecionado(id);
      const p = parceiros.find(x => x.id == id);
      setComissaoIndicador(p ? p.comissao_padrao : 0);
  };

  const handleImportXML = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setLoadingXML(true);
      try {
          const itensImportados = await lerXMLPromob(file);
          const itensComMarkup = itensImportados.map(i => ({ ...i, valorOriginal: i.valor, valor: i.valor * (1 + (config.markup_padrao / 100)), selecionado: true }));
          setItens([...itens, ...itensComMarkup]);
          notificar.sucesso(`${itensImportados.length} ambientes importados!`);
      } catch (err) { notificar.erro(err); } finally { setLoadingXML(false); }
  };

  const adicionarSubItem = () => {
      if (!novoSubItem.descricao || !novoSubItem.valor || !itemDetalhe) return;
      const custoTotal = parseFloat(novoSubItem.valor);
      const qtd = parseFloat(novoSubItem.quantidade) || 1;
      const novosDetalhes = [...(itemDetalhe.detalhes || []), { descricao: novoSubItem.descricao, categoria: 'Manual', precoUnit: custoTotal / qtd, precoTotal: custoTotal, quantidade: qtd }];
      recalcularAmbiente(itemDetalhe.id, novosDetalhes);
      setNovoSubItem({ quantidade: 1, descricao: '', valor: '' });
  };

  const removerSubItem = (itemParaRemover) => {
      if (!itemDetalhe) return;
      recalcularAmbiente(itemDetalhe.id, itemDetalhe.detalhes.filter(i => i !== itemParaRemover));
  };

  const recalcularAmbiente = (ambienteId, novosDetalhes) => {
      const novoCustoTotal = novosDetalhes.reduce((acc, item) => acc + item.precoTotal, 0);
      const novoValorVenda = novoCustoTotal * (1 + (config.markup_padrao / 100));
      const novoItemAtualizado = { ...itemDetalhe, detalhes: novosDetalhes, valorOriginal: novoCustoTotal, valor: novoValorVenda };
      setItens(itens.map(i => i.id === ambienteId ? novoItemAtualizado : i));
      setItemDetalhe(novoItemAtualizado);
  };

  const requestSort = (key) => { setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' }); };

  const itensDetalheOrdenados = useMemo(() => {
      if (!itemDetalhe?.detalhes) return [];
      return [...itemDetalhe.detalhes].sort((a, b) => {
          let valA = a[sortConfig.key], valB = b[sortConfig.key];
          if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [itemDetalhe, sortConfig]);

  const irParaNegociacao = () => {
      if (!clienteSelecionado) return notificar.erro("Selecione o cliente.");
      const itensAtivos = itens.filter(i => i.selecionado);
      if (itensAtivos.length === 0) return notificar.erro("Selecione ao menos um ambiente.");

      const dadosVenda = {
          idOrcamento: idOrcamentoAtual,
          clienteId: clienteSelecionado,
          clienteNome: clientes.find(c => c.id == clienteSelecionado)?.nome,
          parceiroId: parceiroSelecionado,
          parceiroNome: parceiros.find(p => p.id == parceiroSelecionado)?.nome,
          comissaoIndicador: comissaoIndicador,
          vendedorId: perfil?.id,
          vendedorEmail: perfil?.email,
          itens: itens, // Enviamos o array completo para preservar o estado de todos (selecionados ou não)
          config: config,
          dadosSalvos: state?.orcamento?.dadosSalvos || null
      };
      navigate('/negociacao', { state: { orcamento: dadosVenda } });
  };

  const atualizarNomeAmbiente = (id, novoNome) => setItens(itens.map(i => i.id === id ? { ...i, ambiente: novoNome } : i));
  const atualizarValorAmbienteDireto = (id, novoVal) => setItens(itens.map(i => i.id === id ? { ...i, valor: parseFloat(novoVal) } : i));
  const toggleSelecao = (id) => setItens(itens.map(i => i.id === id ? { ...i, selecionado: !i.selecionado } : i));
  const adicionarAmbienteManual = () => {
      if (!novoItem.ambiente || !novoItem.valor) return;
      setItens([...itens, { id: Date.now(), ambiente: novoItem.ambiente, descricao: 'Manual', valor: parseFloat(novoItem.valor), valorOriginal: parseFloat(novoItem.valor), detalhes: [], selecionado: true }]);
      setNovoItem({ ambiente: '', valor: '' });
  };

  const totalTabela = itens.filter(i => i.selecionado).reduce((acc, i) => acc + i.valor, 0);
  const valorComIndicador = comissaoIndicador > 0 ? totalTabela / (1 - (comissaoIndicador / 100)) : totalTabela;

  return (
    <div className="max-w-7xl mx-auto pb-24 p-6 animate-fade-in font-sans">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic">Engenharia de Orçamento</h1>
            <p className="text-slate-500 font-medium mt-2 ml-1 text-lg">Definição técnica e custos industriais.</p>
        </div>
        <div className="bg-yellow-50 text-yellow-800 text-sm font-bold px-5 py-3 rounded-xl border border-yellow-200 flex items-center gap-2">
            <AlertCircle size={16}/> Interface Administrativa
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
              {/* CARD DADOS PROJETO */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xl mb-6 flex items-center gap-2 uppercase italic tracking-tighter"><User size={20} className="text-blue-600"/> Dados do Projeto</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente</label>
                          <div className="flex gap-2">
                              <select className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}>
                                  <option value="">Selecione...</option>
                                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                              </select>
                              <button onClick={() => setModalNovoCliente(true)} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24}/></button>
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Parceiro / Arquiteto</label>
                          <div className="flex gap-2">
                              <select className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={parceiroSelecionado} onChange={e => handleSelectParceiro(e.target.value)}>
                                  <option value="">Sem Indicação</option>
                                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                              </select>
                              <button onClick={() => setModalNovoParceiro(true)} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24}/></button>
                          </div>
                      </div>
                  </div>
                  {(parceiroSelecionado || comissaoIndicador > 0) && (
                      <div className="mt-6 p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between animate-fade-in">
                          <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-blue-800 uppercase">Taxa RT</span>
                              <input type="number" className="w-16 text-center font-black text-xl bg-white border border-blue-200 rounded-lg text-blue-600 outline-none" value={comissaoIndicador} onChange={e => setComissaoIndicador(parseFloat(e.target.value))} />
                              <span className="text-xl font-bold text-blue-300">%</span>
                          </div>
                          <p className="text-xl font-black text-blue-900 tracking-tighter">+ {BRL(valorComIndicador - totalTabela)}</p>
                      </div>
                  )}
              </div>

              {/* CARD AMBIENTES */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xl flex items-center gap-2 uppercase italic tracking-tighter mb-8"><LayoutGrid size={20} className="text-orange-500"/> Ambientes</h3>
                  <label className="block w-full cursor-pointer mb-8 group">
                      <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 group-hover:bg-blue-50 transition-all">
                          {loadingXML ? <Loader2 className="animate-spin text-blue-600" size={32}/> : <div className="text-center"><Upload className="mx-auto mb-2 text-slate-400"/><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Importar XML Promob</p></div>}
                          <input type="file" accept=".xml" className="hidden" onChange={handleImportXML} />
                      </div>
                  </label>
                  <div className="space-y-4">
                      {itens.map(item => {
                          const pontuacao = item.valorOriginal > 0 ? ((item.valor - item.valorOriginal) / item.valorOriginal) : 0;
                          return (
                            <div key={item.id} onClick={() => toggleSelecao(item.id)} className={`flex justify-between items-center p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${item.selecionado ? 'border-blue-600 bg-white shadow-xl' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                <div className="flex items-center gap-5 flex-1">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.selecionado ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{item.selecionado ? <CheckSquare size={18}/> : <Square size={18}/>}</div>
                                    <div className="flex-1">
                                        <input value={item.ambiente} onChange={(e) => atualizarNomeAmbiente(item.id, e.target.value)} onClick={(e) => e.stopPropagation()} className="font-black text-lg w-full bg-transparent outline-none uppercase italic" />
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Custo: {BRL(item.valorOriginal)}</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pontuacao < 1.5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>Pontuação: {pontuacao.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                                    <div className="relative"><span className="absolute left-3 top-2.5 text-[10px] font-black text-slate-400">R$</span><input type="number" value={item.valor} onChange={(e) => atualizarValorAmbienteDireto(item.id, e.target.value)} className="w-36 py-2.5 pl-8 pr-3 border border-slate-100 rounded-2xl font-black text-right outline-none focus:border-blue-500" /></div>
                                    <button onClick={() => setItemDetalhe(item)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><List size={20}/></button>
                                    <button onClick={() => setItens(itens.filter(i => i.id !== item.id))} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                                </div>
                            </div>
                          );
                      })}
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-50 rounded-[2rem] mt-8">
                      <input className="flex-1 bg-transparent border-b-2 border-slate-200 p-2 font-bold outline-none" placeholder="Ambiente Manual" value={novoItem.ambiente} onChange={e => setNovoItem({...novoItem, ambiente: e.target.value})}/>
                      <input type="number" className="w-32 bg-transparent border-b-2 border-slate-200 p-2 font-bold outline-none text-right" placeholder="Valor" value={novoItem.valor} onChange={e => setNovoItem({...novoItem, valor: e.target.value})}/>
                      <button onClick={adicionarAmbienteManual} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24}/></button>
                  </div>
              </div>
          </div>

          <div className="xl:col-span-1">
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl sticky top-8 border-4 border-slate-800">
                  <h3 className="text-xl font-black mb-10 uppercase italic tracking-tighter flex items-center gap-3"><DollarSign className="text-green-500"/> Consolidação</h3>
                  <div className="space-y-6 mb-12">
                      <div className="flex justify-between text-xs font-black text-slate-500 uppercase"><span>Itens Selecionados</span><span>{itens.filter(i=>i.selecionado).length}</span></div>
                      <div className="space-y-2 opacity-60">
                        <div className="flex justify-between text-sm font-bold"><span>Soma Ambientes</span><span>{BRL(totalTabela)}</span></div>
                        {comissaoIndicador > 0 && <div className="flex justify-between text-sm text-blue-400 font-black italic"><span>RT Arquiteto ({comissaoIndicador}%)</span><span>+ {BRL(valorComIndicador - totalTabela)}</span></div>}
                      </div>
                      <div className="pt-6 border-t border-slate-800"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">Preço Sugerido</p><p className="text-5xl font-black tracking-tighter text-white italic">{BRL(valorComIndicador)}</p></div>
                  </div>
                  <button onClick={irParaNegociacao} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg hover:bg-blue-500 shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 uppercase italic">Definir Pagamento <ArrowRight size={22}/></button>
              </div>
          </div>
      </div>
      
      {/* MODAL DETALHES */}
      {itemDetalhe && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setItemDetalhe(null)}>
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">{itemDetalhe.ambiente}</h3><p className="text-xs font-black text-slate-400 uppercase mt-1 tracking-widest">Análise de Custos e Insumos</p></div>
                    <button onClick={() => setItemDetalhe(null)} className="p-4 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={28}/></button>
                </div>
                <div className="overflow-y-auto p-8 flex-1 bg-slate-50 custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-2 cursor-pointer" onClick={() => requestSort('quantidade')}>Qtd</th>
                                <th className="px-6 py-2 cursor-pointer" onClick={() => requestSort('descricao')}>Descrição</th>
                                <th className="px-6 py-2 text-right cursor-pointer" onClick={() => requestSort('precoTotal')}>Custo Total</th>
                                <th className="px-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensDetalheOrdenados.map((d, idx) => (
                                <tr key={idx} className="bg-white hover:shadow-lg transition-all rounded-2xl group">
                                    <td className="px-6 py-4 font-black text-slate-900 rounded-l-2xl">{d.quantidade}</td>
                                    <td className="px-6 py-4"><p className="font-black text-slate-800 text-xs uppercase">{d.descricao}</p><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{d.categoria}</span></td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 text-sm italic">{BRL(d.precoTotal)}</td>
                                    <td className="px-6 py-4 rounded-r-2xl text-right"><button onClick={() => removerSubItem(d)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center">
                    <div className="flex gap-4 flex-1 mr-8">
                        <input className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center" type="number" value={novoSubItem.quantidade} onChange={e => setNovoSubItem({...novoSubItem, quantidade: e.target.value})}/>
                        <input className="flex-1 p-4 bg-slate-50 rounded-2xl font-black uppercase text-xs" placeholder="Novo Insumo..." value={novoSubItem.descricao} onChange={e => setNovoSubItem({...novoSubItem, descricao: e.target.value})}/>
                        <input type="number" className="w-32 p-4 bg-slate-50 rounded-2xl font-black text-right" placeholder="Custo R$" value={novoSubItem.valor} onChange={e => setNovoSubItem({...novoSubItem, valor: e.target.value})}/>
                        <button onClick={adicionarSubItem} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24}/></button>
                    </div>
                    <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">Custo Ambiente</p><p className="text-3xl font-black text-slate-900 tracking-tighter italic">{BRL(itemDetalhe.valorOriginal)}</p></div>
                </div>
            </div>
        </div>
      )}

      {/* MODAIS DE CADASTRO */}
      {modalNovoCliente && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
                  <h3 className="text-2xl font-black mb-6 uppercase italic">Novo Cliente</h3>
                  <input className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl mb-4 font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="Nome Completo" value={novoClienteData.nome} onChange={e => setNovoClienteData({...novoClienteData, nome: e.target.value})} />
                  <input className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl mb-6 font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="Telefone" value={novoClienteData.telefone} onChange={e => setNovoClienteData({...novoClienteData, telefone: e.target.value})} />
                  <div className="flex gap-4">
                      <button onClick={() => setModalNovoCliente(false)} className="flex-1 py-4 font-black uppercase text-xs text-slate-400 tracking-widest">Cancelar</button>
                      <button onClick={salvarNovoCliente} disabled={loadingCadastro} className="flex-1 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">{loadingCadastro && <Loader2 className="animate-spin" size={14}/>} Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {modalNovoParceiro && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
                  <h3 className="text-2xl font-black mb-6 uppercase italic">Novo Arquiteto</h3>
                  <input className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl mb-4 font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="Nome do Indicador" value={novoParceiroData.nome} onChange={e => setNovoParceiroData({...novoParceiroData, nome: e.target.value})} />
                  <input type="number" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl mb-6 font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="Comissão Padrão %" value={novoParceiroData.comissao} onChange={e => setNovoParceiroData({...novoParceiroData, comissao: e.target.value})} />
                  <div className="flex gap-4">
                      <button onClick={() => setModalNovoParceiro(false)} className="flex-1 py-4 font-black uppercase text-xs text-slate-400 tracking-widest">Cancelar</button>
                      <button onClick={salvarNovoParceiro} disabled={loadingCadastro} className="flex-1 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">{loadingCadastro && <Loader2 className="animate-spin" size={14}/>} Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}