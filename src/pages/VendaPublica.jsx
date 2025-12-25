import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { CheckCircle, ShieldCheck, FileText, Loader2, Lock } from 'lucide-react';
import { BRL, notificar } from '../utils';

export default function VendaPublica() {
  const { id } = useParams();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [aprovado, setAprovado] = useState(false);

  useEffect(() => {
    carregarVenda();
  }, [id]);

  async function carregarVenda() {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, clientes(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data.status === 'aprovado') setAprovado(true);

      // Tratamento dos dados JSON
      if (data.itens_venda && typeof data.itens_venda === 'string') data.itens_venda = JSON.parse(data.itens_venda);
      if (data.condicoes_pagamento && typeof data.condicoes_pagamento === 'string') data.condicoes_pagamento = JSON.parse(data.condicoes_pagamento);

      setVenda(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function aprovarContrato() {
    setEnviando(true);
    try {
      // Captura de metadados para validade jurídica simples
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();

      const assinaturaLog = {
        data: new Date().toISOString(),
        ip: ipData.ip,
        userAgent: navigator.userAgent,
        status: 'Aprovado pelo Cliente'
      };

      const { error } = await supabase
        .from('contratos')
        .update({ 
          status: 'aprovado',
          assinatura_digital_log: assinaturaLog,
          data_aprovacao: new Date()
        })
        .eq('id', id);

      if (error) throw error;
      setAprovado(true);
      notificar.sucesso("Contrato aprovado com sucesso!");
    } catch (err) {
      notificar.erro("Falha ao registrar aprovação.");
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">CARREGANDO CONTRATO...</div>;
  if (!venda) return <div className="min-h-screen flex items-center justify-center font-black text-red-500 uppercase">Contrato não encontrado.</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* HEADER DE SEGURANÇA */}
      <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black uppercase tracking-tighter">TEMPORI</h1>
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
            <Lock size={12} /> Conexão Segura
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 mt-8">
        {aprovado ? (
          <div className="bg-white p-12 rounded-[3rem] shadow-xl text-center border-t-8 border-green-500">
            <div className="inline-flex p-6 bg-green-100 rounded-full text-green-600 mb-6">
              <CheckCircle size={64} />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Contrato Assinado!</h2>
            <p className="text-slate-500 font-bold mb-8">Olá, {venda.clientes?.nome}. Sua aprovação digital foi registrada com sucesso e o projeto já foi encaminhado para nossa engenharia.</p>
            <div className="bg-slate-50 p-6 rounded-2xl border text-left inline-block">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Protocolo de Assinatura</p>
              <p className="text-xs font-mono break-all">{btoa(venda.id).substring(0, 32)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-lg border border-slate-100">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8 border-b pb-4">Resumo do Pedido</h2>
              
              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Contrato</p>
                  <p className="font-bold">#{venda.numero_contrato}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Valor Total</p>
                  <p className="font-black text-blue-600 text-xl">{BRL(venda.valor_total)}</p>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                <p className="text-[10px] font-black text-slate-400 uppercase">Ambientes Contratados</p>
                {venda.itens_venda?.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-3 bg-slate-50 rounded-xl font-bold uppercase text-xs italic">
                    <span>{item.ambiente}</span>
                    <span>{BRL(item.valor)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                <ShieldCheck className="text-blue-600 shrink-0" size={24} />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Ao clicar em <strong>"Aprovar Contrato"</strong>, você declara estar de acordo com todas as cláusulas e condições descritas no contrato físico/digital enviado pela <strong>Tempori Planejados</strong>, registrando sua assinatura através deste dispositivo.
                </p>
              </div>
            </div>

            <button 
              onClick={aprovarContrato}
              disabled={enviando}
              className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter shadow-2xl hover:bg-slate-800 transition-all flex justify-center items-center gap-4 active:scale-95"
            >
              {enviando ? <Loader2 className="animate-spin" /> : <><FileText /> Aprovar Contrato Agora</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}