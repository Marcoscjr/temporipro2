import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer, ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { BRL } from '../utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

export default function DetalhesContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);

  const urlVenda = `${window.location.origin}/venda-publica/${id}`;

  useEffect(() => {
    carregarContrato();
  }, [id]);

  async function carregarContrato() {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, clientes(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Tratamento robusto para campos JSON que podem vir como string ou objeto
      let condPagto = data.condicoes_pagamento;
      let itensVenda = data.itens_venda;

      if (typeof condPagto === 'string') {
        try { condPagto = JSON.parse(condPagto); } catch (e) { condPagto = []; }
      }
      if (typeof itensVenda === 'string') {
        try { itensVenda = JSON.parse(itensVenda); } catch (e) { itensVenda = []; }
      }

      setVenda({
        ...data,
        condicoes_pagamento: condPagto,
        itens_venda: itensVenda
      });
    } catch (err) {
      console.error("Erro ao carregar contrato:", err);
      // Não redireciona imediatamente para permitir que o usuário tente novamente em caso de falha de rede
    } finally {
      setLoading(false);
    }
  }

  const gerarPDF = async () => {
    const input = document.getElementById('contrato-impressao');
    if (!input) return;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const sections = input.querySelectorAll('.page-break');
    
    setLoading(true);
    try {
      for (let i = 0; i < sections.length; i++) {
        const canvas = await html2canvas(sections[i], { 
          scale: 2, 
          useCORS: true,
          logging: false 
        });
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      pdf.save(`Contrato_Tempori_${venda.numero_contrato}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !venda) return <div className="p-20 text-center font-black uppercase text-slate-400 animate-pulse">Carregando dados do contrato...</div>;
  if (!venda) return <div className="p-20 text-center text-red-500 font-bold uppercase">Erro de conexão com o banco. Verifique sua rede e tente novamente.</div>;

  // LÓGICA DE AJUSTE DE VALOR (CORREÇÃO DA DIVERGÊNCIA)
  // Calculamos a soma dos itens originais para descobrir o quanto eles representam do total negociado
  const somaItensOriginal = venda.itens_venda?.reduce((acc, item) => acc + (Number(item.valor) || 0), 0) || 0;
  
  // Se houver soma, aplicamos a proporção. Se não (divisão por zero), usamos o valor original.
  const fatorAjuste = (somaItensOriginal > 0) ? (venda.valor_total / somaItensOriginal) : 1;

  return (
    <div className="min-h-screen bg-slate-100 pb-20 print:bg-white print:pb-0 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto p-6 flex flex-wrap gap-4 justify-between items-center print:hidden">
        <button onClick={() => navigate('/comercial')} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase hover:text-slate-800 transition-all">
          <ArrowLeft size={16}/> Voltar
        </button>
        <div className="flex gap-3">
          <button onClick={gerarPDF} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
            <FileText size={18}/> Salvar PDF
          </button>
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all">
            <Printer size={18}/> Imprimir
          </button>
        </div>
      </div>

      <div id="contrato-impressao" className="max-w-[210mm] mx-auto space-y-10 print:space-y-0 shadow-2xl print:shadow-none">
        
        {/* PÁGINA 1: QUADRO RESUMO */}
        <section className="bg-white p-[15mm] min-h-[297mm] page-break flex flex-col">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">TEMPORI</h1>
              <div className="text-[10px] font-bold text-slate-500 leading-tight mt-1 uppercase">
                <p>TEMPORI PLANEJADOS LTDA</p>
                <p>CNPJ: 32.255.794/0001-20</p>
                <p>Av. Governador Osman Loureiro, 3506</p>
                <p>Mangabeira - Maceió - AL | (82) 3313-0012</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-xs font-black text-slate-400 uppercase">CONTRATO N.º</p>
              <h2 className="text-2xl font-black text-blue-600">{venda.numero_contrato}</h2>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">DATA: {new Date(venda.created_at).toLocaleDateString('pt-BR')}</p>
              <div className="mt-4 p-2 border rounded-lg bg-white">
                <QRCodeSVG value={urlVenda} size={60} />
                <p className="text-[6px] font-black uppercase mt-1 text-center">Autenticidade</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-y-4 gap-x-8 mb-8 text-[11px] border p-6 rounded-2xl border-slate-100">
            <div className="col-span-2"><label className="font-black text-slate-400 uppercase text-[9px] block">CONTRATANTE / CLIENTE</label><span className="font-bold uppercase">{venda.clientes?.nome}</span></div>
            <div><label className="font-black text-slate-400 uppercase text-[9px] block">CPF/CNPJ</label><span className="font-bold">{venda.clientes?.cpf_cnpj}</span></div>
            <div className="col-span-2"><label className="font-black text-slate-400 uppercase text-[9px] block">ENDEREÇO DE ENTREGA</label><span className="font-bold uppercase">{venda.clientes?.endereco_completo}</span></div>
            <div><label className="font-black text-slate-400 uppercase text-[9px] block">CIDADE/UF</label><span className="font-bold uppercase">{venda.clientes?.cidade} - {venda.clientes?.uf}</span></div>
          </div>

          <div className="mb-8 flex-1">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] font-black italic">
                  <th className="p-3 w-12 text-center">ITEM</th>
                  <th className="p-3">DESCRIÇÃO AMBIENTE/PRODUTO</th>
                  <th className="p-3 w-24 text-center">PRAZO</th>
                  <th className="p-3 w-32 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody className="border border-slate-200">
                {venda.itens_venda?.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-black uppercase">{item.ambiente}</td>
                    <td className="p-3 text-center">60 dias</td>
                    {/* APLICAÇÃO DO AJUSTE PROPORCIONAL AO VALOR NEGOCIADO */}
                    <td className="p-3 text-right font-bold">{BRL(Number(item.valor) * fatorAjuste)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black italic text-slate-900">
                  <td colSpan="3" className="p-4 text-right uppercase">TOTAL DO PEDIDO:</td>
                  <td className="p-4 text-right text-base border-l border-white bg-slate-100">{BRL(venda.valor_total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-8">
            <div className="bg-slate-900 text-white p-2 text-[10px] font-black uppercase text-center italic">CONDIÇÃO DE PAGAMENTO</div>
            <table className="w-full text-[10px] text-left">
              <thead>
                <tr className="bg-slate-100 font-black uppercase text-slate-400 border-b border-slate-200">
                  <th className="p-3">PARCELA</th>
                  <th className="p-3">VENCIMENTO</th>
                  <th className="p-3 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody>
                {venda.condicoes_pagamento?.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 font-bold italic text-slate-700">
                    <td className="p-3">{i === 0 ? 'Entrada' : i}</td>
                    <td className="p-3">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-right font-black">{BRL(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-[8px] text-slate-400 font-black uppercase">Página 1 de 5</p>
        </section>

        {/* PÁGINAS JURÍDICAS IPSIS LITTERIS (2 A 5) */}
        <section className="bg-white p-[20mm] min-h-[297mm] page-break text-[10px] leading-[1.3] text-slate-700 text-justify flex flex-col shadow-xl print:shadow-none">
          <div className="text-center mb-6">
             <h1 className="text-xl font-black tracking-tighter uppercase">TEMPORI</h1>
             <h2 className="text-sm font-black uppercase border-b-2 border-slate-900 inline-block pb-1 mt-4">
                CONTRATO DE COMPRA E VENDA DE PRODUTOS E DE PRESTAÇÃO DE SERVIÇOS
             </h2>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <p className="font-black uppercase mb-1">CLAUSULA PRIMEIRA - PARTES CONTRATANTES</p>
              <p>1.1 O CONTRATANTE, conforme descrito no pedido anexo, que integra e possui o mesmo número deste CONTRATO DE COMPRA E VENDA DE PRODUTOS E DE PRESTAÇÃO DE SERVIÇOS, na melhor forma de direito, contrata em caráter irrevogável e irretratável a empresa TEMPORI PLANEJADOS LTDA, pessoa jurídica de direito privado, cessionária exclusiva da marca TEMPORI, com sede a RUA DOUTOR JOSÉ AFFONSO DE MELLO - JATIÚCA - MACEIÓ - AL, inscrita no CNPJ 32.255.794/0001-20, doravante denominada simplesmente CONTRATADA, para vender e faturar diretamente em nome do CONTRATANTE os produtos descritos no pedido supracitado e os serviços pertinentes, conforme cláusulas e condições abaixo descritas.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA SEGUNDA - OBJETO E PREÇO</p>
              <p>2.1 O CONTRATANTE através dos pagamentos descritos no pedido anexo, integrante deste contrato, e providências contratuais complementares também constantes no presente contrato, receberá os produtos descritos e de fabricação das empresas mencionadas no pedido supracitado bem como a prestação dos serviços pertinentes, de acordo com os projetos anexos, os quais, vistados pelas partes, integram e constituem compromissos únicos deste contrato.</p>
              <p>2.2 SERVIÇOS: Atendimento e interpretação das necessidades do cliente, através da demonstração de produtos na loja, orientação técnica e comercial, desenvolvimento de projetos, conferência das medidas do local de montagem, fornecimento de acessórios, transporte e montagem, desde a pré-venda até a conclusão de instalação conforme projetos integrantes deste contrato.</p>
              <p>2.3 Todos os faturamentos de produtos, transportes e serviços serão faturados direta e exclusivamente pela CONTRATADA e a ele serão pagos pelo CONTRATANTE ou Agente Financeiro por ele contratado.</p>
              <p>2.4 Não integram o presente contrato, o fornecimento de elementos decorativos, presentes nos projetos apenas a título de ilustração, tais como eletrodomésticos, granitos, tapetes, cortinas, espelhos, vidros, iluminação em led, etc., ou seja, produtos não fabricados pela empresa TEMPORI, salvo nos casos de expressa opção do CONTRATANTE pela compra de produtos de outros fornecedores, comercializados pela CONTRATADA claramente descritos no pedido anexo.</p>
              <p>2.5 Não farão parte do objeto deste contrato e nem será encargo da CONTRATADA a instalação ou alteração de pontos elétricos ou hidráulicos, ou qualquer outra atividade não concretamente relacionada no pedido ou adendo deste instrumento.</p>
              <p>2.6 Caso o projeto final venha a ser modificado durante sua execução a pedido do CONTRATANTE, de forma que implique diferença de preços do valor negociado, este autoriza a CONTRATADA a emitir, a qualquer tempo, título correspondente à diferença de valores.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA TERCEIRA - CONDIÇÕES DE FORNECIMENTO E GARANTIA</p>
              <p>3.1 Após a assinatura deste contrato pelo CONTRATANTE, as partes se obrigam ao cumprimento do presente contrato de forma irrevogável e irretratável, sendo vedado o cancelamento da venda por desistência ou arrependimento de qualquer das partes, nos termos do parágrafo 2º do artigo 40 do Código de Defesa do Consumidor.</p>
              <p>3.2 Os produtos comprados serão entregues e os serviços de montagem executados pela CONTRATADA e/ou por meio de empresas especializadas, devendo os produtos serem entregues no prazo de 60 dias úteis da data da assinatura do projeto final, salvo quando especificado o Pedido na opção de VENDA FUTURA, sendo que os serviços de montagem serão iniciados em até 05 dias úteis da confirmação da entrega dos móveis no local. Caso seja constatado que algum componente tenha sofrido avaria durante o transporte ou durante a montagem, antes do término desta, o mesmo será trocado ou reparado em até 20 dias úteis a partir da constatação do fato.</p>
              <p>3.3 É responsabilidade do CONTRATANTE deixar o local de entrega disponível para receber os produtos e nas condições necessárias à realização da montagem: proteção do piso com papel bobina ondulado; liberação dos acessos à elevadores, energia elétrica, etc.; fornecimento das plantas hidráulicas e elétricas no início da montagem. Havendo necessidade da remoção de rodapé para instalação adequada do móvel, não será responsabilidade da CONTRATADA a recolocação do mesmo. Eventuais restrições do gênero poderão implicar em atrasos e serão considerados de responsabilidade do CONTRATANTE.</p>
              <p>3.15 Os produtos revendidos pela TEMPORI possuem garantia contra eventuais defeitos aparentes e de fácil constatação oriundos de fábrica, pelo prazo de 90 (noventa) dias a contar da efetiva entrega, e garantia extra, conforme o componente pelos seguintes prazos: 5 (cinco) anos de garantia para o móvel, puxadores, dobradiças e corrediças.</p>
              <p>3.18 A garantia contra defeitos de montagem dos produtos será prestada pela CONTRATADA por intermédio da empresa responsável pela montagem, pelo prazo de 90 (noventa) dias a contar da efetiva assinatura do termo de conclusão do serviço de montagem. Decorrido esse prazo a CONTRATADA, prestará assistência técnica mediante a cobrança de Taxa de Visita, além das partes, peças e produtos necessários aos reparos, que também serão cobrados à parte.</p>
            </div>

            <div>
               <p className="font-black uppercase mb-1">CLAUSULA QUARTA - PAGAMENTOS</p>
               <p>4.6 No caso dos débitos não serem quitados no vencimento, ficará o CONTRATANTE desde logo constituído em mora, vencendo-se antecipadamente o total da dívida, depois de verificado o inadimplemento da 2ª parcela por mais de 15 dias vencida e não paga. A CONTRATADA fica autorizada a comunicar os órgãos de proteção ao crédito, bem como ajuizar a competente ação de execução direta do presente, pelos valores que estiverem em aberto, acrescidos de todas as despesas, inclusive os encargos descritos na cláusula 4.4, correção monetária, juros, custas processuais e honorários de advogado à base de 20% sobre o montante devido.</p>
               <p>4.8 Por se tratar de mercadoria sob encomenda, não será admitida a desistência da compra após o envio do pedido ao fabricante. Caso o pedido ainda não tenha sido enviado o cancelamento acarretará em multa de 20% sobre valor do contrato para cobrir despesas com levantamento de medidas, confecção de projeto, conferencia e despesas administrativas.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA SETIMA DA ENTREGA FUTURA</p>
              <p>7.1 Entende-se por Venda Futura, aquela que não pode ser conferida de imediato, seja por motivo da obra não estar concluída ou por solicitação do CONTRATANTE.</p>
              <p>7.2 O Prazo de Entrega deverá ser acordado na negociação e constará no pedido, parte integrante deste Instrumento. O CONTRATANTE deverá solicitar com antecedência mínima de 60 dias, a conferência de medidas para adequação do projeto as medidas finais da obra pronta.</p>
            </div>
            
            <div className="flex-1"></div>

            <div className="flex justify-between items-end border-t border-slate-100 pt-8">
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-20">
                  <div className="text-center border-t border-slate-900 pt-2 font-black uppercase text-xs">
                    <p>CONTRATADA</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">TEMPORI PLANEJADOS LTDA</p>
                  </div>
                  <div className="text-center border-t border-slate-900 pt-2 font-black uppercase text-xs truncate px-2">
                    <p>CONTRATANTE</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{venda.clientes?.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-60 mt-6">
                  <ShieldCheck className="text-blue-600" size={32}/>
                  <div className="text-[8px] font-black uppercase">
                     <p>Assinatura Digital Auditada via Tempori Pro</p>
                     <p className="text-blue-600">ID: {venda.id} | Maceió, {new Date(venda.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
              <div className="text-center p-3 border-2 border-slate-900 rounded-xl bg-slate-50 ml-10">
                <QRCodeSVG value={urlVenda} size={80} level="H" />
                <p className="text-[7px] font-black uppercase mt-2">Aprovação Digital</p>
              </div>
            </div>
          </div>
          <p className="text-center text-[8px] text-slate-400 font-black uppercase mt-10">Página 5 de 5</p>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .page-break { page-break-after: always; display: block; clear: both; }
          @page { size: A4; margin: 10mm; }
        }
      `}} />
    </div>
  );
}