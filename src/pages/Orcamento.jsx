import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  User, Plus, Trash2, Calculator, Save, ArrowRight, 
  DollarSign, Percent, Calendar, Briefcase, CheckCircle, AlertCircle 
} from 'lucide-react';
import { notificar, BRL, calcularVPL } from '../utils';

export default function Orcamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Configurações Globais (Juros, etc)
  const [config, setConfig] = useState({ taxa_juros_mensal: 0 });

  // Dados do Orçamento
  const [cliente, setCliente] = useState('');
  const [clientesDb, setClientesDb] = useState([]);
  const [itens, setItens] = useState([]);
  
  // Item sendo adicionado
  const [novoItem, setNovoItem] = useState({ ambiente: '', descricao: '', valor: '' });

  // --- LÓGICA FINANCEIRA ---
  const [financeiro, setFinanceiro] = useState({
    temIndicador: false,
    nomeIndicador: '',
    pctIndicador: 0,
    parcelas: 1
  });

  // Totais Calculados
  const [totais, setTotais] = useState({
    somaItens: 0,       // Valor Base (Tabela)
    valorIndicador: 0,  // Quanto o indicador ganha
    valorVenda: 0,      // Valor Final pro Cliente
    custoFinanceiro: 0, // Juros/VPL descontado
    baseComissao: 0     // Valor Líquido para comissão
  });

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // Recalcula sempre que itens ou condições mudam
  useEffect(() => {
    calcularMatematicaVenda();
  }, [itens, financeiro, config]);

  const carregarDadosIniciais = async () => {
    const { data: cfg } = await supabase.from('configuracoes').select('taxa_juros_mensal').single();
    if (cfg) setConfig(cfg);

    const { data: clis } = await supabase.from('clientes').select('id, nome');
    setClientesDb(clis || []);
  };

  const calcularMatematicaVenda = () => {
    const somaItens = itens.reduce((acc, i) => acc + i.valor, 0);
    
    // 1. CÁLCULO DO INDICADOR (REVERSE MARKUP)
    // Se indicador ganha 10%, a loja precisa ficar com 90% do valor final.
    // Logo: Valor Final = Valor Base / (1 - %Indicador)
    let valorVenda = somaItens;
    let valorIndicador = 0;

    if (financeiro.temIndicador && financeiro.pctIndicador > 0) {
        const divisor = 1 - (financeiro.pctIndicador / 100);
        if (divisor > 0) {
            valorVenda = somaItens / divisor;
            valorIndicador = valorVenda - somaItens;
        }
    }

    // 2. CUSTO FINANCEIRO (VPL)
    // Trazemos o Valor Venda (total) a valor presente
    const valorPresente = calcularVPL(valorVenda, financeiro.parcelas, config.taxa_juros_mensal);
    const custoFinanceiro = valorVenda - valorPresente;

    // 3. BASE DE COMISSÃO (LÍQUIDO REAL)
    // Liquido = (Venda Total - Indicador - Custo Financeiro)
    // Nota: Em tese, (Venda Total - Indicador) = Valor Base. 
    // Então Liquido = Valor Base - Custo Financeiro.
    const baseComissao = (valorVenda - valorIndicador) - custoFinanceiro;

    setTotais({
        somaItens,
        valorIndicador,
        valorVenda,
        custoFinanceiro,
        baseComissao
    });
  };

  const adicionarItem = () => {
    if (!novoItem.ambiente || !novoItem.valor) return notificar.erro("Preencha ambiente e valor.");
    setItens([...itens, { ...novoItem, id: Date.now(), valor: parseFloat(novoItem.valor) }]);
    setNovoItem({ ambiente: '', descricao: '', valor: '' });
  };

  const removerItem = (id) => {
    setItens(itens.filter(i => i.id !== id));
  };

  const salvarOrcamento = async () => {
    if (!cliente) return notificar.erro("Selecione um cliente.");
    if (itens.length === 0) return notificar.erro("Adicione itens ao orçamento.");

    setLoading(true);
    try {
        // Busca ID do cliente pelo nome (ou use ID direto se mudar o select)
        const clienteObj = clientesDb.find(c => c.nome === cliente);
        
        const payload = {
            cliente_id: clienteObj?.id,
            status: 'orcamento', // Começa como orçamento
            itens_venda: itens,
            valor_total: totais.valorVenda, // Valor Cheio
            
            // Dados Financeiros Avançados
            indicador_nome: financeiro.temIndicador ? financeiro.nomeIndicador : null,
            indicador_pct: financeiro.temIndicador ? financeiro.pctIndicador : 0,
            valor_indicador: totais.valorIndicador,
            
            parcelas: financeiro.parcelas,
            custo_financeiro: totais.custoFinanceiro,
            valor_liquido_comissao: totais.baseComissao
        };

        const { error } = await supabase.from('contratos').insert([payload]);
        if (error) throw error;

        notificar.sucesso("Orçamento gerado com sucesso!");
        navigate('/comercial'); // Volta pro comercial

    } catch (err) {
        notificar.erro("Erro: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 p-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Calculator className="text-blue-600"/> Novo Orçamento
            </h1>
            <p className="text-slate-500 font-medium">Simulação financeira e formação de preço.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: DADOS E ITENS (2/3 da tela) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Cliente */}
            <div className="card bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={20} className="text-blue-500"/> Cliente</h3>
                <div className="relative">
                    <input 
                        list="lista-clientes"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="Buscar ou digitar nome..."
                        value={cliente}
                        onChange={e => setCliente(e.target.value)}
                    />
                    <datalist id="lista-clientes">
                        {clientesDb.map(c => <option key={c.id} value={c.nome} />)}
                    </datalist>
                </div>
            </div>

            {/* 2. Itens do Projeto */}
            <div className="card bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={20} className="text-orange-500"/> Ambientes & Valores (Tabela)</h3>
                
                {/* Form Adicionar */}
                <div className="flex flex-col md:flex-row gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input 
                        className="flex-1 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-sm"
                        placeholder="Ambiente (ex: Cozinha)"
                        value={novoItem.ambiente}
                        onChange={e => setNovoItem({...novoItem, ambiente: e.target.value})}
                    />
                    <input 
                        type="number"
                        className="w-32 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-sm"
                        placeholder="Valor R$"
                        value={novoItem.valor}
                        onChange={e => setNovoItem({...novoItem, valor: e.target.value})}
                    />
                    <button onClick={adicionarItem} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-all shadow-md">
                        <Plus size={20}/>
                    </button>
                </div>

                {/* Lista */}
                <div className="space-y-2">
                    {itens.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                            <span className="font-bold text-slate-700">{item.ambiente}</span>
                            <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-slate-600">{BRL(item.valor)}</span>
                                <button onClick={() => removerItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {itens.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhum item adicionado.</p>}
                </div>
                
                {itens.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500 uppercase">Total Tabela</span>
                        <span className="text-xl font-black text-slate-800">{BRL(totais.somaItens)}</span>
                    </div>
                )}
            </div>

            {/* 3. Condições Comerciais */}
            <div className="card bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><DollarSign size={20} className="text-green-600"/> Condições Comerciais</h3>
                
                <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Indicador */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><User size={16}/> Parceiro Indicador?</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={financeiro.temIndicador} onChange={e => setFinanceiro({...financeiro, temIndicador: e.target.checked})} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        {financeiro.temIndicador && (
                            <div className="animate-slide-down bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100">
                                <input 
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm outline-none"
                                    placeholder="Nome do Parceiro"
                                    value={financeiro.nomeIndicador}
                                    onChange={e => setFinanceiro({...financeiro, nomeIndicador: e.target.value})}
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-blue-700">Comissão (%):</span>
                                    <input 
                                        type="number" className="w-20 p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none text-center"
                                        value={financeiro.pctIndicador}
                                        onChange={e => setFinanceiro({...financeiro, pctIndicador: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div className="text-right text-xs text-blue-600 font-bold">
                                    + {BRL(totais.valorIndicador)} (Add ao Valor)
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagamento */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Calendar size={16}/> Parcelamento</label>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Qtd Parcelas</span>
                                <span className="text-lg font-black text-slate-800">{financeiro.parcelas}x</span>
                            </div>
                            <input 
                                type="range" min="1" max="24" step="1"
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                value={financeiro.parcelas}
                                onChange={e => setFinanceiro({...financeiro, parcelas: parseInt(e.target.value)})}
                            />
                            <div className="mt-3 flex justify-between items-center text-xs text-slate-400">
                                <span>Taxa Juros: {config.taxa_juros_mensal}% a.m.</span>
                                {financeiro.parcelas > 1 && <span className="text-red-400 font-bold">Custo: - {BRL(totais.custoFinanceiro)}</span>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>

        {/* COLUNA DIREITA: RESUMO FLUTUANTE (1/3 da tela) */}
        <div className="lg:col-span-1">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl sticky top-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CheckCircle className="text-green-400"/> Resumo Final</h2>
                
                <div className="space-y-4 text-sm mb-8">
                    <div className="flex justify-between opacity-70">
                        <span>Soma Itens (Base)</span>
                        <span>{BRL(totais.somaItens)}</span>
                    </div>
                    
                    {financeiro.temIndicador && (
                        <div className="flex justify-between text-blue-300 font-bold">
                            <span>+ Indicador ({financeiro.pctIndicador}%)</span>
                            <span>{BRL(totais.valorIndicador)}</span>
                        </div>
                    )}

                    <div className="h-px bg-white/20 my-2"></div>

                    <div className="flex justify-between text-xl font-bold text-white">
                        <span>Valor Venda</span>
                        <span>{BRL(totais.valorVenda)}</span>
                    </div>
                    
                    <div className="text-right text-xs text-white/50">
                        {financeiro.parcelas}x de {BRL(totais.valorVenda / financeiro.parcelas)}
                    </div>

                    <div className="bg-white/10 p-3 rounded-xl mt-4 space-y-2 border border-white/10">
                        <div className="flex justify-between text-red-300 text-xs">
                            <span>(-) Custo Financeiro</span>
                            <span>{BRL(totais.custoFinanceiro)}</span>
                        </div>
                        <div className="flex justify-between text-green-400 font-bold border-t border-white/10 pt-2">
                            <span>Base Comissão</span>
                            <span>{BRL(totais.baseComissao)}</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={salvarOrcamento} 
                    disabled={loading || itens.length === 0}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
                >
                    {loading ? 'Salvando...' : <><Save size={20}/> Gerar Orçamento</>}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}