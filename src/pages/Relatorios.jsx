import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  BarChart3, TrendingUp, Users, DollarSign, Calendar, 
  ArrowUpRight, ArrowDownRight, Filter, PieChart, Calculator 
} from 'lucide-react';
import { BRL } from '../utils';

export default function Relatorios() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Alteração 1: Estado para controlar o tipo de filtro e as datas personalizadas
  const [periodo, setPeriodo] = useState('ano'); // 'mes', 'ano', 'todo', 'personalizado'
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0], // Começa com a data de hoje
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    // Busca todos os contratos
    const { data, error } = await supabase
      .from('contratos')
      .select('*, clientes(nome)')
      .order('created_at', { ascending: true });

    if (!error && data) setContratos(data);
    setLoading(false);
  }

  // --- PROCESSAMENTO DOS DADOS ---
  const dados = useMemo(() => {
      const hoje = new Date();
      
      // 1. Filtragem por Período (Atualizado com Lógica Personalizada)
      const listaFiltrada = contratos.filter(c => {
          const dataC = new Date(c.created_at); // Data da venda
          
          // Zera as horas para comparar apenas dia/mês/ano corretamente
          const dataVendaStr = c.created_at.split('T')[0];

          if (periodo === 'mes') return dataC.getMonth() === hoje.getMonth() && dataC.getFullYear() === hoje.getFullYear();
          if (periodo === 'ano') return dataC.getFullYear() === hoje.getFullYear();
          if (periodo === 'personalizado') {
              return dataVendaStr >= dateRange.start && dataVendaStr <= dateRange.end;
          }
          return true; // 'todo'
      });

      // 2. Cálculos Gerais
      const vendas = listaFiltrada.filter(c => c.status === 'venda');
      const orcamentos = listaFiltrada.filter(c => c.status === 'orcamento');
      const cancelados = listaFiltrada.filter(c => c.status === 'cancelado');

      const totalVendido = vendas.reduce((acc, c) => acc + (c.valor_total || 0), 0);
      
      // NOVA LÓGICA: Markup Ponderado
      // ATENÇÃO: Estou assumindo que existe uma coluna 'custo_total' no seu banco Supabase.
      // Se o nome for diferente, troque c.custo_total pelo nome correto.
      const totalCusto = vendas.reduce((acc, c) => acc + (c.custo_total || 0), 0);
      
      let markupPonderado = 0;
      if (totalCusto > 0) {
          // Fórmula: ((Venda - Custo) / Custo) * 100
          markupPonderado = ((totalVendido - totalCusto) / totalCusto) * 100;
      }

      const totalOrcado = orcamentos.reduce((acc, c) => acc + (c.valor_total || 0), 0);
      const ticketMedio = vendas.length > 0 ? totalVendido / vendas.length : 0;
      
      const totalOportunidades = vendas.length + orcamentos.length + cancelados.length;
      const taxaConversao = totalOportunidades > 0 ? (vendas.length / totalOportunidades) * 100 : 0;

      // 3. Agrupamento por Mês
      const vendasPorMes = {};
      vendas.forEach(v => {
          const mes = new Date(v.created_at).toLocaleString('pt-BR', { month: 'short' });
          vendasPorMes[mes] = (vendasPorMes[mes] || 0) + v.valor_total;
      });
      const labelsMeses = Object.keys(vendasPorMes);
      const maiorVendaMes = Math.max(...Object.values(vendasPorMes), 1);

      // 4. Ranking
      const parceirosMap = {};
      vendas.forEach(v => {
          const nome = v.indicador_nome || 'Venda Direta';
          parceirosMap[nome] = (parceirosMap[nome] || 0) + v.valor_total;
      });
      const rankingParceiros = Object.entries(parceirosMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

      return {
          totalVendido,
          ticketMedio,
          markupPonderado, // Enviando o cálculo novo para a tela
          taxaConversao,
          qtdVendas: vendas.length,
          qtdCancelados: cancelados.length,
          vendasPorMes,
          labelsMeses,
          maiorVendaMes,
          rankingParceiros,
          listaRecente: vendas.slice(-5).reverse()
      };
  }, [contratos, periodo, dateRange]); // Recalcula se mudar a data personalizada

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;

  return (
    <div className="max-w-7xl mx-auto pb-24 p-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <BarChart3 className="text-blue-600"/> Relatórios Gerenciais
          </h1>
          <p className="text-slate-500 font-medium mt-1">Análise de desempenho comercial.</p>
        </div>
        
        {/* ÁREA DE FILTROS ATUALIZADA */}
        <div className="flex flex-col items-end gap-2">
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
                {[
                    { id: 'mes', label: 'Este Mês' },
                    { id: 'ano', label: 'Este Ano' },
                    { id: 'todo', label: 'Tudo' },
                    { id: 'personalizado', label: 'Personalizado' }
                ].map(opt => (
                    <button 
                        key={opt.id} 
                        onClick={() => setPeriodo(opt.id)} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${periodo === opt.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Inputs de Data (Só aparecem se escolher Personalizado) */}
            {periodo === 'personalizado' && (
                <div className="flex gap-2 animate-fade-in bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="border border-slate-300 rounded px-2 py-1 text-sm font-medium text-slate-700 focus:outline-blue-500"
                    />
                    <span className="text-slate-400 self-center">-</span>
                    <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="border border-slate-300 rounded px-2 py-1 text-sm font-medium text-slate-700 focus:outline-blue-500"
                    />
                </div>
            )}
        </div>
      </div>

      {/* KPI CARDS - GRID ATUALIZADO PARA 5 COLUNAS (OU AJUSTE AUTOMÁTICO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-200">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/10 rounded-2xl"><DollarSign size={24}/></div>
                  <span className="text-xs font-bold bg-green-500 text-green-950 px-2 py-1 rounded-lg flex items-center gap-1"><ArrowUpRight size={12}/> Vendas</span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Faturamento</p>
              <p className="text-2xl font-black tracking-tight">{BRL(dados.totalVendido)}</p>
          </div>

          {/* NOVO CARD: MARKUP MÉDIO */}
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-200 text-emerald-800 rounded-2xl"><Calculator size={24}/></div>
                  <span className="text-xs font-bold bg-emerald-200 text-emerald-800 px-2 py-1 rounded-lg">Lucratividade</span>
              </div>
              <p className="text-emerald-600 text-xs font-bold uppercase mb-1">Markup Médio (Real)</p>
              <p className="text-2xl font-black text-emerald-900 tracking-tight">
                  {dados.markupPonderado.toFixed(1)}%
              </p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Ponderado pelo custo</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><TrendingUp size={24}/></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">{dados.qtdVendas} ctts</span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Ticket Médio</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{BRL(dados.ticketMedio)}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><PieChart size={24}/></div>
                  <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">Conv.</span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Fechamento</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{dados.taxaConversao.toFixed(0)}%</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ArrowDownRight size={24}/></div>
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-lg">Perdidos</span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Cancelados</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{dados.qtdCancelados}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* GRÁFICO DE EVOLUÇÃO */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-8 flex items-center gap-2"><Calendar className="text-blue-500"/> Evolução de Vendas</h3>
              
              <div className="h-64 flex items-end gap-4">
                  {dados.labelsMeses.length > 0 ? dados.labelsMeses.map((mes, idx) => {
                      const valor = dados.vendasPorMes[mes];
                      const altura = (valor / dados.maiorVendaMes) * 100;
                      
                      return (
                          <div key={idx} className="flex-1 flex flex-col justify-end items-center group">
                              <div className="relative w-full bg-slate-100 rounded-t-xl hover:bg-blue-500 transition-colors duration-300" style={{ height: `${altura}%` }}>
                                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded-lg whitespace-nowrap transition-opacity shadow-lg z-10">
                                      {BRL(valor)}
                                  </div>
                              </div>
                              <p className="text-xs font-bold text-slate-400 mt-3 uppercase">{mes}</p>
                          </div>
                      )
                  }) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-2xl">
                          Sem dados de vendas para o período.
                      </div>
                  )}
              </div>
          </div>

          {/* RANKING DE PARCEIROS */}
          <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2"><Users className="text-orange-500"/> Top Parceiros</h3>
              
              <div className="space-y-4">
                  {dados.rankingParceiros.length > 0 ? dados.rankingParceiros.map(([nome, valor], idx) => (
                      <div key={idx} className="flex items-center gap-4 group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                              {idx + 1}
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-bold text-slate-700">{nome || 'Não Identificado'}</span>
                                  <span className="text-xs font-bold text-slate-500">{BRL(valor)}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(valor / dados.totalVendido) * 100}%` }}></div>
                              </div>
                          </div>
                      </div>
                  )) : (
                      <p className="text-slate-400 text-sm text-center py-10">Nenhum parceiro registrado.</p>
                  )}
              </div>
          </div>

      </div>

      {/* LISTA DE VENDAS RECENTES */}
      <div className="mt-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-6">Últimos Fechamentos</h3>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
                      <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Indicador</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {dados.listaRecente.map((venda, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-600">{new Date(venda.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-slate-800 font-medium">{venda.clientes?.nome}</td>
                              <td className="px-4 py-3 text-slate-500">{venda.indicador_nome || '-'}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{BRL(venda.valor_total)}</td>
                          </tr>
                      ))}
                      {dados.listaRecente.length === 0 && (
                          <tr><td colSpan="4" className="text-center py-8 text-slate-400">Nenhuma venda recente.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
}