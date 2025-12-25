import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, CheckCircle, Clock, Filter, User } from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function Comissoes() {
  const { user, perfil } = useAuth();
  const [vendas, setVendas] = useState([]);
  const [resumo, setResumo] = useState({ pendente: 0, pago: 0 });
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [equipe, setEquipe] = useState([]);

  const TAXA_COMISSAO = 0.03; // 3% Padrão

  useEffect(() => {
    carregarDados();
  }, [filtroVendedor]);

  const carregarDados = async () => {
    // 1. Carregar lista de vendedores para o filtro (se for admin/financeiro)
    if (perfil.cargo === 'admin' || perfil.cargo === 'financeiro') {
      const { data: users } = await supabase.from('perfis').select('*').order('nome_completo');
      setEquipe(users || []);
    }

    // 2. Construir query de vendas
    let query = supabase
      .from('contratos')
      .select('*, clientes(nome), vendedor:vendedor_id(nome_completo, id)') // Relacionamento com vendedor
      .eq('status', 'vendido')
      .order('created_at', { ascending: false });

    // Se NÃO for chefe, só vê as próprias comissões
    if (perfil.cargo !== 'admin' && perfil.cargo !== 'financeiro') {
      query = query.eq('vendedor_id', user.id);
    } else if (filtroVendedor) {
      // Se for chefe e filtrou alguém específico
      query = query.eq('vendedor_id', filtroVendedor);
    }

    const { data: contratos } = await query;
    if (!contratos) return;

    // 3. Processar dados (Calcular comissão e verificar pagamentos)
    const { data: pagamentos } = await supabase
      .from('transacoes')
      .select('contrato_id, valor')
      .eq('categoria', 'Comissão')
      .eq('status', 'realizado');

    const listaProcessada = contratos.map(c => {
      const valorComissao = c.valor_total * TAXA_COMISSAO;
      // Verifica se existe alguma transação de comissão vinculada a este contrato
      const jaPago = pagamentos.some(p => p.contrato_id === c.id && Math.abs(p.valor - valorComissao) < 1); 
      
      return {
        ...c,
        valorComissao,
        statusComissao: jaPago ? 'pago' : 'pendente'
      };
    });

    setVendas(listaProcessada);

    // Calcular Resumo
    const totalPendente = listaProcessada.filter(i => i.statusComissao === 'pendente').reduce((acc, i) => acc + i.valorComissao, 0);
    const totalPago = listaProcessada.filter(i => i.statusComissao === 'pago').reduce((acc, i) => acc + i.valorComissao, 0);
    setResumo({ pendente: totalPendente, pago: totalPago });
  };

  const pagarComissao = async (contrato) => {
    if (!window.confirm(`Confirmar pagamento de ${BRL(contrato.valorComissao)} para ${contrato.vendedor?.nome_completo}?`)) return;

    try {
      // Lança no Financeiro automaticamente
      const { error } = await supabase.from('transacoes').insert([{
        contrato_id: contrato.id,
        tipo: 'despesa',
        categoria: 'Comissão',
        descricao: `Comissão - CTR ${contrato.numero_contrato} (${contrato.vendedor?.nome_completo})`,
        valor: contrato.valorComissao,
        data_movimento: new Date().toISOString().split('T')[0],
        status: 'realizado'
      }]);

      if (error) throw error;
      
      notificar.sucesso("Comissão paga e lançada no caixa!");
      carregarDados();
    } catch (error) {
      notificar.erro("Erro: " + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign size={30} className="text-green-600"/> Comissões
        </h1>
        
        {/* Filtro de Vendedor (Só para Admin) */}
        {(perfil.cargo === 'admin' || perfil.cargo === 'financeiro') && (
          <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border">
            <Filter size={16} className="text-gray-400"/>
            <select 
              className="bg-transparent outline-none text-sm"
              value={filtroVendedor}
              onChange={e => setFiltroVendedor(e.target.value)}
            >
              <option value="">Todos os Vendedores</option>
              {equipe.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">A Pagar (Pendente)</p>
            <h3 className="text-3xl font-bold text-yellow-600 mt-1">{BRL(resumo.pendente)}</h3>
          </div>
          <div className="bg-yellow-50 p-3 rounded-full text-yellow-600"><Clock size={24}/></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Já Pago (Realizado)</p>
            <h3 className="text-3xl font-bold text-green-600 mt-1">{BRL(resumo.pago)}</h3>
          </div>
          <div className="bg-green-50 p-3 rounded-full text-green-600"><CheckCircle size={24}/></div>
        </div>
      </div>

      {/* LISTA DETALHADA */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b">
            <tr>
              <th className="p-4">Contrato / Cliente</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4 text-right">Valor Venda</th>
              <th className="p-4 text-right text-green-700">Comissão (3%)</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendas.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 transition">
                <td className="p-4">
                  <span className="font-bold text-blue-600">CTR-{v.numero_contrato}</span>
                  <p className="text-xs text-gray-500">{v.clientes?.nome}</p>
                </td>
                <td className="p-4 flex items-center gap-2">
                  <div className="bg-gray-100 p-1 rounded-full"><User size={14}/></div>
                  {v.vendedor?.nome_completo?.split(' ')[0] || 'N/D'}
                </td>
                <td className="p-4 text-right font-medium text-gray-600">{BRL(v.valor_total)}</td>
                <td className="p-4 text-right font-bold text-green-700 text-lg">{BRL(v.valorComissao)}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${v.statusComissao === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {v.statusComissao}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {v.statusComissao === 'pendente' && (perfil.cargo === 'admin' || perfil.cargo === 'financeiro') && (
                    <button 
                      onClick={() => pagarComissao(v)}
                      className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 shadow-sm transition transform active:scale-95"
                    >
                      Pagar
                    </button>
                  )}
                  {v.statusComissao === 'pago' && <span className="text-gray-400 text-xs flex justify-end items-center gap-1"><CheckCircle size={12}/> Pago</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendas.length === 0 && <div className="p-10 text-center text-gray-400">Nenhuma venda encontrada para o filtro selecionado.</div>}
      </div>
    </div>
  );
}