import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Wallet, FileText, Landmark, Plus, Search, X, Calendar, RefreshCw, 
  CheckCircle2, MessageSquare, Clock, AlertCircle, TrendingUp, TrendingDown, 
  BarChart3, PieChart as PieIcon, ArrowUpRight, ArrowDownRight, ChevronRight, Link as LinkIcon, Hash
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { BRL, notificar } from '../utils';

export default function Financeiro() {
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState('dashboard'); 
  const [contratos, setContratos] = useState([]);
  const [transacoesRaw, setTransacoesRaw] = useState([]);
  const [filtroContrato, setFiltroContrato] = useState('');
  const [periodo, setPeriodo] = useState({ 
    inicio: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    fim: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0).toISOString().split('T')[0]
  });

  const [modalAberto, setModalAberto] = useState(false);
  const [novaTransacao, setNovaTransacao] = useState({ 
    descricao: '', valor: '', tipo: 'despesa', categoria: 'Outros Fixos', 
    data_movimento: new Date().toISOString().split('T')[0], contrato_id: '', status: 'pendente' 
  });

  const COLORS_PIE = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e'];
  const CATEGORIAS = {
    receita: ['Venda de Produtos', 'Serviços', 'Rendimentos', 'Outros'],
    despesa: ['Custo de Mercadoria (CMV)', 'Comissões', 'Frete', 'Montagem', 'Aluguel', 'Salários', 'Marketing', 'Outros Fixos']
  };

  useEffect(() => { 
    carregarContratos();
    carregarDados(); 
  }, [periodo, filtroContrato]);

  const carregarContratos = async () => {
    const { data } = await supabase.from('contratos').select('id, numero_contrato, clientes(nome, telefone)').neq('status', 'orcamento');
    setContratos(data || []);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
        const { data: vendas } = await supabase.from('contratos').select('*, clientes(nome, telefone)');
        const { data: transManuais } = await supabase.from('transacoes').select('*, contratos(id, numero_contrato, clientes(nome, telefone))');

        const listaCompilada = [];
        const hoje = new Date().setHours(0,0,0,0);

        vendas?.forEach(venda => {
            let parcelas = [];
            if (venda.condicoes_pagamento) {
                try {
                    parcelas = typeof venda.condicoes_pagamento === 'string' ? JSON.parse(venda.condicoes_pagamento) : venda.condicoes_pagamento;
                } catch (e) { parcelas = []; }
            }

            if (Array.isArray(parcelas)) {
                parcelas.forEach((parc, idx) => {
                    const dataVenc = new Date(parc.data);
                    const status = parc.pago ? 'realizado' : (dataVenc.getTime() < hoje ? 'vencido' : 'pendente');
                    
                    listaCompilada.push({
                        id: `parc-${venda.id}-${idx}`,
                        origem: 'contrato',
                        idx_parcela: idx,
                        descricao: `Parcela ${idx + 1}/${parcelas.length}`,
                        cliente_nome: venda.clientes?.nome,
                        cliente_contrato: `${venda.clientes?.nome} (#${venda.numero_contrato || '---'})`,
                        valor: parseFloat(parc.valor),
                        tipo: 'receita',
                        categoria: 'Venda de Produtos',
                        data: parc.data,
                        status: status,
                        contrato_id: venda.id,
                        parcelas_original: parcelas,
                        telefone: venda.clientes?.telefone
                    });
                });
            }
        });

        transManuais?.forEach(t => listaCompilada.push({
            id: `man-${t.id}`, origem: 'manual', descricao: t.descricao,
            cliente_contrato: t.contratos ? `${t.contratos.clientes?.nome} (#${t.contratos.numero_contrato || '---'})` : 'Geral (Sem Contrato)',
            valor: t.valor, tipo: t.tipo, categoria: t.categoria, data: t.data_movimento,
            status: t.status, contrato_id: t.contrato_id
        }));

        setTransacoesRaw(listaCompilada);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const confirmarRecebimento = async (item) => {
    if (item.origem === 'manual') {
        await supabase.from('transacoes').update({ status: 'realizado' }).eq('id', item.id.replace('man-', ''));
    } else {
        const novasParcelas = [...item.parcelas_original];
        novasParcelas[item.idx_parcela].pago = true;
        novasParcelas[item.idx_parcela].data_pagamento = new Date().toISOString();
        await supabase.from('contratos').update({ condicoes_pagamento: JSON.stringify(novasParcelas) }).eq('id', item.contrato_id);
    }
    notificar.sucesso("Baixa realizada!");
    carregarDados();
  };

  const salvarTransacao = async () => {
    if (!novaTransacao.descricao || !novaTransacao.valor) return notificar.erro("Preencha descrição e valor.");
    const dadosParaSalvar = { ...novaTransacao, valor: parseFloat(novaTransacao.valor), contrato_id: novaTransacao.contrato_id || null };
    const { error } = await supabase.from('transacoes').insert([dadosParaSalvar]);
    if (!error) { setModalAberto(false); setNovaTransacao({ ...novaTransacao, descricao: '', valor: '', contrato_id: '' }); carregarDados(); notificar.sucesso("Salvo!"); }
  };

  const Totais = {
    realizado: transacoesRaw.filter(t => t.status === 'realizado').reduce((acc, t) => acc + (t.tipo === 'receita' ? t.valor : -t.valor), 0),
    aReceber: transacoesRaw.filter(t => t.tipo === 'receita' && t.status !== 'realizado').reduce((acc, t) => acc + t.valor, 0),
    aPagar: transacoesRaw.filter(t => t.tipo === 'despesa' && t.status !== 'realizado').reduce((acc, t) => acc + t.valor, 0),
    vencido: transacoesRaw.filter(t => t.status === 'vencido').reduce((acc, t) => acc + t.valor, 0)
  };

  const dadosPizzaDespesas = Object.entries(
    transacoesRaw.filter(t => t.tipo === 'despesa').reduce((acc, t) => {
        acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
        return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-7xl mx-auto p-4 pb-24 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Landmark className="text-blue-600" size={32}/> Central Financeira</h1>
            <p className="text-slate-500 font-medium ml-1">Fluxo de Caixa e Custos Efetivados.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setModalAberto(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-blue-600 transition"><Plus size={20}/> LANÇAMENTO</button>
            <button onClick={carregarDados} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-100 overflow-x-auto">
        {[{id:'dashboard', label:'Dashboard', icon:<PieIcon size={18}/>}, {id:'receber', label:'Receber', icon:<ArrowUpRight size={18}/>}, {id:'pagar', label:'Pagar', icon:<ArrowDownRight size={18}/>}, {id:'dre', label:'DRE', icon:<BarChart3 size={18}/>}].map(t => (
          <button key={t.id} onClick={()=>setAba(t.id)} className={`px-6 py-3 text-sm font-black flex items-center gap-2 transition-all border-b-4 ${aba===t.id?'border-blue-600 text-blue-600 bg-blue-50/30 rounded-t-xl':'border-transparent text-slate-400'}`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {aba === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Saldo Real (Caixa)</p>
                  <p className="text-3xl font-black">{BRL(Totais.realizado)}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p><p className="text-2xl font-black text-green-600">{BRL(Totais.aReceber)}</p></div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p><p className="text-2xl font-black text-red-500">{BRL(Totais.aPagar)}</p></div>
              <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100"><p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Vencidos</p><p className="text-2xl font-black text-red-700">{BRL(Totais.vencido)}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-1">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest"><PieIcon size={18} className="text-blue-500"/> Gastos por Categoria</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={dadosPizzaDespesas} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {dadosPizzaDespesas.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => BRL(value)} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest"><Calendar size={18} className="text-blue-500"/> Agenda de Fluxo</h3>
                <p className="text-slate-400 font-bold text-sm">Visualize parcelas e lançamentos agendados para os próximos dias nas abas de detalhamento.</p>
            </div>
          </div>
        </div>
      )}

      {(aba === 'receber' || aba === 'pagar') && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase border-b">
                    <tr><th className="p-6">Status</th><th className="p-6">Vencimento</th><th className="p-6">Contrato</th><th className="p-6">Descrição</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Baixa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {transacoesRaw.filter(it => (aba === 'receber' ? it.tipo === 'receita' : it.tipo === 'despesa')).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-6"><span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase border ${t.status === 'realizado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-600'}`}>{t.status}</span></td>
                            <td className="p-6 font-mono font-bold text-slate-400">{new Date(t.data).toLocaleDateString()}</td>
                            <td className="p-6 font-black text-slate-800 flex items-center gap-1"><Hash size={14} className="text-slate-300"/> {t.cliente_contrato}</td>
                            <td className="p-6 font-medium text-slate-500">{t.descricao}</td>
                            <td className={`p-6 text-right font-black text-lg ${t.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>{BRL(t.valor)}</td>
                            <td className="p-6 text-center">{t.status !== 'realizado' && <button onClick={() => confirmarRecebimento(t)} className="p-2 bg-green-500 text-white rounded-xl shadow-md"><CheckCircle2 size={18}/></button>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 relative">
            <button onClick={()=>setModalAberto(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X size={32}/></button>
            <h3 className="text-2xl font-black mb-6">Novo Lançamento</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-2xl">
                <button onClick={()=>setNovaTransacao({...novaTransacao, tipo:'receita'})} className={`py-3 text-xs font-black rounded-xl transition-all ${novaTransacao.tipo==='receita'?'bg-white text-green-600 shadow-sm':'text-slate-400'}`}>RECEITA</button>
                <button onClick={()=>setNovaTransacao({...novaTransacao, tipo:'despesa'})} className={`py-3 text-xs font-black rounded-xl transition-all ${novaTransacao.tipo==='despesa'?'bg-white text-red-600 shadow-sm':'text-slate-400'}`}>DESPESA</button>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-1 mb-2"><LinkIcon size={12}/> Vínculo ao Projeto</label>
                  <select className="w-full bg-white p-3 rounded-xl text-xs font-bold outline-none border-none shadow-sm" value={novaTransacao.contrato_id} onChange={e => setNovaTransacao({...novaTransacao, contrato_id: e.target.value})}>
                      <option value="">Lançamento Geral (Sem Vínculo)</option>
                      {contratos.map(c => (<option key={c.id} value={c.id}>{c.clientes?.nome} (# {c.numero_contrato || c.id})</option>))}
                  </select>
              </div>
              <input type="number" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-2xl outline-none" placeholder="R$ 0,00" value={novaTransacao.valor} onChange={e=>setNovaTransacao({...novaTransacao, valor:e.target.value})} />
              <input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" placeholder="Descrição" value={novaTransacao.descricao} onChange={e=>setNovaTransacao({...novaTransacao, descricao:e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                  <select className="p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs" value={novaTransacao.categoria} onChange={e=>setNovaTransacao({...novaTransacao, categoria:e.target.value})}>{CATEGORIAS[novaTransacao.tipo].map(c => <option key={c}>{c}</option>)}</select>
                  <input type="date" className="p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs" value={novaTransacao.data_movimento} onChange={e=>setNovaTransacao({...novaTransacao, data_movimento:e.target.value})} />
              </div>
              <button onClick={salvarTransacao} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-blue-600 transition-all mt-4 uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}