import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Search, TrendingUp, AlertCircle, 
  CheckCircle2, FileText, PieChart, ArrowUpCircle, Filter, Activity
} from 'lucide-react';
import { BRL, notificar } from '../utils';
import { useNavigate } from 'react-router-dom';

export default function ResultadoContrato() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState('');
  const [venda, setVenda] = useState(null);
  const [custosReais, setCustosReais] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContratos();
  }, []);

  async function fetchContratos() {
    try {
      // Busca simplificada para garantir que a lista carregue mesmo se a relação falhar
      const { data, error } = await supabase
        .from('contratos')
        .select('id, numero_contrato, status, clientes(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (err) {
      console.error("Erro ao carregar lista de contratos:", err);
      notificar.erro("Não foi possível carregar a lista de contratos.");
    }
  }

  async function carregarAnalise(id) {
    if (!id) return;
    setLoading(true);
    setSelecionadoId(id);
    try {
      // 1. Busca detalhes da venda
      const { data: vendaData, error: errVenda } = await supabase
        .from('contratos')
        .select('*, clientes(*)')
        .eq('id', id)
        .single();
      
      if (errVenda) throw errVenda;

      // 2. Busca despesas vinculadas a este ID de contrato
      const { data: despesasData, error: errDespesas } = await supabase
        .from('despesas_fixas')
        .select('*')
        .eq('contrato_id', id);

      if (errDespesas) throw errDespesas;

      setVenda(vendaData);
      setCustosReais(despesasData || []);
    } catch (err) {
      console.error("Erro na análise:", err);
      notificar.erro("Erro ao processar dados do contrato.");
    } finally {
      setLoading(false);
    }
  }

  const analise = useMemo(() => {
    if (!venda) return null;

    const receitaTotal = parseFloat(venda.valor_total || 0);
    
    // Cálculo do Previsto (Baseado na sua regra de negócio)
    const custoProdutoPrevisto = venda.itens_venda?.reduce((acc, item) => acc + (parseFloat(item.valorOriginal) || 0), 0) || 0;
    const impostoNF = receitaTotal * 0.04; 
    const montagem = (receitaTotal - (parseFloat(venda.custo_financeiro) || 0)) * 0.06; 
    const comissaoRT = parseFloat(venda.valor_indicador || 0);
    const totalPrevisto = custoProdutoPrevisto + impostoNF + montagem + comissaoRT + (parseFloat(venda.custo_financeiro) || 0);
    
    // Cálculo do Real (O que foi lançado no Financeiro Pro vinculado a este ID)
    const totalReal = custosReais.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    const lucroReal = receitaTotal - totalReal;
    const margemReal = receitaTotal > 0 ? (lucroReal / receitaTotal) * 100 : 0;

    return {
      receitaTotal,
      totalPrevisto,
      lucroPrevisto: receitaTotal - totalPrevisto,
      totalReal,
      lucroReal,
      margemReal
    };
  }, [venda, custosReais]);

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <header className="bg-white border-b border-slate-100 px-8 py-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/financeiro')} 
              className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              <ArrowLeft size={20}/>
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2 leading-none">
                <PieChart className="text-blue-600" size={24} /> Resultados
              </h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Análise de Lucratividade Real</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-[450px]">
            <Filter className="absolute left-4 top-3.5 text-slate-400" size={18}/>
            <select 
              className="w-full pl-12 pr-10 py-3.5 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-2xl text-xs font-black uppercase outline-none transition-all appearance-none cursor-pointer"
              value={selecionadoId}
              onChange={(e) => carregarAnalise(e.target.value)}
            >
              <option value="">Selecione um contrato na lista...</option>
              {contratos.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.numero_contrato || c.id} - {c.clientes?.nome || 'Cliente não identificado'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {!venda ? (
          <div className="py-32 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
               <Activity size={40} />
            </div>
            <p className="font-black uppercase tracking-[0.3em] text-slate-300 text-xs">Selecione um contrato para auditar</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* CARDS PRINCIPAIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Faturamento do Contrato</p>
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{BRL(analise.receitaTotal)}</h3>
                <div className="mt-4 flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                  <ArrowUpCircle size={14}/> Receita Bruta
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest text-red-500">Total de Custos Reais</p>
                <h3 className="text-4xl font-black text-red-600 tracking-tighter">{BRL(analise.totalReal)}</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tight">Previsto Original: {BRL(analise.totalPrevisto)}</p>
              </div>

              <div className={`p-8 rounded-[2.5rem] shadow-2xl text-white ${analise.lucroReal >= 0 ? 'bg-slate-900' : 'bg-red-600'}`}>
                <p className="text-[10px] font-black opacity-60 uppercase mb-2 tracking-widest">Resultado Líquido (Real)</p>
                <h3 className="text-4xl font-black tracking-tighter">{BRL(analise.lucroReal)}</h3>
                <div className="mt-4 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 w-fit text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {analise.margemReal.toFixed(1)}% Margem Real
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LISTA DE CUSTOS LANÇADOS */}
              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                    <FileText className="text-blue-500" size={18}/> Extrato de Saídas Vinculadas
                  </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                        <th className="px-8 py-5">Vencimento</th>
                        <th className="px-8 py-5">Descrição</th>
                        <th className="px-8 py-5 text-right">Valor Pago</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {custosReais.map((custo) => (
                        <tr key={custo.id} className="hover:bg-slate-50/80 transition-all">
                            <td className="px-8 py-5 text-[11px] font-bold text-slate-500">{new Date(custo.data_vencimento).toLocaleDateString('pt-BR')}</td>
                            <td className="px-8 py-5">
                            <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{custo.descricao}</p>
                            <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase">{custo.categoria}</span>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-red-500 text-sm">{BRL(custo.valor)}</td>
                        </tr>
                        ))}
                        {custosReais.length === 0 && (
                        <tr>
                            <td colSpan="3" className="px-8 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Nenhum custo variável associado</td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
              </div>

              {/* VEREDITO */}
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-10 border-b pb-4 italic">Veredito da Operação</h3>
                
                <div className="space-y-10">
                  <div className="flex items-start gap-5 p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                    <div className={`p-4 rounded-2xl ${analise.lucroReal > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {analise.lucroReal > 0 ? <CheckCircle2 size={32}/> : <AlertCircle size={32}/>}
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">
                            {analise.lucroReal > 0 ? 'Contrato Saudável' : 'Atenção: Margem Negativa'}
                        </p>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            {analise.lucroReal > 0 
                                ? `Este projeto confirmou a expectativa de lucro. A eficiência operacional manteve os custos reais dentro da margem de segurança da Tempori.` 
                                : `Os custos reais ultrapassaram o faturamento bruto. É recomendável auditar os lançamentos de montagem e frete para identificar o estouro de orçamento.`}
                        </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-5 rounded-3xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Diferença Real vs Previsto</p>
                          <p className={`text-lg font-black ${(analise.lucroReal - analise.lucroPrevisto) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {BRL(analise.lucroReal - analise.lucroPrevisto)}
                          </p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-3xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ponto de Equilíbrio</p>
                          <p className="text-lg font-black text-slate-800">{BRL(analise.totalReal)}</p>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}