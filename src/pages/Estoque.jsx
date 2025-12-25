import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Package, AlertTriangle, PlusCircle, MinusCircle, Search, 
  TrendingUp, Archive, Save, X 
} from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [kpis, setKpis] = useState({ totalItens: 0, valorTotal: 0, itensBaixo: 0 });

  // Modais
  const [modalProduto, setModalProduto] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  
  // Forms
  const [novoProduto, setNovoProduto] = useState({ 
    nome: '', categoria: 'Ferragem', quantidade: 0, minimo: 10, custo_unitario: 0, unidade: 'un' 
  });
  const [movimento, setMovimento] = useState({ 
    item: null, tipo: 'entrada', qtd: 1, lancarFinanceiro: false 
  });

  useEffect(() => { carregarEstoque(); }, []);

  const carregarEstoque = async () => {
    setLoading(true);
    const { data } = await supabase.from('estoque').select('*').order('nome');
    if (data) {
      setItens(data);
      // Calcular KPIs
      const totalValor = data.reduce((acc, i) => acc + (i.quantidade * i.custo_unitario), 0);
      const baixoEstoque = data.filter(i => i.quantidade <= i.minimo).length;
      setKpis({ totalItens: data.length, valorTotal: totalValor, itensBaixo: baixoEstoque });
    }
    setLoading(false);
  };

  const salvarProduto = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('estoque').insert([novoProduto]);
    if (error) {
      notificar.erro(error.message);
    } else {
      notificar.sucesso("Produto cadastrado!");
      setModalProduto(false);
      setNovoProduto({ nome: '', categoria: 'Ferragem', quantidade: 0, minimo: 10, custo_unitario: 0, unidade: 'un' });
      carregarEstoque();
    }
  };

  const abrirMovimento = (item, tipo) => {
    setMovimento({ item, tipo, qtd: 1, lancarFinanceiro: tipo === 'entrada' });
    setModalMovimento(true);
  };

  const confirmarMovimento = async () => {
    if (!movimento.item) return;
    
    const novaQtd = movimento.tipo === 'entrada' 
      ? movimento.item.quantidade + parseInt(movimento.qtd)
      : movimento.item.quantidade - parseInt(movimento.qtd);

    if (novaQtd < 0) return notificar.erro("Estoque não pode ficar negativo.");

    try {
      // 1. Atualiza Estoque
      const { error } = await supabase
        .from('estoque')
        .update({ quantidade: novaQtd })
        .eq('id', movimento.item.id);

      if (error) throw error;

      // 2. Lança no Financeiro (Opcional)
      if (movimento.tipo === 'entrada' && movimento.lancarFinanceiro) {
        const valorTotal = movimento.qtd * movimento.item.custo_unitario;
        await supabase.from('transacoes').insert([{
          tipo: 'despesa',
          categoria: 'Compra Material',
          descricao: `Compra Estoque: ${movimento.qtd}x ${movimento.item.nome}`,
          valor: valorTotal,
          data_movimento: new Date().toISOString().split('T')[0],
          status: 'realizado'
        }]);
        notificar.info("Despesa lançada no Financeiro.");
      }

      notificar.sucesso("Estoque atualizado!");
      setModalMovimento(false);
      carregarEstoque();
    } catch (e) {
      notificar.erro("Erro: " + e.message);
    }
  };

  // Filtragem local
  const itensFiltrados = itens.filter(i => i.nome.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Package size={30} className="text-blue-600"/> Controle de Estoque
        </h1>
        <button onClick={() => setModalProduto(true)} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold flex gap-2 hover:bg-blue-700 shadow-lg">
          <PlusCircle size={20}/> Novo Item
        </button>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Total em Mercadoria</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{BRL(kpis.valorTotal)}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-full text-blue-600"><TrendingUp size={24}/></div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Itens Cadastrados</p>
            <h3 className="text-2xl font-bold text-orange-600 mt-1">{kpis.totalItens}</h3>
          </div>
          <div className="bg-orange-50 p-3 rounded-full text-orange-600"><Archive size={24}/></div>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border flex items-center justify-between ${kpis.itensBaixo > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-green-100'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${kpis.itensBaixo > 0 ? 'text-red-500' : 'text-gray-400'}`}>Alerta de Reposição</p>
            <h3 className={`text-2xl font-bold mt-1 ${kpis.itensBaixo > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {kpis.itensBaixo > 0 ? `${kpis.itensBaixo} Itens Baixos` : 'Estoque Saudável'}
            </h3>
          </div>
          <div className={`${kpis.itensBaixo > 0 ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'} p-3 rounded-full`}>
            {kpis.itensBaixo > 0 ? <AlertTriangle size={24}/> : <Package size={24}/>}
          </div>
        </div>
      </div>

      {/* BUSCA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-2 items-center">
        <Search className="text-gray-400"/>
        <input 
          placeholder="Buscar dobradiça, mdf, parafuso..." 
          className="flex-1 outline-none text-gray-700"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
      </div>

      {/* TABELA DE ITENS */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Categoria</th>
              <th className="p-4 text-center">Nível Atual</th>
              <th className="p-4 text-right">Custo Unit.</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-center">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itensFiltrados.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition group">
                <td className="p-4 font-bold text-gray-800">{item.nome}</td>
                <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{item.categoria}</span></td>
                <td className="p-4 text-center">
                  <span className={`font-bold px-2 py-1 rounded ${item.quantidade <= item.minimo ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                    {item.quantidade} {item.unidade}
                  </span>
                  {item.quantidade <= item.minimo && <p className="text-[10px] text-red-500 mt-1">Mín: {item.minimo}</p>}
                </td>
                <td className="p-4 text-right text-gray-500">{BRL(item.custo_unitario)}</td>
                <td className="p-4 text-right font-medium">{BRL(item.quantidade * item.custo_unitario)}</td>
                <td className="p-4 flex justify-center gap-2">
                  <button onClick={() => abrirMovimento(item, 'entrada')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Entrada / Compra"><PlusCircle size={20}/></button>
                  <button onClick={() => abrirMovimento(item, 'saida')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Saída / Baixa"><MinusCircle size={20}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {itensFiltrados.length === 0 && <div className="p-10 text-center text-gray-400">Nenhum item encontrado.</div>}
      </div>

      {/* MODAL: NOVO PRODUTO */}
      {modalProduto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-800">Novo Item de Estoque</h3>
              <button onClick={() => setModalProduto(false)} className="text-gray-400 hover:text-red-500"><X/></button>
            </div>
            <form onSubmit={salvarProduto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Nome do Material</label>
                <input required className="w-full p-2 border rounded" value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} placeholder="Ex: Dobradiça Curva 35mm"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Categoria</label>
                  <select className="w-full p-2 border rounded" value={novoProduto.categoria} onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})}>
                    <option>Ferragem</option><option>MDF / Chapas</option><option>Fitas de Borda</option><option>Químicos / Colas</option><option>Acessórios</option><option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Unidade</label>
                  <select className="w-full p-2 border rounded" value={novoProduto.unidade} onChange={e => setNovoProduto({...novoProduto, unidade: e.target.value})}>
                    <option value="un">Unidade (un)</option><option value="m2">Metro Quad. (m²)</option><option value="m">Metro Linear (m)</option><option value="cx">Caixa (cx)</option><option value="l">Litro (l)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Qtd Inicial</label>
                  <input type="number" className="w-full p-2 border rounded" value={novoProduto.quantidade} onChange={e => setNovoProduto({...novoProduto, quantidade: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase text-red-500">Estoque Mín.</label>
                  <input type="number" className="w-full p-2 border rounded" value={novoProduto.minimo} onChange={e => setNovoProduto({...novoProduto, minimo: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Custo (R$)</label>
                  <input type="number" step="0.01" className="w-full p-2 border rounded" value={novoProduto.custo_unitario} onChange={e => setNovoProduto({...novoProduto, custo_unitario: e.target.value})}/>
                </div>
              </div>
              <button className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 mt-4 flex justify-center gap-2"><Save size={20}/> Cadastrar Item</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMENTAÇÃO */}
      {modalMovimento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-2 text-center">
              {movimento.tipo === 'entrada' ? 'Entrada / Compra' : 'Saída / Baixa'}
            </h3>
            <p className="text-center text-gray-500 text-sm mb-6">{movimento.item?.nome}</p>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setMovimento({...movimento, qtd: Math.max(1, movimento.qtd - 1)})} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><MinusCircle/></button>
              <input type="number" className="w-20 text-center text-2xl font-bold border-b-2 border-gray-300 outline-none" value={movimento.qtd} onChange={e => setMovimento({...movimento, qtd: e.target.value})}/>
              <button onClick={() => setMovimento({...movimento, qtd: parseInt(movimento.qtd) + 1})} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><PlusCircle/></button>
            </div>

            {movimento.tipo === 'entrada' && (
              <div className="bg-blue-50 p-3 rounded mb-4 flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" checked={movimento.lancarFinanceiro} onChange={e => setMovimento({...movimento, lancarFinanceiro: e.target.checked})}/>
                <label className="text-sm text-blue-800 font-bold">Lançar Custo no Financeiro?</label>
              </div>
            )}
            {movimento.tipo === 'entrada' && movimento.lancarFinanceiro && (
               <p className="text-center text-xs font-bold text-red-500 mb-4">Será lançado: {BRL(movimento.qtd * movimento.item.custo_unitario)}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setModalMovimento(false)} className="bg-gray-100 text-gray-600 py-2 rounded font-bold hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmarMovimento} className={`text-white py-2 rounded font-bold ${movimento.tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}