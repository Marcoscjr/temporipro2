import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Package, AlertTriangle, RefreshCw, X, Info, Edit2, Hash, Landmark, Factory 
} from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('pendente'); 
  const [modalOpen, setModalOpen] = useState(false);
  const [itemEdit, setItemEdit] = useState(null);

  useEffect(() => { carregarListaCompras(); }, []);

  async function sincronizarVendasComCompras() {
    setSincronizando(true);
    try {
        const { data: vendas, error: errVendas } = await supabase
            .from('contratos')
            .select('id, itens_venda, numero_contrato')
            .eq('status', 'venda');

        if (errVendas) throw errVendas;

        const { data: comprasExistentes } = await supabase.from('compras').select('contrato_id, ambiente');
        const novasCompras = [];

        vendas?.forEach(venda => {
            let listaItens = [];
            try {
                listaItens = typeof venda.itens_venda === 'string' 
                    ? JSON.parse(venda.itens_venda) 
                    : (venda.itens_venda || []);
            } catch (e) { listaItens = []; }

            if (Array.isArray(listaItens)) {
                listaItens.forEach(item => {
                    const jaExiste = comprasExistentes?.some(c => c.contrato_id === venda.id && c.ambiente === item.ambiente);
                    
                    if (!jaExiste) {
                        novasCompras.push({
                            contrato_id: venda.id,
                            ambiente: item.ambiente || 'Geral',
                            valor_previsto: parseFloat(item.valorOriginal) || 0, 
                            valor_realizado: 0,
                            status: 'pendente',
                            status_fabrica: 'Aguardando Conferência'
                        });
                    }
                });
            }
        });

        if (novasCompras.length > 0) {
            const { error: errIns } = await supabase.from('compras').insert(novasCompras);
            if (errIns) throw errIns;
            notificar.sucesso("Novos itens sincronizados.");
        } else {
            notificar.info("Tudo atualizado.");
        }
        await carregarListaCompras();
    } catch (error) {
        console.error("Erro na sincronização:", error);
        notificar.erro("Erro: Verifique se as colunas 'ambiente', 'valor_previsto' e 'valor_realizado' foram criadas via SQL.");
    } finally {
        setSincronizando(false);
    }
  }

  async function carregarListaCompras() {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('compras')
            .select(`
                *,
                contratos!inner (
                    id, 
                    numero_contrato, 
                    status, 
                    clientes (nome)
                )
            `)
            .neq('contratos.status', 'cancelado')
            .order('created_at', { ascending: false });

        if (error) throw error;
        setCompras(data || []);
    } catch (error) {
        console.error("Erro ao carregar:", error);
    } finally {
        setLoading(false);
    }
  }

  const liquidarPedido = async (item) => {
    if (item.valor_realizado <= 0) return notificar.erro("Defina o valor real ajustado.");
    if (!window.confirm(`Lançar despesa de ${BRL(item.valor_realizado)} no financeiro?`)) return;

    try {
        const { error: errFin } = await supabase.from('transacoes').insert([{
            descricao: `COMPRA FÁBRICA: ${item.ambiente} (#${item.contratos?.numero_contrato})`,
            valor: parseFloat(item.valor_realizado),
            tipo: 'despesa',
            categoria: 'Custo de Mercadoria (CMV)',
            data_movimento: new Date().toISOString().split('T')[0],
            status: 'realizado',
            contrato_id: item.contrato_id
        }]);

        if (errFin) throw errFin;

        await supabase.from('compras').update({ 
            status: 'entregue', 
            status_fabrica: 'Liquidado' 
        }).eq('id', item.id);
        
        notificar.sucesso("Lançado no Financeiro!");
        carregarListaCompras();
    } catch (err) {
        notificar.erro("Erro na liquidação.");
    }
  };

  const salvarEdicao = async (e) => {
      e.preventDefault();
      const { error } = await supabase.from('compras').update({
          valor_previsto: parseFloat(itemEdit.valor_previsto) || 0,
          valor_realizado: parseFloat(itemEdit.valor_realizado) || 0,
          status: itemEdit.status,
          status_fabrica: 'Ajustado'
      }).eq('id', itemEdit.id);

      if (!error) {
          setModalOpen(false);
          carregarListaCompras();
          notificar.sucesso("Ajuste salvo.");
      }
  };

  const listaFiltrada = compras.filter(c => {
      if (filtroStatus === 'todos') return true;
      return c.status === filtroStatus;
  });

  return (
    <div className="max-w-7xl mx-auto pb-24 p-6 animate-fade-in">
      <div className="flex justify-between items-end mb-8 gap-6">
        <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter"><Factory className="text-blue-600"/> Gestão de Fábrica</h1>
            <p className="text-slate-500 font-medium">Controle de custos reais e conferência técnica.</p>
        </div>
        <button onClick={sincronizarVendasComCompras} disabled={sincronizando} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-lg disabled:opacity-50">
            <RefreshCw size={20} className={sincronizando ? 'animate-spin' : ''}/> 
            {sincronizando ? 'Sincronizando...' : 'Sincronizar Vendas'}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
              <div className="flex items-center justify-center h-80"><RefreshCw className="animate-spin text-slate-300" size={40}/></div>
          ) : listaFiltrada.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-slate-400 gap-4 text-center p-8">
                  <div className="bg-slate-50 p-6 rounded-full"><Package size={48} className="text-slate-200"/></div>
                  <p className="font-bold">Nenhum ambiente pendente.<br/><span className="text-xs font-medium">Vendas confirmadas aparecerão aqui após a sincronização.</span></p>
              </div>
          ) : (
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase border-b tracking-widest">
                      <tr>
                          <th className="p-6">Ambiente / Cliente</th>
                          <th className="p-6 text-center">Previsto</th>
                          <th className="p-6 text-center">Real (Conferido)</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right">Ação</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {listaFiltrada.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-6">
                                  <p className="font-black text-slate-800 uppercase tracking-tighter">{item.ambiente}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-slate-500 font-bold">{item.contratos?.clientes?.nome}</span>
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-slate-200">
                                          <Hash size={10} className="inline mr-0.5"/>{item.contratos?.numero_contrato}
                                      </span>
                                  </div>
                              </td>
                              <td className="p-6 text-center font-mono font-bold text-slate-400">{BRL(item.valor_previsto)}</td>
                              <td className="p-6 text-center font-mono font-black text-blue-600">{BRL(item.valor_realizado)}</td>
                              <td className="p-6">
                                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${item.status === 'pendente' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{item.status}</span>
                              </td>
                              <td className="p-6 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => { setItemEdit(item); setModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-blue-600 transition-all shadow-sm"><Edit2 size={16}/></button>
                                      {item.status !== 'entregue' && (
                                          <button onClick={() => liquidarPedido(item)} className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-[10px] hover:bg-green-700 shadow-md flex items-center gap-1 uppercase tracking-widest active:scale-95"><Landmark size={14}/> Liquidar</button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {modalOpen && itemEdit && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
                  <button onClick={() => setModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X size={24}/></button>
                  <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tighter uppercase">Conferência Técnica</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{itemEdit.ambiente} • {itemEdit.contratos?.clientes?.nome}</p>
                  
                  <form onSubmit={salvarEdicao} className="space-y-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Custo Estimado (XML)</label>
                          <p className="font-mono font-black text-slate-600 text-xl">{BRL(itemEdit.valor_previsto)}</p>
                      </div>

                      <div>
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 italic">Custo Real após Medição</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            autoFocus
                            className="w-full p-5 bg-blue-50 border-none rounded-3xl font-black text-3xl text-blue-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                            value={itemEdit.valor_realizado} 
                            onChange={e => setItemEdit({...itemEdit, valor_realizado: e.target.value})} 
                          />
                      </div>

                      <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-blue-600 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest">Confirmar Ajuste</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}