import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Wallet, Calendar, CheckCircle, ArrowRight, DollarSign, CreditCard, 
  AlertTriangle, Save 
} from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function Fechamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Configuração das Parcelas
  const [config, setConfig] = useState({
    qtd: 1,
    entrada: 0,
    primeiroVencimento: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    intervalo: 30, // dias
    formaPagamento: 'Cartão de Crédito'
  });

  const [parcelasGeradas, setParcelasGeradas] = useState([]);

  useEffect(() => {
    carregarContrato();
  }, [id]);

  const carregarContrato = async () => {
    const { data, error } = await supabase
      .from('contratos')
      .select('*, clientes(nome)')
      .eq('id', id)
      .single();

    if (error) {
      notificar.erro("Erro ao carregar contrato.");
      return navigate('/comercial');
    }

    setContrato(data);
    
    // Tenta ser inteligente e ler o que foi negociado no texto
    let qtdDetectada = 1;
    
    if (data.condicoes_pagamento) {
      const texto = data.condicoes_pagamento;
      const matchQtd = texto.match(/(\d+)x/);
      if (matchQtd) qtdDetectada = parseInt(matchQtd[1]);
    }

    setConfig(prev => ({
      ...prev,
      qtd: qtdDetectada > 0 ? qtdDetectada : 1,
      // Se quiser puxar a entrada salva, poderia tentar parsear aqui também, 
      // mas é mais seguro deixar o usuário confirmar.
    }));

    setLoading(false);
  };

  // Simulação Visual
  useEffect(() => {
    if (!contrato) return;
    simularParcelas();
  }, [config, contrato]);

  const simularParcelas = () => {
    const lista = [];
    const total = contrato.valor_total || 0;
    const valorSemEntrada = total - config.entrada;
    
    // Parcela 0 (Entrada)
    if (config.entrada > 0) {
      lista.push({
        numero: 'Entrada',
        vencimento: new Date().toISOString().split('T')[0],
        valor: parseFloat(config.entrada),
        status: 'pendente'
      });
    }

    // Parcelas restantes
    if (config.qtd > 0 && valorSemEntrada > 0) {
      const valorParcela = valorSemEntrada / config.qtd;
      
      for (let i = 1; i <= config.qtd; i++) {
        const dataVenc = new Date(config.primeiroVencimento);
        dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
        
        lista.push({
          numero: `${i}/${config.qtd}`,
          vencimento: dataVenc.toISOString().split('T')[0],
          valor: valorParcela,
          status: 'pendente'
        });
      }
    }
    setParcelasGeradas(lista);
  };

  const confirmarFinanceiro = async () => {
    if (parcelasGeradas.length === 0) return;

    try {
      setLoading(true);
      
      // 1. Limpa anteriores
      await supabase.from('pagamentos_contrato').delete().eq('contrato_id', id);

      // 2. Prepara inserts COM O CAMPO 'metodo' CORRIGIDO
      const inserts = parcelasGeradas.map(p => ({
        contrato_id: id,
        numero_parcela: p.numero === 'Entrada' ? 0 : parseInt(p.numero.split('/')[0]),
        data_vencimento: p.vencimento,
        valor_parcela: p.valor,
        status: 'pendente',
        metodo: config.formaPagamento, // <--- AQUI ESTAVA FALTANDO!
        observacoes: `Gerado no fechamento`
      }));

      // 3. Insere
      const { error } = await supabase.from('pagamentos_contrato').insert(inserts);
      if (error) throw error;
      
      notificar.sucesso("Financeiro gerado com sucesso!");
      navigate(`/contrato/${id}`);

    } catch (error) {
      notificar.erro("Erro ao gerar financeiro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !contrato) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4 shadow-sm">
          <DollarSign size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Parabéns pela Venda!</h1>
        <p className="text-slate-500 mt-2">Vamos confirmar os dados financeiros do contrato <strong>#{contrato.numero_contrato}</strong></p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* CONFIGURAÇÃO */}
        <div className="card h-fit">
          <div className="border-b pb-4 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Valor Fechado</p>
            <p className="text-3xl font-bold text-slate-800">{BRL(contrato.valor_total)}</p>
            <p className="text-xs text-slate-500 mt-1 bg-slate-100 p-2 rounded inline-block">
              Negociado: {contrato.condicoes_pagamento}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label-base">Valor de Entrada (R$)</label>
              <input type="number" className="input-base font-bold text-green-600" value={config.entrada} onChange={e => setConfig({...config, entrada: parseFloat(e.target.value) || 0})}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base">Qtd. Parcelas</label>
                <input type="number" className="input-base text-center" value={config.qtd} onChange={e => setConfig({...config, qtd: parseInt(e.target.value) || 1})}/>
              </div>
              <div>
                <label className="label-base">1º Vencimento</label>
                <input type="date" className="input-base" value={config.primeiroVencimento} onChange={e => setConfig({...config, primeiroVencimento: e.target.value})}/>
              </div>
            </div>

            <div>
              <label className="label-base">Método de Pagamento</label>
              <select className="select-base" value={config.formaPagamento} onChange={e => setConfig({...config, formaPagamento: e.target.value})}>
                <option>Cartão de Crédito</option>
                <option>Boleto Bancário</option>
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cheque</option>
                <option>Financiamento</option>
              </select>
            </div>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><Calendar size={18}/> Previsão de Recebíveis</h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">{parcelasGeradas.length} lançamentos</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="p-3 pl-4">Parcela</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right pr-4">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcelasGeradas.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-3 pl-4 font-bold text-slate-700">{p.numero}</td>
                    <td className="p-3 text-slate-500">{new Date(p.vencimento).toLocaleDateString()}</td>
                    <td className="p-3 text-right pr-4 font-mono font-bold text-green-600">{BRL(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t font-bold text-slate-800">
                <tr><td className="p-3 pl-4" colSpan="2">TOTAL GERADO</td><td className="p-3 text-right pr-4">{BRL(parcelasGeradas.reduce((a, b) => a + b.valor, 0))}</td></tr>
              </tfoot>
            </table>
          </div>

          <button onClick={confirmarFinanceiro} className="w-full btn-primary bg-green-600 hover:bg-green-700 h-12 text-lg shadow-lg shadow-green-100">
            Confirmar e Gerar Contrato <ArrowRight size={20}/>
          </button>
        </div>
      </div>
    </div>
  );
}