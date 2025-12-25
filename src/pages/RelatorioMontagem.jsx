import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, Printer, Box, CheckSquare, MapPin, User } from 'lucide-react';
import { BRL } from '../utils';

export default function RelatorioMontagem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venda, setVenda] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    try {
      const { data: vendaData } = await supabase.from('contratos').select('*, clientes(*)').eq('id', id).single();
      const { data: checkData } = await supabase.from('checklists_montagem').select('*').eq('contrato_id', id).single();
      
      setVenda(vendaData);
      setChecklist(checkData);
      setLoading(false);
    } catch (err) {
      navigate('/comercial');
    }
  }

  if (loading) return <div className="p-20 text-center font-black uppercase text-slate-400 animate-pulse">Gerando Ordem de Montagem...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans print:bg-white print:pb-0">
      {/* BARRA DE AÇÕES (ESCONDIDA NA IMPRESSÃO) */}
      <div className="max-w-4xl mx-auto p-6 flex justify-between items-center print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-all">
          <ArrowLeft size={16}/> Voltar
        </button>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
          <Printer size={18}/> Imprimir Ordem
        </button>
      </div>

      {/* DOCUMENTO A4 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-[15mm] min-h-[297mm] print:shadow-none print:p-0">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-600 p-1.5 rounded-lg"><Box size={20} className="text-white" strokeWidth={3} /></div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Tempori<span className="text-blue-600">Pro</span></span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Relatório Técnico de Montagem</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900 uppercase italic">Contrato #{venda.numero_contrato || venda.id}</h2>
            <p className="text-xs font-bold text-slate-500 italic">Data de Emissão: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* DADOS DO CLIENTE / LOCAL */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><User size={14}/> Cliente</h3>
            <p className="text-sm font-black text-slate-800 uppercase leading-tight">{venda.clientes?.nome}</p>
            <p className="text-xs font-bold text-slate-500">{venda.clientes?.telefone || 'Telefone não informado'}</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Local da Instalação</h3>
            <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">
                {venda.clientes?.endereco || 'Endereço não cadastrado'}
            </p>
          </div>
        </div>

        {/* LISTA DE AMBIENTES E ITENS */}
        <div className="mb-10">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Itens para Instalação</h3>
          <div className="space-y-6">
            {venda.itens_venda?.map((item, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-slate-900 uppercase text-xs tracking-tight italic">{item.ambiente}</p>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{item.detalhes?.length || 0} Itens</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {item.detalhes?.map((det, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] font-bold text-slate-600 border-b border-slate-100/50 py-1">
                      <span>• {det.quantidade}x {det.descricao}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHECKLIST TÉCNICO */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Checklist de Qualidade</h3>
            <div className="space-y-2">
              {checklist ? (
                Object.entries(checklist.itens_concluidos).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-700">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${val ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200'}`}>
                      {val && <CheckSquare size={10}/>}
                    </div>
                    {key.replace(/_/g, ' ')}
                  </div>
                ))
              ) : (
                <p className="text-[9px] font-bold text-slate-400 italic uppercase">Checklist não preenchido no sistema</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Pendências / Observações</h3>
            <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                {checklist?.observacoes || 'Nenhuma observação técnica registrada.'}
            </p>
          </div>
        </div>

        {/* ÁREA DE ASSINATURA */}
        <div className="mt-auto pt-20">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Assinatura do Montador</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Responsável Técnico</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Recebido por: {venda.clientes?.nome}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase text-center">Termo de Aceite e Conformidade</p>
              </div>
            </div>
          </div>
          <div className="mt-12 p-4 bg-slate-50 rounded-xl">
             <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-relaxed">
               Ao assinar este documento, o cliente declara que o projeto foi montado em conformidade com o projeto técnico aprovado e que os itens de acabamento foram revisados no ato da entrega.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}