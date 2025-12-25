import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, 
  CheckCircle2, AlertCircle, Calendar, Download, Wallet,
  TrendingUp, Landmark, MoreHorizontal, FileText, Trash2, PieChart, Clock
} from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function FinanceiroPro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('todos'); 
  const [filtroBusca, setFiltroBusca] = useState('');
  
  // Estados de Dados
  const [contratos, setContratos] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [listaContratos, setListaContratos] = useState([]); // Para o Select do Modal
  
  // Modal Nova Despesa
  const [modalDespesa, setModalDespesa] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ 
    descricao: '', 
    valor: '', 
    data_vencimento: '', 
    categoria: 'Variável',
    contrato_id: null 
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      // 1. Puxa parcelas dos contratos
      const { data: dataContratos } = await supabase.from('contratos').select('id, clientes(nome), condicoes_pagamento, numero_contrato');
      setContratos(dataContratos || []);
      setListaContratos(dataContratos || []);

      // 2. Puxa despesas gerais/vinculadas
      const { data: dataDespesas } = await supabase.from('despesas_fixas').select('*').order('data_vencimento', { ascending: true });
      setDespesas(dataDespesas || []);

    } catch (err) {
      notificar.erro("Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }

  const fluxoCaixa = useMemo(() => {
    const lista = [];

    // Entradas (Contratos)
    contratos.forEach(c => {
      let parcelas = [];
      try { parcelas = typeof c.condicoes_pagamento === 'string' ? JSON.parse(c.condicoes_pagamento) : (c.condicoes_pagamento || []); } catch (e) {}
      
      parcelas.forEach((p, idx) => {
        lista.push({
          id: `ENT-${c.id}-${idx}`,
          tipo: 'entrada',
          descricao: `Parcela ${idx + 1} - ${c.clientes?.nome}`,
          origem: `Contrato #${c.numero_contrato}`,
          valor: parseFloat(p.valor),
          data: p.data,
          pago: p.pago,
          contratoId: c.id,
          parcelaIdx: idx
        });
      });
    });

    // Saídas (Despesas)
    despesas.forEach(d => {
      lista.push({
        id: d.id,
        tipo: 'saida',
        descricao: d.descricao,
        origem: d.categoria,
        valor: parseFloat(d.valor),
        data: d.data_vencimento,
        pago: d.pago,
        isFixa: true,
        vinculoId: d.contrato_id
      });
    });

    return lista
      .filter(item => {
        if (abaAtiva === 'entradas') return item.tipo === 'entrada';
        if (abaAtiva === 'saidas') return item.tipo === 'saida';
        return true;
      })
      .filter(item => item.descricao.toLowerCase().includes(filtroBusca.toLowerCase()))
      .sort((a, b) => new Date(a.data) - new Date(b.data));
  }, [contratos, despesas, abaAtiva, filtroBusca]);

  const kpis = useMemo(() => {
    const pendenteReceber = fluxoCaixa.filter(i => i.tipo === 'entrada' && !i.pago).reduce((acc, i) => acc + i.valor, 0);
    const pendentePagar = fluxoCaixa.filter(i => i.tipo === 'saida' && !i.pago).reduce((acc, i) => acc + i.valor, 0);
    const saldo = pendenteReceber - pendentePagar;
    return { pendenteReceber, pendentePagar, saldo };
  }, [fluxoCaixa]);

  async function darBaixa(item) {
    try {
      if (item.tipo === 'entrada') {
        const contratoOriginal = contratos.find(c => c.id === item.contratoId);
        let parcelas = typeof contratoOriginal.condicoes_pagamento === 'string' 
            ? JSON.parse(contratoOriginal.condicoes_pagamento) 
            : [...contratoOriginal.condicoes_pagamento];
        
        parcelas[item.parcelaIdx].pago = !item.pago;
        await supabase.from('contratos').update({ condicoes_pagamento: parcelas }).eq('id', item.contratoId);
      } else {
        await supabase.from('despesas_fixas').update({ pago: !item.pago }).eq('id', item.id);
      }
      notificar.sucesso("Status atualizado!");
      carregarDados();
    } catch (err) {
      notificar.erro("Erro ao processar baixa.");
    }
  }

  async function salvarNovaDespesa() {
    if (!novaDespesa.descricao || !novaDespesa.valor || !novaDespesa.data_vencimento) {
        return notificar.erro("Preencha os campos obrigatórios.");
    }
    
    const payload = {
        descricao: novaDespesa.descricao,
        valor: parseFloat(novaDespesa.valor),
        data_vencimento: novaDespesa.data_vencimento,
        categoria: novaDespesa.categoria,
        contrato_id: novaDespesa.contrato_id || null,
        pago: false
    };

    const { error } = await supabase.from('despesas_fixas').insert([payload]);
    if (!error) {
      setModalDespesa(false);
      setNovaDespesa({ descricao: '', valor: '', data_vencimento: '', categoria: 'Variável', contrato_id: null });
      notificar.sucesso("Despesa lançada!");
      carregarDados();
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <header className="bg-white border-b border-slate-100 px-8 py-6 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
              <Landmark className="text-blue-600" /> Financeiro Profissional
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/resultado-contratos')}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <PieChart size={16}/> Resultados por Contrato
            </button>
            <button 
              onClick={() => setModalDespesa(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Plus size={16}/> Nova Despesa
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-50 p-6 rounded-[2.5rem] border border-green-100">
            <p className="text-[10px] font-black text-green-600 uppercase mb-1">Total a Receber</p>
            <h3 className="text-3xl font-black text-green-700">{BRL(kpis.pendenteReceber)}</h3>
          </div>
          <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100">
            <p className="text-[10px] font-black text-red-600 uppercase mb-1">Total a Pagar</p>
            <h3 className="text-3xl font-black text-red-700">{BRL(kpis.pendentePagar)}</h3>
          </div>
          <div className={`p-6 rounded-[2.5rem] shadow-xl text-white ${kpis.saldo >= 0 ? 'bg-slate-900' : 'bg-orange-600'}`}>
            <p className="text-[10px] font-black opacity-60 uppercase mb-1">Saldo Projetado</p>
            <h3 className="text-3xl font-black">{BRL(kpis.saldo)}</h3>
          </div>
        </div>

        {/* CONTROLES */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex gap-2 bg-slate-200/50 p-1 rounded-2xl w-fit">
                {['todos', 'entradas', 'saidas'].map(tab => (
                    <button key={tab} onClick={() => setAbaAtiva(tab)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{tab}</button>
                ))}
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-2.5 text-slate-400" size={16} />
                <input type="text" placeholder="Filtrar por descrição..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} />
            </div>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Baixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fluxoCaixa.map((item) => {
                const isAtrasado = !item.pago && new Date(item.data) < new Date().setHours(0,0,0,0);
                return (
                  <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${item.pago ? 'opacity-40 grayscale' : ''}`}>
                    <td className="px-6 py-4 text-xs font-black text-slate-600">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.tipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {item.tipo === 'entrada' ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>}
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{item.descricao}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase italic">{item.origem}</p>
                            </div>
                        </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-black text-sm ${item.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.tipo === 'saida' && '- '} {BRL(item.valor)}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${item.pago ? 'bg-green-100 text-green-700' : isAtrasado ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                            {item.pago ? 'LIQUIDADO' : isAtrasado ? 'ATRASADO' : 'PENDENTE'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button onClick={() => darBaixa(item)} className={`p-2 rounded-xl transition-all ${item.pago ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-lg active:scale-90'}`}>
                            {item.pago ? <Clock size={16}/> : <CheckCircle2 size={16}/>}
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL NOVA DESPESA */}
      {modalDespesa && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-scale-up">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase italic tracking-tighter">Lançar Nova Conta</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Descrição do Gasto</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none focus:ring-2 focus:ring-blue-500 mt-1" placeholder="Ex: Frete Carreto João" value={novaDespesa.descricao} onChange={e => setNovaDespesa({...novaDespesa, descricao: e.target.value})}/>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Vincular a um Contrato (Opcional)</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none focus:ring-2 focus:ring-blue-500 mt-1" value={novaDespesa.contrato_id || ''} onChange={e => setNovaDespesa({...novaDespesa, contrato_id: e.target.value ? parseInt(e.target.value) : null})}>
                    <option value="">Despesa Geral da Loja</option>
                    {listaContratos.map(c => (
                        <option key={c.id} value={c.id}>#{c.numero_contrato} - {c.clientes?.nome}</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Valor</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none focus:ring-2 focus:ring-blue-500 mt-1" placeholder="0.00" value={novaDespesa.valor} onChange={e => setNovaDespesa({...novaDespesa, valor: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Vencimento</label>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none focus:ring-2 focus:ring-blue-500 mt-1" value={novaDespesa.data_vencimento} onChange={e => setNovaDespesa({...novaDespesa, data_vencimento: e.target.value})}/>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalDespesa(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Cancelar</button>
                <button onClick={salvarNovaDespesa} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Lançar Saída</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}