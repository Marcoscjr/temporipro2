import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, FileText, CheckCircle, Clock, ArrowRight, Search, 
  TrendingUp, Calendar, Loader2, Edit3, Hash
} from 'lucide-react';
import { BRL } from '../utils';

export default function Comercial() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarContratos();
  }, []);

  async function carregarContratos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('contratos')
      .select('*, clientes(nome)')
      .order('updated_at', { ascending: false });

    if (!error && data) setContratos(data);
    setLoading(false);
  }

  const retomarOrcamento = async (orcamento) => {
    const { data: config } = await supabase.from('configuracoes').select('*').single();
    
    let pagamentosRecuperados = [];
    if (orcamento.condicoes_pagamento) {
        if (Array.isArray(orcamento.condicoes_pagamento)) {
            pagamentosRecuperados = orcamento.condicoes_pagamento;
        } else if (typeof orcamento.condicoes_pagamento === 'string') {
            try { pagamentosRecuperados = JSON.parse(orcamento.condicoes_pagamento); } catch (e) {}
        }
    }

    const dadosParaEdicao = {
        idOrcamento: orcamento.id,
        clienteId: orcamento.cliente_id,
        clienteNome: orcamento.clientes?.nome,
        parceiroNome: orcamento.indicador_nome, 
        comissaoIndicador: orcamento.indicador_pct || 0,
        itens: orcamento.itens_venda || [],
        config: config || {},
        valorTotalSalvo: orcamento.valor_total, 
        numero_contrato: orcamento.numero_contrato, // Preservando o número original
        dadosSalvos: {
            forma_pagamento: orcamento.forma_pagamento,
            listaPagamentos: pagamentosRecuperados
        }
    };
    
    navigate('/novo-orcamento', { state: { orcamento: dadosParaEdicao } });
  };

  const listaFiltrada = contratos.filter(c => {
      const matchStatus = filtroStatus === 'todos' ? true : c.status === filtroStatus;
      // Busca aprimorada: agora filtra por Nome do Cliente OU Número do Contrato
      const termoBusca = busca.toLowerCase();
      const matchNome = c.clientes?.nome?.toLowerCase().includes(termoBusca) || false;
      const matchNumero = c.numero_contrato?.toLowerCase().includes(termoBusca) || false;
      
      return matchStatus && (matchNome || matchNumero);
  });

  const totalPipeline = contratos.filter(c => c.status === 'orcamento').reduce((acc, c) => acc + c.valor_total, 0);
  const totalVendido = contratos.filter(c => c.status === 'venda').reduce((acc, c) => acc + c.valor_total, 0);
  const ticketMedio = contratos.length > 0 ? (totalPipeline + totalVendido) / contratos.length : 0;

  const getStatusBadge = (status) => {
      if (status === 'cancelado') return { label: 'CANCELADO', color: 'bg-red-50 text-red-700 border-red-100' };
      if (status === 'venda') return { label: 'VENDIDO', color: 'bg-green-50 text-green-700 border-green-100' };
      return { label: 'NEGOCIAÇÃO', color: 'bg-blue-50 text-blue-700 border-blue-100' };
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 p-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Comercial</h1>
          <p className="text-slate-500 font-medium mt-1">Gestão de pipeline e fechamentos.</p>
        </div>
        <Link to="/novo-orcamento" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2 no-underline"><Plus size={20} /> Novo Orçamento</Link>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Clock size={24}/></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase">Em Negociação</p><p className="text-2xl font-black text-slate-900">{BRL(totalPipeline)}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle size={24}/></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase">Vendas Fechadas</p><p className="text-2xl font-black text-slate-900">{BRL(totalVendido)}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><TrendingUp size={24}/></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase">Ticket Médio</p><p className="text-2xl font-black text-slate-900">{BRL(ticketMedio)}</p></div>
          </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
              <input type="text" placeholder="Buscar por cliente ou número do contrato..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 shadow-sm" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex shadow-sm overflow-x-auto">
              {[{ id: 'todos', label: 'Todos' }, { id: 'orcamento', label: 'Abertos' }, { id: 'venda', label: 'Vendidos' }, { id: 'cancelado', label: 'Cancelados' }].map(opt => (
                  <button key={opt.id} onClick={() => setFiltroStatus(opt.id)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filtroStatus === opt.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{opt.label}</button>
              ))}
          </div>
      </div>

      {/* LISTAGEM */}
      {loading ? (
        <div className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 text-slate-900 mx-auto"/></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {listaFiltrada.length === 0 && <div className="col-span-full text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200"><p className="text-slate-400 font-medium">Nenhum contrato encontrado.</p></div>}
            
            {listaFiltrada.map(item => {
                const badge = getStatusBadge(item.status);
                return (
                    <div key={item.id} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shadow-md font-black uppercase ${item.status === 'venda' ? 'bg-green-500 shadow-green-200' : item.status === 'cancelado' ? 'bg-red-500 shadow-red-200' : 'bg-blue-500 shadow-blue-200'}`}>
                                    {item.clientes?.nome?.[0] || '?'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 text-lg">{item.clientes?.nome || 'Cliente Removido'}</h3>
                                        {/* EXIBIÇÃO DO NÚMERO DO CONTRATO AO LADO DO NOME */}
                                        {item.numero_contrato && (
                                            <span className="flex items-center gap-0.5 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-black border border-slate-200">
                                                <Hash size={10}/> {item.numero_contrato}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                                        <Calendar size={12}/> {new Date(item.created_at).toLocaleDateString()}
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {item.itens_venda?.length || 0} Ambientes
                                    </div>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.color}`}>
                                {badge.label}
                            </span>
                        </div>

                        <div className="mb-6 pl-16">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Valor da Proposta</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{BRL(item.valor_total)}</p>
                        </div>

                        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-50">
                            {item.status === 'orcamento' ? (
                                <button onClick={() => retomarOrcamento(item)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors">
                                    Retomar <ArrowRight size={16}/>
                                </button>
                            ) : (
                                <div className="flex w-full gap-2">
                                    <button onClick={() => navigate(`/venda/${item.id}`)} className="flex-1 bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-200 flex items-center justify-center gap-2 transition-colors">
                                        <FileText size={16}/> Detalhes
                                    </button>
                                    {item.status !== 'cancelado' && (
                                        <button onClick={() => retomarOrcamento(item)} className="px-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Editar Venda">
                                            <Edit3 size={18}/>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}