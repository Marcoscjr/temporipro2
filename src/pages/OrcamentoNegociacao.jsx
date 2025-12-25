import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Printer, CheckCircle, Calculator, ArrowLeft, Loader2, Save, 
  Calendar, Plus, Trash2, User, MapPin, X, AlertTriangle
} from 'lucide-react';
import { notificar, BRL } from '../utils';

// --- FUNÇÕES AUXILIARES ---
const validarCPF = (cpf) => {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

const mascaraCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14);
const mascaraTelefone = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
const mascaraCEP = (v) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);

export default function OrcamentoNegociacao() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [dadosIniciais] = useState(state?.orcamento || null);
  const [config] = useState(dadosIniciais?.config || { taxa_juros_mensal: 0, desconto_maximo: 10 });

  const precoVendaBase = useMemo(() => {
    if (!dadosIniciais) return 0;
    const somaAmbientes = dadosIniciais.itens.filter(i => i.selecionado).reduce((acc, i) => acc + i.valor, 0);
    if (dadosIniciais.comissaoIndicador > 0) {
        return somaAmbientes / (1 - (dadosIniciais.comissaoIndicador / 100));
    }
    return somaAmbientes;
  }, [dadosIniciais]);

  const [descontoPct, setDescontoPct] = useState(dadosIniciais?.dadosSalvos?.descontoPct || 0);
  const [descontoValor, setDescontoValor] = useState(dadosIniciais?.dadosSalvos?.descontoValor || 0);
  const [pagamentos, setPagamentos] = useState(dadosIniciais?.dadosSalvos?.listaPagamentos || []);
  const [novaForma, setNovaForma] = useState({ metodo: 'Pix', valor: '', data: new Date().toISOString().split('T')[0], parcelas: 1 });

  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [dadosCliente, setDadosCliente] = useState({ nome: '', cpf: '', telefone: '', email: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });

  useEffect(() => {
    if (!state?.orcamento) { navigate('/comercial'); return; }
    const carregarCliente = async () => {
        if(dadosIniciais?.clienteId) {
            const { data } = await supabase.from('clientes').select('*').eq('id', dadosIniciais.clienteId).single();
            if(data) setDadosCliente({ 
                nome: data.nome || '', 
                cpf: data.cpf_cnpj || '', 
                telefone: data.telefone || '', 
                email: data.email || '', 
                cep: data.cep || '', 
                endereco: data.endereco_completo?.split(',')[0] || '', 
                numero: '', 
                complemento: '', 
                bairro: '', 
                cidade: data.cidade || '', 
                uf: data.uf || '' 
            });
        }
    };
    carregarCliente();
  }, [state, navigate, dadosIniciais]);

  if (!dadosIniciais) return null;

  const updateDescontoPorPct = (pct) => { 
      const p = parseFloat(pct) || 0; 
      setDescontoPct(p); 
      setDescontoValor((precoVendaBase * (p / 100))); 
  };

  const updateDescontoPorValor = (val) => { 
      const v = parseFloat(val) || 0; 
      setDescontoValor(v); 
      setDescontoPct(precoVendaBase > 0 ? (v / precoVendaBase) * 100 : 0); 
  };
  
  const valorFinal = precoVendaBase - descontoValor;
  const totalAlocado = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const restante = valorFinal - totalAlocado;
  const saldoZerado = Math.abs(restante) < 1.00; // Tolerância de 1 real

  const handleMetodoChange = (novoMetodo) => {
      let novaData = new Date();
      if (['Boleto', 'Cartão Crédito', 'Cheque'].includes(novoMetodo)) novaData.setDate(novaData.getDate() + 30);
      setNovaForma({ ...novaForma, metodo: novoMetodo, data: novaData.toISOString().split('T')[0], parcelas: 1 });
  };

  const adicionarPagamento = () => {
      const valorTotal = parseFloat(novaForma.valor);
      if (!valorTotal || valorTotal <= 0) return notificar.erro("Valor inválido");
      
      const qtdParcelas = parseInt(novaForma.parcelas) || 1;
      const valorParcela = valorTotal / qtdParcelas;
      const novos = [];

      for (let i = 0; i < qtdParcelas; i++) {
          const dt = new Date(novaForma.data);
          if (i > 0) dt.setDate(dt.getDate() + (i * 30));
          novos.push({ 
              id: Date.now() + i, 
              metodo: novaForma.metodo, 
              valor: valorParcela, 
              data: dt.toISOString().split('T')[0], 
              obs: qtdParcelas > 1 ? `${i+1}/${qtdParcelas}` : 'À vista' 
          });
      }
      setPagamentos([...pagamentos, ...novos].sort((a, b) => new Date(a.data) - new Date(b.data)));
      setNovaForma({ ...novaForma, valor: '', parcelas: 1 });
  };
  
  const removerPagamento = (id) => setPagamentos(pagamentos.filter(p => p.id !== id));

  const aplicarDiferencaComoDesconto = () => { if (restante > 0) updateDescontoPorValor((descontoValor + restante).toFixed(2)); };

  const buscarCEP = async (cep) => {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) return;
      setLoading(true);
      try {
          const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
          const data = await res.json();
          if (!data.erro) setDadosCliente(prev => ({ ...prev, endereco: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf }));
      } catch (e) { notificar.erro("CEP inválido."); } finally { setLoading(false); }
  };

  const handleFecharVenda = () => {
      if (!saldoZerado) return notificar.erro(`Distribua o saldo restante.`);
      setModalClienteAberto(true);
  };

  const salvarTudo = async () => {
      // Validação campos básicos
      if (!dadosCliente.nome || !dadosCliente.cpf) {
          return notificar.erro("Nome e CPF são obrigatórios.");
      }

      setLoading(true);
      try {
          // 1. GERAÇÃO NÚMERO CONTRATO
          const ano = new Date().getFullYear();
          const { data: ex } = await supabase.from('contratos').select('numero_contrato').like('numero_contrato', `%/${ano}`);
          let num = 51;
          if (ex?.length) { 
              const nums = ex.map(c => parseInt(c.numero_contrato?.split('/')[0])).filter(n => !isNaN(n)); 
              if(nums.length) num = Math.max(...nums) + 1; 
          }
          const numFinal = `${num}/${ano}`;

          // 2. ENDEREÇO E CLIENTE
          const enderecoFull = `${dadosCliente.endereco}, ${dadosCliente.numero} ${dadosCliente.complemento ? '- ' + dadosCliente.complemento : ''} - ${dadosCliente.bairro}`;
          const { error: errorCli } = await supabase.from('clientes').update({ 
              nome: dadosCliente.nome, 
              cpf_cnpj: dadosCliente.cpf, 
              telefone: dadosCliente.telefone, 
              email: dadosCliente.email, 
              cep: dadosCliente.cep, 
              endereco_completo: enderecoFull, 
              cidade: dadosCliente.cidade, 
              uf: dadosCliente.uf 
          }).eq('id', dadosIniciais.clienteId);

          if (errorCli) throw new Error("Erro ao atualizar cliente: " + errorCli.message);

          // 3. FINANCEIRO
          let vpTotal = 0; 
          const taxaDia = (config.taxa_juros_mensal || 0) / 30 / 100;
          pagamentos.forEach(p => vpTotal += p.valor / Math.pow(1 + taxaDia, Math.max(0, (new Date(p.data) - new Date()) / 86400000)));
          
          const custoFin = valorFinal - vpTotal;
          const valIndicador = valorFinal - (valorFinal * (1 - (dadosIniciais.comissaoIndicador / 100)));
          const custoFabrica = dadosIniciais.itens.reduce((acc, item) => acc + (parseFloat(item.valorOriginal) || 0), 0);

          // 4. PAYLOAD
          const payload = {
              cliente_id: dadosIniciais.clienteId, 
              vendedor_id: dadosIniciais.vendedorId,
              criado_por: dadosIniciais.vendedorEmail,
              status: 'venda', 
              itens_venda: dadosIniciais.itens.filter(i=>i.selecionado),
              valor_total: valorFinal, 
              condicoes_pagamento: pagamentos, 
              custo_financeiro: Number(custoFin.toFixed(2)),
              indicador_nome: dadosIniciais.parceiroNome || null,
              indicador_pct: dadosIniciais.comissaoIndicador || 0, 
              valor_indicador: Number(valIndicador.toFixed(2)),
              custo_total: Number(custoFabrica.toFixed(2)),
              numero_contrato: numFinal,
              updated_at: new Date()
          };

          // 5. SALVAR CONTRATO
          const { data, error: errorContrato } = await supabase.from('contratos').insert([payload]).select();
          
          if (errorContrato) {
              console.error("Erro Supabase Contrato:", errorContrato);
              throw new Error(errorContrato.message);
          }

          if (data) {
              notificar.sucesso("Venda finalizada!");
              navigate(`/contrato/${data[0].id}`);
          }

      } catch (err) { 
          console.error("ERRO FINAL:", err);
          notificar.erro(err.message); 
      } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col lg:flex-row gap-8 pb-20 font-sans relative">
        <div className="flex-1 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <button 
                onClick={() => navigate('/novo-orcamento', { state: { orcamento: { ...dadosIniciais, dadosSalvos: { listaPagamentos: pagamentos, descontoValor, descontoPct } } } })} 
                className="mb-8 flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
                <ArrowLeft size={16}/> Voltar para Engenharia
            </button>
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-10">Negociação Comercial</h2>
            
            <div className="space-y-4 mb-10">
                {dadosIniciais.itens.filter(i=>i.selecionado).map(i => {
                    const valorComRTItem = dadosIniciais.comissaoIndicador > 0 ? i.valor / (1 - (dadosIniciais.comissaoIndicador / 100)) : i.valor;
                    return (
                        <div key={i.id} className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="font-black text-slate-700 uppercase text-xs">{i.ambiente}</span>
                            <span className="font-black text-slate-900">{BRL(valorComRTItem)}</span>
                        </div>
                    );
                })}
            </div>

            <div className="border-t pt-10 flex justify-between items-end">
                <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Valor da Proposta</p><p className="text-5xl font-black text-slate-900 italic tracking-tighter">{BRL(valorFinal)}</p></div>
                {descontoPct > 0 && <div className="text-right bg-green-50 px-4 py-2 rounded-2xl border border-green-100"><p className="text-xl font-black text-green-600">-{BRL(descontoValor)}</p></div>}
            </div>
            <div className="mt-12">
                <h4 className="font-black text-slate-800 mb-6 text-xs uppercase tracking-[0.2em] italic flex items-center gap-2"><Calendar size={16} className="text-blue-500"/> Fluxo de Recebimento</h4>
                <div className="grid gap-3">
                    {pagamentos.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-blue-500">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{p.metodo}</p>
                                <p className="font-black text-slate-800 text-sm">{new Date(p.data).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">{p.obs}</span>
                                <p className="font-black text-slate-900 text-lg tracking-tight">{BRL(p.valor)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="w-full lg:w-[450px] space-y-6">
            <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl border-4 border-slate-800 sticky top-4 h-fit">
                <h3 className="text-xl font-black mb-8 uppercase italic tracking-tighter flex gap-2"><Calculator className="text-blue-400"/> Cockpit Financeiro</h3>
                
                <div className="bg-slate-800 p-6 rounded-[2rem] mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Aplicar Desconto</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <input type="number" className="w-full bg-slate-900 p-3 rounded-xl text-center font-black" value={descontoPct.toFixed(1)} onChange={e => updateDescontoPorPct(e.target.value)} />
                            <span className="absolute right-3 top-3 text-slate-500">%</span>
                        </div>
                        <div className="relative">
                            <input type="number" className="w-full bg-slate-900 p-3 rounded-xl text-center font-black" value={descontoValor.toFixed(0)} onChange={e => updateDescontoPorValor(e.target.value)} />
                            <span className="absolute left-3 top-3 text-slate-500 text-xs">R$</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-[2rem] mb-6">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-4"><span>Pagamento</span><span className={saldoZerado?'text-green-400':'text-red-400'}>Falta: {BRL(restante)}</span></div>
                    {!saldoZerado && restante > 0 && <button onClick={aplicarDiferencaComoDesconto} className="w-full mb-4 text-[10px] bg-blue-500/20 text-blue-400 py-3 rounded-xl border border-blue-500/30 hover:bg-blue-500/30 font-black transition-all uppercase">Aplicar Diferença como Desconto</button>}
                    <div className="space-y-3">
                        <select className="w-full bg-slate-900 p-3 rounded-xl font-black text-xs uppercase outline-none" value={novaForma.metodo} onChange={e => handleMetodoChange(e.target.value)}><option>Pix</option><option>Boleto</option><option>Cartão Crédito</option><option>Cheque</option><option>Dinheiro</option></select>
                        <div className="flex gap-2">
                            <input type="number" className="flex-1 bg-slate-900 p-3 rounded-xl font-black text-sm outline-none" placeholder="Valor" value={novaForma.valor} onChange={e => setNovaForma({...novaForma, valor: e.target.value})} />
                            {['Boleto', 'Cartão Crédito', 'Cheque'].includes(novaForma.metodo) && (
                                <select className="w-24 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black p-3" value={novaForma.parcelas} onChange={e => setNovaForma({...novaForma, parcelas: e.target.value})}>
                                    {[...Array(24)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                                </select>
                            )}
                            <button onClick={adicionarPagamento} className="bg-blue-600 px-4 rounded-xl hover:bg-blue-500 transition-all"><Plus size={20}/></button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto mb-10 pr-2 custom-scrollbar">
                    {pagamentos.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700">
                            <div className="flex-1 text-[10px] font-black uppercase"><div>{p.metodo} {p.obs !== 'À vista' && `(${p.obs})`} - {BRL(p.valor)}</div><div className="text-slate-500">{new Date(p.data).toLocaleDateString()}</div></div>
                            <button onClick={() => removerPagamento(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>

                <button onClick={handleFecharVenda} disabled={!saldoZerado || loading} className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-xl flex justify-center gap-3 uppercase italic tracking-tighter ${saldoZerado ? 'bg-green-600 hover:bg-green-500 shadow-green-900/40' : 'bg-slate-800 opacity-40 cursor-not-allowed'}`}>
                    {loading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={22}/> Confirmar Venda</>}
                </button>
            </div>
        </div>

        {modalClienteAberto && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[3rem]">
                        <div><h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-3"><User className="text-blue-500"/> Cadastro do Cliente</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Formalização técnica e fiscal.</p></div>
                        <button onClick={() => setModalClienteAberto(false)} className="p-3 bg-white hover:bg-red-50 hover:text-red-500 rounded-full shadow-sm transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-10 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.nome} onChange={e => setDadosCliente({...dadosCliente, nome: e.target.value})} placeholder="Nome Completo *" />
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.cpf} onChange={e => setDadosCliente({...dadosCliente, cpf: mascaraCPF(e.target.value)})} placeholder="CPF/CNPJ *" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.telefone} onChange={e => setDadosCliente({...dadosCliente, telefone: mascaraTelefone(e.target.value)})} placeholder="Telefone *" />
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.email} onChange={e => setDadosCliente({...dadosCliente, email: e.target.value})} placeholder="Email" />
                        </div>
                        <div className="pt-4 border-t border-slate-50"><h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2"><MapPin size={16}/> Endereço</h4></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.cep} onChange={e => {setDadosCliente({...dadosCliente, cep: mascaraCEP(e.target.value)}); if(e.target.value.length >= 9) buscarCEP(e.target.value)}} placeholder="CEP *" />
                            <input className="md:col-span-2 w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.endereco} onChange={e => setDadosCliente({...dadosCliente, endereco: e.target.value})} placeholder="Rua *" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.numero} onChange={e => setDadosCliente({...dadosCliente, numero: e.target.value})} placeholder="Núm *" />
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.bairro} onChange={e => setDadosCliente({...dadosCliente, bairro: e.target.value})} placeholder="Bairro *" />
                            <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={dadosCliente.complemento} onChange={e => setDadosCliente({...dadosCliente, complemento: e.target.value})} placeholder="Compl" />
                        </div>
                    </div>
                    <div className="p-8 border-t bg-slate-50 rounded-b-[3rem] flex justify-end">
                        <button onClick={salvarTudo} disabled={loading} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-blue-500 flex items-center gap-3 transition-all active:scale-95 uppercase italic tracking-tighter">
                           {loading ? <Loader2 className="animate-spin"/> : <><Save size={22}/> Confirmar e Gerar Contrato</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}