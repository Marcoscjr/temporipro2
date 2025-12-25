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
      if (data.condicoes_pagamento && typeof data.condicoes_pagamento === 'string') data.condicoes_pagamento = JSON.parse(data.condicoes_pagamento);
      if (data.itens_venda && typeof data.itens_venda === 'string') data.itens_venda = JSON.parse(data.itens_venda);

      setVenda(data);
    } catch (err) {
      navigate('/comercial');
    } finally {
      setLoading(false);
    }
  }

  const gerarPDF = async () => {
    const input = document.getElementById('contrato-impressao');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const sections = input.querySelectorAll('.page-break');
    
    setLoading(true);
    for (let i = 0; i < sections.length; i++) {
      const canvas = await html2canvas(sections[i], { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }
    pdf.save(`Contrato_Tempori_${venda.numero_contrato}.pdf`);
    setLoading(false);
  };

  if (loading && !venda) return <div className="p-20 text-center font-black uppercase text-slate-400">Gerando Contrato...</div>;
  if (!venda) return null;

  // Cálculo do fator de desconto para ajustar os valores unitários ao total negociado
  const somaValoresItens = venda.itens_venda?.reduce((acc, item) => acc + (item.valor || 0), 0) || 1;
  const fatorAjuste = venda.valor_total / somaValoresItens;

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
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">EMISSÃO: {new Date(venda.created_at).toLocaleDateString('pt-BR')}</p>
              <div className="mt-4 p-2 border rounded-lg bg-white">
                <QRCodeSVG value={urlVenda} size={60} />
                <p className="text-[6px] font-black uppercase mt-1">Autenticidade</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-y-4 gap-x-8 mb-8 text-[11px] border p-6 rounded-2xl border-slate-100">
            <div className="col-span-2"><label className="font-black text-slate-400 uppercase text-[9px] block">CLIENTE</label><span className="font-bold uppercase">{venda.clientes?.nome}</span></div>
            <div><label className="font-black text-slate-400 uppercase text-[9px] block">CPF/CNPJ</label><span className="font-bold">{venda.clientes?.cpf_cnpj}</span></div>
            <div className="col-span-2"><label className="font-black text-slate-400 uppercase text-[9px] block">ENDEREÇO</label><span className="font-bold uppercase">{venda.clientes?.endereco_completo}</span></div>
            <div><label className="font-black text-slate-400 uppercase text-[9px] block">CIDADE/UF/CEP</label><span className="font-bold uppercase">{venda.clientes?.cidade} - {venda.clientes?.uf} | {venda.clientes?.cep}</span></div>
          </div>

          <div className="mb-8 flex-1">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] font-black italic">
                  <th className="p-3 w-12 text-center">ITEM</th>
                  <th className="p-3">AMBIENTE/PRODUTO</th>
                  <th className="p-3 w-24 text-center">PRAZO</th>
                  <th className="p-3 w-32 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody className="border border-slate-200">
                {venda.itens_venda?.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-black text-slate-800 uppercase">{item.ambiente}</td>
                    <td className="p-3 text-center text-slate-500 font-bold">60 dias úteis</td>
                    <td className="p-3 text-right font-bold">{BRL(item.valor * fatorAjuste)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black italic">
                  <td colSpan="3" className="p-4 text-right uppercase text-slate-500">TOTAL DO PEDIDO:</td>
                  <td className="p-4 text-right text-base text-slate-900">{BRL(venda.valor_total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-8">
            <div className="bg-slate-900 text-white p-2 text-[10px] font-black uppercase text-center">CONDIÇÃO DE PAGAMENTO</div>
            <table className="w-full text-[10px] text-left">
              <thead>
                <tr className="bg-slate-100 font-black uppercase text-slate-400 border-b border-slate-200">
                  <th className="p-3">PARCELA</th>
                  <th className="p-3">VENCIMENTO</th>
                  <th className="p-3">FORMA</th>
                  <th className="p-3 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody>
                {venda.condicoes_pagamento?.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 font-bold text-slate-700">
                    <td className="p-3">{i === 0 ? 'Entrada' : i}</td>
                    <td className="p-3">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 uppercase">{p.metodo}</td>
                    <td className="p-3 text-right font-black">{BRL(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-[8px] text-slate-400 font-black uppercase">Página 1 de 5</p>
        </section>

        {/* PÁGINAS JURÍDICAS TRANSCRIÇÃO INTEGRAL (2 A 5) */}
        <section className="bg-white p-[20mm] min-h-[297mm] page-break text-[10px] leading-[1.3] text-slate-700 text-justify flex flex-col">
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
              <p>3.4 No caso de apartamentos, se alguma peça, no ato da entrega, não couber no elevador ou escadas, a mesma deverá subir por empresa especializada em mudanças, ocorrendo por conta do CONTRATANTE o custo deste serviço.</p>
              <p>3.5 Em caso de reformas, as mesmas deverão estar devidamente concluídas e os ambientes completamente limpos. A desmontagem e transporte de móveis já existentes é de responsabilidade do CONTRATANTE.</p>
              <p>3.6 Na indisponibilidade de acesso ao local da entrega na data estabelecida no presente, o CONTRATANTE deverá providenciar depósito alternativo para entrega imediata, cabendo-lhe os ônus respectivos. Nesse caso a nova data de entrega e montagem deverá respeitar uma nova programação da logística da CONTRATADA.</p>
              <p>3.7 O CONTRATANTE autoriza desde já seus empregados, síndico, zelador ou funcionários do imóvel a assinar Notas Fiscais de entrega dos produtos e serviços, bem como formulário comprobatório da conclusão dos serviços, ressalvando eventuais divergências de projeto ou de qualidade.</p>
              <p>3.8 É de responsabilidade do CONTRATANTE verificar a altura dos armários e abertura de portas, antes de executar rebaixos ou sancas de gesso, instalações de luminárias, cortinas, etc.</p>
              <p>3.9 Fica aos cuidados do CONTRATANTE a retirada, antes da entrega dos móveis, de molduras de gesso, rodapés ou qualquer outro acabamento que interfira na instalação dos produtos. Nossos técnicos estão aptos a prestar toda orientação necessária. Caso nossos técnicos tenham que retirá-los, não nos responsabilizamos por eventuais danos.</p>
              <p>3.10 Até a data de instalação, o CONTRATANTE deverá entregar no imóvel, os eletrodomésticos com as medidas previstas no projeto, e plantas elétricas, hidráulicas, de gás, telefone e outras tubulações não aparentes, que possam ser danificadas com a instalação. A indisponibilidade dos eletros como fogão e forno implica na montagem da cozinha. Esta inobservância desobriga a CONTRATADA de qualquer responsabilidade por eventuais incompatibilidades ou danos nas instalações e nos materiais, decorrentes da instalação, sendo obrigação do CONTRATANTE, imediato reparo para continuidade dos serviços.</p>
              <p>3.11 Por ocasião da instalação, na eventual hipótese de se verificarem incompatibilidades, ausência de componentes, necessidades ou conveniência de reformulações e ampliações de projetos, os produtos complementares necessários envolverão nova contratação análoga ao presente.</p>
              <p>3.12 A perfeita execução do projeto requer, durante a montagem, alguns ajustes de acabamento que poderão provocar resíduos e pó. Além disso, as embalagens dos nossos produtos após abertos geram volumes que ocupam espaços consideráveis. Após a conclusão da montagem, nossos técnicos estarão aptos a deslocá-los para locais previamente indicados pelo CONTRATANTE e farão a limpeza dos resíduos resultantes da montagem e manutenção dos ambientes.</p>
              <p>3.13 Constituem obrigações da CONTRATADA: a) atender, dentro dos prazos convencionados, às solicitações da CONTRATANTE, no que diz respeito à entrega, montagem e instalação dos bens objeto deste instrumento, bem como, prestar assistência técnica decorrente de defeitos de fabricação; b) Ocorrendo prorrogação do prazo de montagem, por parte da CONTRATADA, decorrente de caso fortuito ou força maior, esta prorrogação será efetivada mediante prévia notificação à CONTRATANTE, antes mesmo de expirado o prazo de entrega e montagem do bem móvel; c) transmitir, no prazo de 10 (dez) dias, ao fabricante das irregularidades nos produtos fornecidos, sem que isso configure violação às obrigações contratuais; d) Executar a montagem dos móveis dentro da melhor técnica e zelo, obedecendo aos parâmetros de montagem e segurança estabelecidos pelos fabricantes; e) Providenciar a substituição dos bens ou partes com defeito de fabricação ou decorrente do processo de transporte ou montagem.</p>
              <p>3.14 Na montagem, a CONTRATADA se exime de qualquer responsabilidade referente a: a) Existência no local da montagem de sobras de obras de construção (tijolos, areia, etc.) ou mesmo de paredes frágeis ou de má qualidade, que impeçam uma sustentação robusta dos móveis; b) Existência de desníveis das paredes, impossibilitando a instalação a contento dos móveis de forma bem assentada, bem instalada e seguros; c) Ocorrência de focos de umidade ou constante e excessiva exposição ao sol ou à luminosidade além da possível infestação por insetos que possam a vir danificar os bens objeto do presente.</p>
              <p>3.15 Os produtos revendidos pela TEMPORI possuem garantia contra eventuais defeitos aparentes e de fácil constatação oriundos de fábrica, pelo prazo de 90 (noventa) dias a contar da efetiva entrega, e garantia extra de 5 (cinco) anos para o móvel, puxadores, dobradiças e corrediças.</p>
              <p>3.16 São causas de exclusão da garantia: o desgaste natural pelo uso, descoloração pelo tempo, diferenças de tonalidade, utilização dos produtos em condições anormais de uso (tais como sobrecarga de peso, incidência de fogo, umidade, contato prolongado com a água, infiltrações de líquidos, utilização de produtos abrasivos para limpeza, maresia, ferrugem, fungos, cupins, brocas e outros, por serem oriundos de agentes externos), a montagem ou desmontagem dos produtos por pessoas não credenciadas pela CONTRATADA e defeitos oriundos pela falta de manutenção periódica.</p>
              <p>3.17 A CONTRATADA não está autorizada a manipular tubulações elétricas, hidráulicas, telefônicas, etc., sendo responsabilidade do CONTRATANTE a contratação de profissionais especializados nestas áreas, inclusive dedetização contra insetos, visando preservar seu investimento nos móveis, uma vez que avarias decorrentes destes fatores não são cobertas pela garantia.</p>
              <p>3.18 A garantia contra defeitos de montagem dos produtos será prestada pela CONTRATADA por intermédio da empresa responsável pela montagem, pelo prazo de 90 (noventa) dias a contar da efetiva assinatura do termo de conclusão do serviço de montagem. Decorrido esse prazo a CONTRATADA, prestará assistência técnica mediante a cobrança de Taxa de Visita, além das partes, peças e produtos necessários aos reparos, que também serão cobrados à parte.</p>
              <p>3.19 A CONTRATADA não se compromete por qualquer acordo verbal feito por seus consultores de vendas ou instaladores sem que esteja declarado e constado por escrito no projeto firmado pela CONTRATADA com a CONTRATANTE.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLÁUSULA QUARTA - PAGAMENTOS</p>
              <p>4.1 Os pagamentos deverão ser feitos nas datas estipuladas no presente instrumento, independente do faturamento das mercadorias ou da finalização dos serviços, salvo quando citado por escrito em adendo a este contrato que o pagamento será mediante entrega dos móveis.</p>
              <p>4.2 Todos os pagamentos dos valores aqui contratados deverão ser efetuados observando rigorosamente as condições e formas de pagamento e as datas estabelecidas no pedido anexo, integrante deste contrato. No caso de atraso ou suspensão da entrega dos produtos e serviços por ordem ou culpa do CONTRATANTE o sujeitará a eventuais reajustes que venham a incidir sobre o preço durante o período dos atrasos ou suspensão.</p>
              <p>4.3 Eventuais greves ou falta de matérias primas não constituirão descumprimento contratual, podendo ter atendimento com material similar disponível ou dilatação de prazos de entrega e de pagamentos em períodos idênticos.</p>
              <p>4.5 O atraso no pagamento do(s) título(s) sujeita o inadimplente ao pagamento da(s) parcela(s) vencida(s), acrescida(s) da correção monetária, mais juros de 2% (dois por cento) ao mês, e de multa contratual de 2% (dois por cento), sobre o valor do montante em aberto, até o efetivo adimplemento da obrigação.</p>
              <p>4.6 No caso dos débitos não serem quitados no vencimento, ficará o CONTRATANTE desde logo constituído em mora, vencendo-se antecipadamente o total da dívida, depois de verificado o inadimplemento da 2ª parcela por mais de 15 dias vencida e não paga. A CONTRATADA fica autorizada a comunicar os órgãos de proteção ao crédito, bem como ajuizar a competente ação de execução direta, acrescidos de todas as despesas, custas processuais e honorários de advogado à base de 20% sobre o montante devido.</p>
              <p>4.8 Por se tratar de mercadoria sob encomenda, não será admitida a desistência da compra após o envio do pedido ao fabricante. Caso o pedido ainda não tenha sido enviado o cancelamento acarretará em multa de 20% sobre valor total do contrato para cobrir despesas operacionais e administrativas.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA QUINTA DA CESSÃO</p>
              <p>5.1 O CONTRATANTE declara-se ciente que a empresa TEMPORI PLANEJADOS LTDA cederá o crédito decorrente da operação de venda parcelada, efetuada nesta data, descrita no item "Especificação da Operação", para Instituição Financeira, a qual ficará sub-rogada em todos os direitos da cedente inclusive o de receber o valor das parcelas nas datas avençadas.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA SEXTA - DA RESERVA DE DOMÍNIO</p>
              <p>6.1 Por força de pacto de reserva de domínio, aqui expressamente instituído e aceito pelas partes, fica reservada a CONTRATADA a propriedade do(s) objeto(s) descrito(s) no pedido e projetos anexos, até que seja liquidada a última das prestações mencionadas no referido pedido.</p>
              <p>6.2 A posse do(s) objeto(s) descrito(s) no pedido anexo, fica sendo do CONTRATANTE, a partir desta data, mas se o mesmo faltar com o pagamento de qualquer das prestações ficará desde logo constituído em mora e obrigado, sob as penas da lei, a restituir incontinenti o(s) objeto(s) condicionalmente adquirido(s).</p>
              <p>6.3 Fica facultado a CONTRATADA, no caso de mora ou arrependimento do CONTRATANTE, optar pela rescisão deste contrato ou pela cobrança judicial dos títulos assinados.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA SETIMA DA ENTREGA FUTURA</p>
              <p>7.1 Entende-se por Venda Futura aquela que não pode ser conferida de imediato, seja por motivo da obra não estar concluída ou por solicitação do CONTRATANTE.</p>
              <p>7.2 O Prazo de Entrega deverá ser acordado na negociação e constará no pedido, parte integrante deste Instrumento.</p>
              <p>7.3 O CONTRATANTE deverá solicitar com antecedência mínima de 60 dias a conferência de medidas para adequação do projeto às medidas finais da obra pronta.</p>
              <p>7.4 Caso o projeto aprovado seja modificado, por diferença de medidas, poderá a CONTRATADA emitir título correspondente à diferença de preço.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA OITAVA - DO PRODUTO DE MOSTRUÁRIO</p>
              <p>8.1 No caso de aquisição de produtos do mostruário da loja, o CONTRATANTE fica ciente que o mobiliário será entregue nas condições apresentadas no show room, podendo conter riscos e batidas decorrentes da exposição.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA NONA - DISPOSIÇÕES GERAIS</p>
              <p>9.1 Na hipótese de descumprimento de qualquer das cláusulas deste, a eventual tolerância ou concessão das partes não implicará em alteração ou novação contratual.</p>
              <p>9.2 A CONTRATADA oferece assistência técnica permanente aos seus produtos. Os custos de reparos, quando não cobertos pela garantia de fábrica, serão cobrados da CONTRATANTE.</p>
            </div>

            <div>
              <p className="font-black uppercase mb-1">CLAUSULA DECIMA - ELEIÇÃO DE FORO</p>
              <p>10.1 As partes de comum acordo elegem o Foro da Comarca de MACEIÓ para dirimir eventuais dúvidas e ações judiciais envolvendo o ora pactuado.</p>
            </div>
          </div>

          {/* DATA E ASSINATURAS */}
          <div className="mt-12 space-y-12">
            <p className="text-right font-bold italic text-sm">Maceió, {new Date(venda.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            
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

            <div className="grid grid-cols-2 gap-20 pt-10">
              <div className="space-y-4">
                <div className="border-b border-slate-300 pb-2 text-[10px] uppercase font-bold text-slate-400">Testemunha 1:</div>
                <div className="text-[9px] text-slate-400 uppercase font-black italic">CPF: ______________________</div>
              </div>
              <div className="space-y-4">
                <div className="border-b border-slate-300 pb-2 text-[10px] uppercase font-bold text-slate-400">Testemunha 2:</div>
                <div className="text-[9px] text-slate-400 uppercase font-black italic">CPF: ______________________</div>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-slate-100 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-3">
               <ShieldCheck className="text-blue-600" size={32}/>
               <div className="text-[8px] font-black uppercase">
                  <p>Documento Gerado Eletronicamente via Tempori Pro</p>
                  <p className="text-blue-600">ID ÚNICO: {venda.id}</p>
               </div>
            </div>
            <div className="text-center p-3 border-2 border-slate-900 rounded-xl bg-slate-50">
              <QRCodeSVG value={urlVenda} size={80} level="H" />
              <p className="text-[7px] font-black uppercase mt-2">Aprovação Digital</p>
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