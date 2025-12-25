import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, TrendingUp, Target, Star, AlertCircle 
} from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function RankingVendedores() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [vendas, setVendas] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [metaLoja, setMetaLoja] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [periodo]);

  async function carregarDados() {
    setLoading(true);
    try {
      const hoje = new Date();
      const mesReferencia = hoje.toLocaleDateString('en-CA').substring(0, 7) + '-01';

      // 1. Buscar Meta Global da Loja
      const { data: metaGlobal } = await supabase
        .from('metas_mensais')
        .select('valor_meta_loja')
        .eq('periodo', mesReferencia)
        .maybeSingle();
      setMetaLoja(metaGlobal?.valor_meta_loja || 0);

      // 2. Buscar Consultores e suas Metas Individuais para o mês
      const { data: consultoresData } = await supabase
        .from('perfis')
        .select(`
          *,
          metas_individuais(valor_meta)
        `)
        .eq('cargo', 'consultor') // Corrigido para 'consultor'
        .eq('metas_individuais.periodo', mesReferencia);
      
      setEquipe(consultoresData || []);

      // 3. Buscar Vendas do período
      let query = supabase.from('contratos').select('*, clientes(nome)');
      if (periodo === 'mes') query = query.gte('created_at', mesReferencia);
      const { data: vendasData } = await query.eq('status', 'venda');
      setVendas(vendasData || []);

    } catch (err) {
      console.error(err);
      notificar.erro("Erro ao processar ranking.");
    } finally {
      setLoading(false);
    }
  }

  const statsLoja = useMemo(() => {
    const totalFaturado = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const percentual = metaLoja > 0 ? (totalFaturado / metaLoja) * 100 : 0;
    return { totalFaturado, percentual };
  }, [vendas, metaLoja]);

  const ranking = useMemo(() => {
    return equipe.map(c => {
      const vendasConsultor = vendas.filter(v => v.vendedor_id === c.id || v.criado_por === c.email);
      const volumeTotal = vendasConsultor.reduce((acc, v) => acc + (v.valor_total || 0), 0);
      
      // Pega a meta individual específica do array (ou 0 se não houver)
      const metaIndivVal = c.metas_individuais?.[0]?.valor_meta || 0;
      const atingimentoMeta = metaIndivVal > 0 ? (volumeTotal / metaIndivVal) * 100 : 0;

      // Comissão Progressiva
      let aliquota = 0.03;
      if (volumeTotal > 100000) aliquota = 0.05;
      else if (volumeTotal > 50000) aliquota = 0.04;

      return {
        ...c,
        volumeTotal,
        metaIndivVal,
        atingimentoMeta,
        comissaoEstimada: volumeTotal * aliquota,
        aliquota: aliquota * 100
      };
    }).sort((a, b) => b.volumeTotal - a.volumeTotal);
  }, [vendas, equipe]);

  if (loading) return <div className="p-20 text-center font-black uppercase text-slate-400 animate-pulse text-xs">Carregando metas dos consultores...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 animate-fade-in font-sans pb-24 text-slate-900">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Trophy className="text-yellow-500" size={36} /> Performance
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Ranking por consultor (Metas Individuais)</p>
        </div>
      </div>

      {/* PROGRESSO DA LOJA */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 mb-10 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2 flex items-center gap-2">
                        <Star size={14} fill="currentColor"/> Meta Global Tempori
                    </h3>
                    <p className="text-3xl font-black italic tracking-tighter">{BRL(statsLoja.totalFaturado)} <span className="text-slate-500 text-lg">/ {BRL(metaLoja)}</span></p>
                </div>
                <p className="text-5xl font-black italic text-blue-500">{statsLoja.percentual.toFixed(1)}%</p>
            </div>
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-1">
                <div 
                    className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(statsLoja.percentual, 100)}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* CARDS COM METAS INDIVIDUAIS ESPECÍFICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {ranking.map((c, idx) => (
          <div key={c.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 italic">#{idx + 1}</div>
                    <div>
                        <h4 className="font-black uppercase italic tracking-tighter text-slate-800 truncate max-w-[120px]">{c.nome?.split(' ')[0]}</h4>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Consultor</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Minha Meta</p>
                    <p className="text-xs font-black text-slate-800">{BRL(c.metaIndivVal)}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="text-slate-400">Atingimento</span>
                        <span className="text-slate-700 font-black">{c.atingimentoMeta.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-700 ${c.atingimentoMeta >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(c.atingimentoMeta, 100)}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Comissão</p>
                        <p className="text-lg font-black text-slate-800 tracking-tighter">{BRL(c.comissaoEstimada)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Taxa</p>
                        <p className="text-xs font-black text-purple-600 italic">{c.aliquota}%</p>
                    </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><Target size={24}/></div>
            <p className="text-xs font-bold text-blue-900 max-w-sm uppercase italic leading-tight">Para definir metas diferentes para cada consultor, acesse o painel de configurações.</p>
        </div>
        <button onClick={() => navigate('/configuracoes')} className="bg-white text-blue-600 px-6 py-4 rounded-xl font-black text-[10px] uppercase shadow-sm border border-blue-200">Configurar Metas</button>
      </div>
    </div>
  );
}