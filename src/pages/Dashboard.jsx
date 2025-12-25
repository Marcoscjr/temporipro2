import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Wallet, Calendar, AlertTriangle, CheckCircle, 
  ArrowUpRight, ArrowDownRight, Target, TrendingUp, Clock, 
  MoreHorizontal, Landmark, Wrench, Package, Box, UserCheck, Timer,
  Ruler, PenTool, Factory, Truck, Activity, Star
} from 'lucide-react';
import { BRL } from '../utils';
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, YAxis, Cell, Legend
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estados de Negócio
  const [financeiro, setFinanceiro] = useState({ receita: 0, despesa: 0, saldo: 0 });
  const [meta, setMeta] = useState({ valor: 0, progresso: 0 }); // Origem corrigida
  const [rankingMetas, setRankingMetas] = useState([]); // Novo estado para o gráfico Consultor x Meta
  const [agenda, setAgenda] = useState([]);
  const [grafico, setGrafico] = useState([]);

  // Estados de Assistência
  const [statsAssistencia, setStatsAssistencia] = useState({
    total: 0, aguardando_material: 0, agendados: 0, concluidosMes: 0, tempoMedio: 0
  });
  const [agendaAssistencia, setAgendaAssistencia] = useState([]);
  const [ambientesRanking, setAmbientesRanking] = useState([]);

  // Estados de Produção (Workflow)
  const [statsProducao, setStatsProducao] = useState([]);
  const [alertasAtraso, setAlertasAtraso] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString();
        const periodoMesRef = hoje.toLocaleDateString('en-CA').substring(0, 7) + '-01';

        // 1. BUSCA DE DADOS (Inclusão das novas tabelas de metas)
        const { data: contratos } = await supabase.from('contratos').select('*, clientes(nome)');
        const { data: transacoes } = await supabase.from('transacoes').select('*').eq('status', 'realizado').gte('data_movimento', inicioMes).lte('data_movimento', fimMes);
        const { data: assistencias } = await supabase.from('assistencias').select('*, contratos(clientes(nome))');
        
        // CORREÇÃO: Busca da meta na tabela 'metas_mensais' em vez de 'configuracoes'
        const { data: metaData } = await supabase.from('metas_mensais').select('*').eq('periodo', periodoMesRef).maybeSingle();
        const { data: consultores } = await supabase.from('perfis').select(`*, metas_individuais(*)`).eq('cargo', 'consultor').eq('metas_individuais.periodo', periodoMesRef);

        // 2. PROCESSAMENTO FINANCEIRO
        let totalReceitaMes = 0;
        const mapaGrafico = {};
        contratos?.forEach(c => {
            let parcelas = [];
            try { parcelas = typeof c.condicoes_pagamento === 'string' ? JSON.parse(c.condicoes_pagamento) : (c.condicoes_pagamento || []); } catch (e) { parcelas = []; }
            if (Array.isArray(parcelas)) {
                parcelas.forEach(p => {
                    if (p.pago && p.data_pagamento >= inicioMes && p.data_pagamento <= fimMes) {
                        const valor = parseFloat(p.valor || 0);
                        totalReceitaMes += valor;
                        const dia = new Date(p.data_pagamento).toLocaleDateString().slice(0,5);
                        mapaGrafico[dia] = (mapaGrafico[dia] || 0) + valor;
                    }
                });
            }
        });

        const totalDespesaMes = transacoes?.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + parseFloat(t.valor || 0), 0) || 0;
        setFinanceiro({ receita: totalReceitaMes, despesa: totalDespesaMes, saldo: totalReceitaMes - totalDespesaMes });

        // 3. CÁLCULO DA META (Origem da Tabela Metas Mensais)
        const metaValor = metaData?.valor_meta_loja || 0;
        const volumeVendasMes = contratos?.filter(c => c.status === 'venda' && c.created_at >= inicioMes).reduce((acc, c) => acc + parseFloat(c.valor_total || 0), 0) || 0;
        setMeta({ valor: metaValor, progresso: metaValor > 0 ? (volumeVendasMes / metaValor) * 100 : 0 });

        // 4. PROCESSAMENTO GRÁFICO CONSULTOR X META
        if (consultores) {
          const dadosRanking = consultores.map(c => {
            const vendasC = contratos?.filter(v => (v.vendedor_id === c.id || v.criado_por === c.email) && v.status === 'venda' && v.created_at >= inicioMes).reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0;
            const metaC = c.metas_individuais?.[0]?.valor_meta || 0;
            return {
              name: c.nome?.split(' ')[0],
              realizado: vendasC,
              meta: metaC
            };
          });
          setRankingMetas(dadosRanking);
        }

        // 5. AGENDA DE SERVIÇOS
        const listaAgenda = [];
        contratos?.forEach(c => {
            if (c.status !== 'cancelado') {
                if (c.data_medicao_tecnica) listaAgenda.push({ tipo: 'Medição', data: c.data_medicao_tecnica, cliente: c.clientes?.nome, id: c.id });
                if (c.data_agendamento_montagem) listaAgenda.push({ tipo: 'Montagem', data: c.data_agendamento_montagem, cliente: c.clientes?.nome, id: c.id });
            }
        });
        listaAgenda.sort((a,b) => new Date(a.data) - new Date(b.data));
        setAgenda(listaAgenda.filter(i => new Date(i.data) >= hoje).slice(0, 5));

        // 6. PROCESSAMENTO ASSISTÊNCIAS
        if (assistencias) {
            const concluido = assistencias.filter(a => a.status === 'concluido' && a.updated_at >= inicioMes);
            const somaDias = concluido.reduce((acc, a) => {
                const inicio = new Date(a.created_at);
                const fim = new Date(a.updated_at);
                return acc + (fim - inicio) / (1000 * 60 * 60 * 24);
            }, 0);

            setStatsAssistencia({
                total: assistencias.filter(a => a.status !== 'concluido').length,
                aguardando_material: assistencias.filter(a => a.status === 'aguardando_material').length,
                agendados: assistencias.filter(a => a.status === 'agendado').length,
                concluidosMes: concluido.length,
                tempoMedio: concluido.length > 0 ? (somaDias / concluido.length).toFixed(1) : 0
            });

            const listaAssistAgenda = assistencias
                .filter(a => a.status === 'agendado' && a.data_agendamento)
                .map(a => ({
                    data: a.data_agendamento,
                    cliente: a.contratos?.clientes?.nome || 'Cliente não identificado',
                    ambiente: a.ambiente
                }))
                .sort((a,b) => new Date(a.data) - new Date(b.data))
                .slice(0, 5);
            setAgendaAssistencia(listaAssistAgenda);

            const counts = {};
            assistencias.forEach(a => counts[a.ambiente] = (counts[a.ambiente] || 0) + 1);
            const ranking = Object.entries(counts)
                .map(([name, total]) => ({ name, total }))
                .sort((a,b) => b.total - a.total)
                .slice(0, 3);
            setAmbientesRanking(ranking);
        }

        // 7. PROCESSAMENTO RADAR DE PRODUÇÃO
        if (contratos) {
            const ativos = contratos.filter(c => c.status === 'venda' && c.status_producao !== 'concluido');
            const workflowStats = [
                { name: 'Medição', quantidade: ativos.filter(c => c.status_producao === 'medicao' || !c.status_producao).length, valor: ativos.filter(c => c.status_producao === 'medicao' || !c.status_producao).reduce((acc, c) => acc + (c.valor_total || 0), 0), color: '#3b82f6' },
                { name: 'Projeto', quantidade: ativos.filter(c => c.status_producao === 'projeto').length, valor: ativos.filter(c => c.status_producao === 'projeto').reduce((acc, c) => acc + (c.valor_total || 0), 0), color: '#a855f7' },
                { name: 'Fábrica', quantidade: ativos.filter(c => c.status_producao === 'fabrica').length, valor: ativos.filter(c => c.status_producao === 'fabrica').reduce((acc, c) => acc + (c.valor_total || 0), 0), color: '#f97316' },
                { name: 'Montagem', quantidade: ativos.filter(c => c.status_producao === 'entrega').length, valor: ativos.filter(c => c.status_producao === 'entrega').reduce((acc, c) => acc + (c.valor_total || 0), 0), color: '#10b981' }
            ];
            setStatsProducao(workflowStats);

            const dezDiasAtras = new Date();
            dezDiasAtras.setDate(dezDiasAtras.getDate() - 10);
            const estagnados = ativos.filter(c => new Date(c.updated_at || c.created_at) < dezDiasAtras).map(c => ({
                id: c.id, cliente: c.clientes?.nome, status: c.status_producao || 'medicao', dias: Math.floor((new Date() - new Date(c.updated_at || c.created_at)) / (1000 * 60 * 60 * 24))
            })).sort((a,b) => b.dias - a.dias).slice(0, 4);
            setAlertasAtraso(estagnados);
        }

        const dadosOrdenados = Object.entries(mapaGrafico)
            .map(([name, valor]) => ({ name, valor }))
            .sort((a, b) => a.name.localeCompare(b.name));
        setGrafico(dadosOrdenados);

    } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="p-10 flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div><p className="font-black text-xs uppercase tracking-widest">Sincronizando Raio-X...</p></div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-24 p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Dashboard Tempori</h1>
          <p className="text-slate-500 font-medium tracking-tight">Performance e saúde técnica em tempo real.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
          <Calendar size={18} className="text-blue-500"/>
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* KPI FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-xl group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all"><ArrowUpRight size={24}/></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-lg">Entradas</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Receita Realizada</p>
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{BRL(financeiro.receita)}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-xl group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all"><ArrowDownRight size={24}/></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded-lg">Saídas</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Despesas Pagas</p>
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{BRL(financeiro.despesa)}</h3>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl transition-all group text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white"><Wallet size={24}/></div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Saldo em Caixa</p>
          <h3 className={`text-3xl font-black tracking-tighter ${financeiro.saldo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{BRL(financeiro.saldo)}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-xl group">
          <div className="flex justify-between items-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Target size={20}/></div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">{meta.progresso.toFixed(0)}%</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta Loja (Mensal)</p>
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{BRL(meta.valor)}</h3>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full transition-all duration-1000" style={{width: `${Math.min(100, meta.progresso)}%`}}></div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* GRÁFICO CONSULTOR X META */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:col-span-2">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-[0.2em] mb-8 italic">
              <Star size={18} className="text-yellow-500"/> Performance Consultores (Meta Ind.)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingMetas} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value) => BRL(value)} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar name="Meta Individual" dataKey="meta" fill="#e2e8f0" radius={[10, 10, 0, 0]} barSize={30} />
                  <Bar name="Realizado" dataKey="realizado" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* AGENDA VENDAS */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col p-8">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-[0.2em] mb-8 border-b pb-4"><Clock size={18} className="text-blue-500"/> Agenda de Serviços</h3>
            <div className="space-y-4">
              {agenda.map((item, i) => (
                <div key={i} onClick={() => navigate(`/venda/${item.id}`)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100 group">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs ${item.tipo==='Medição'?'bg-blue-600 text-white':'bg-slate-900 text-white'}`}>
                    <span className="text-lg leading-none">{new Date(item.data).getDate()}</span>
                    <span className="text-[8px] uppercase leading-none mt-1">{new Date(item.data).toLocaleString('default',{month:'short'})}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-tighter group-hover:text-blue-600 transition-colors">{item.tipo}</h4>
                    <p className="text-xs text-slate-500 truncate font-bold uppercase italic">{item.cliente}</p>
                  </div>
                </div>
              ))}
              {agenda.length === 0 && <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] italic tracking-widest">Nenhum serviço agendado.</div>}
            </div>
        </div>
      </div>

      {/* SEÇÃO ASSISTÊNCIA TÉCNICA */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm"><Wrench size={24}/></div>
            <div><h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Assistência Técnica</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análise de pós-venda e satisfação.</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2"><AlertTriangle className="text-orange-500" size={18}/><span className="text-[10px] font-black text-slate-400 uppercase">Em Aberto</span></div>
                <h4 className="text-3xl font-black text-slate-800">{statsAssistencia.total}</h4>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2"><Package className="text-blue-500" size={18}/><span className="text-[10px] font-black text-slate-400 uppercase">Aguardando Peças</span></div>
                <h4 className="text-3xl font-black text-slate-800">{statsAssistencia.aguardando_material}</h4>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2"><Timer className="text-purple-500" size={18}/><span className="text-[10px] font-black text-slate-400 uppercase">Tempo Médio</span></div>
                <h4 className="text-3xl font-black text-slate-800">{statsAssistencia.tempoMedio} <span className="text-sm">dias</span></h4>
            </div>
            <div className="bg-orange-600 p-6 rounded-3xl shadow-xl shadow-orange-100 text-white">
                <div className="flex items-center gap-3 mb-2"><CheckCircle className="text-orange-200" size={18}/><span className="text-[10px] font-black text-orange-200 uppercase">Concluídos (Mês)</span></div>
                <h4 className="text-3xl font-black">{statsAssistencia.concluidosMes}</h4>
            </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] mb-6 flex items-center gap-2"><Calendar className="text-orange-500" size={18}/> Próximas Assistências</h3>
                <div className="space-y-4">
                    {agendaAssistencia.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-sm font-black text-orange-600 leading-none">{new Date(item.data).getDate()}</span>
                                <span className="text-[7px] font-black text-slate-400 uppercase leading-none">{new Date(item.data).toLocaleString('pt-BR',{month:'short'})}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-slate-800 text-[10px] uppercase truncate">{item.cliente}</h4>
                                <p className="text-[9px] font-bold text-orange-500 uppercase italic truncate">{item.ambiente}</p>
                            </div>
                            <span className="text-[9px] font-black text-slate-400">{new Date(item.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}h</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-white">
                <h3 className="font-black text-orange-400 uppercase text-xs tracking-[0.2em] mb-8 flex items-center gap-2"><AlertTriangle size={18}/> Focos de Assistência</h3>
                <div className="space-y-6">
                    {ambientesRanking.map((amb, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase tracking-widest">{amb.name}</span><span className="text-xs font-black text-orange-400">{amb.total} chamados</span></div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{width: `${statsAssistencia.total > 0 ? (amb.total / statsAssistencia.total) * 100 : 0}%`}}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* RADAR DE PRODUÇÃO */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm"><Activity size={24}/></div>
            <div><h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Radar de Produção</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro e Operacional por estágio ativo.</p></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Volume Financeiro por Estágio</h3>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsProducao} layout="vertical" margin={{ left: 30, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={80} tick={{fill: '#64748b', fontWeight: '900'}} />
                            <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-4 rounded-2xl shadow-2xl border-none font-sans">
                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{data.name}</p>
                                                <p className="text-sm font-black text-slate-900">{BRL(data.valor)}</p>
                                                <p className="text-[9px] font-bold text-blue-600 uppercase mt-1">{data.quantidade} Contratos Ativos</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="valor" radius={[0, 10, 10, 0]} barSize={35}>
                                {statsProducao.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Alertas de Estagnação</h3>
                    <AlertTriangle className="text-red-500" size={16}/>
                </div>
                <div className="space-y-4">
                    {alertasAtraso.map((item, i) => (
                        <div key={i} onClick={() => navigate(`/venda/${item.id}`)} className="p-4 rounded-2xl bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-all group">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-black text-slate-900 text-[10px] uppercase truncate w-3/4 group-hover:text-red-600">{item.cliente}</h4>
                                <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black">{item.dias}d</span>
                            </div>
                            <p className="text-[9px] font-bold text-red-600 uppercase tracking-tighter italic">Parado em {item.status.toUpperCase()}</p>
                        </div>
                    ))}
                    {alertasAtraso.length === 0 && <div className="py-12 text-center text-slate-300 font-bold uppercase text-[9px] italic">Sem gargalos detectados.</div>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}