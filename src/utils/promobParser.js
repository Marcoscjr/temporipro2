export const lerXMLPromob = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
        
        const ambientesMap = {}; // Armazena temporariamente antes de agrupar
        let itensEncontrados = 0;

        // 1. Extração Recursiva (Coleta tudo bruto)
        const varrerItens = (node, ambienteAtual) => {
            if (node.tagName === "AMBIENT") {
                ambienteAtual = node.getAttribute("DESCRIPTION") || ambienteAtual;
            }

            if (node.tagName === "ITEM") {
                const budgets = node.getElementsByTagName("BUDGET");
                
                if (budgets.length > 0) {
                    const budget = budgets[0];
                    
                    // Prioriza pegar o TOTAL e a QUANTIDADE para calcular o UNITÁRIO real
                    let valTotal = parseFloat((budget.getAttribute("TOTAL") || "0").replace(',', '.'));
                    let valUnit = parseFloat((budget.getAttribute("UNIT") || "0").replace(',', '.'));
                    
                    // Se não tem TOTAL mas tem UNIT, calcula
                    // Se tem os dois, vamos confiar no TOTAL para evitar erros de arredondamento unitário
                    
                    if (valTotal > 0 || valUnit > 0) {
                        let qtd = parseFloat((node.getAttribute("QUANTITY") || node.getAttribute("REPETITION") || "1").replace(',', '.'));
                        if (qtd <= 0) qtd = 1;

                        // Se só tinha unitário, faz total
                        if (valTotal === 0 && valUnit > 0) valTotal = valUnit * qtd;
                        
                        // REGRA PEDIDA: Unitário é sempre Total / Quantidade
                        valUnit = valTotal / qtd;

                        const descricao = node.getAttribute("DESCRIPTION") || "Item sem descrição";
                        // Pega categoria se existir
                        const categoria = node.getElementsByTagName("MARGINS")[0]?.getAttribute("IDCATEGORY") || "";

                        // Inicializa o ambiente se não existir
                        if (!ambientesMap[ambienteAtual]) {
                            ambientesMap[ambienteAtual] = { valorTotal: 0, listaBruta: [] };
                        }

                        // Adiciona na lista bruta (será agrupado depois)
                        ambientesMap[ambienteAtual].valorTotal += valTotal;
                        ambientesMap[ambienteAtual].listaBruta.push({
                            descricao,
                            categoria,
                            quantidade: qtd,
                            precoUnit: valUnit, // Calculado precisamente
                            precoTotal: valTotal
                        });
                        itensEncontrados++;
                    }
                }
            }

            // Continua descendo na árvore
            for (let i = 0; i < node.children.length; i++) {
                varrerItens(node.children[i], ambienteAtual);
            }
        };

        varrerItens(xmlDoc.documentElement, "Ambiente Geral");

        if (itensEncontrados === 0) {
            reject("Nenhum item com preço encontrado no XML.");
            return;
        }

        // 2. Agrupamento e Formatação Final
        const resultado = Object.keys(ambientesMap).map((amb, index) => {
            const dadosAmbiente = ambientesMap[amb];
            
            // Lógica de Agrupamento:
            // Itens com mesma Descrição E mesmo Preço Unitário (para evitar misturar materiais diferentes com mesmo nome)
            const itensAgrupados = [];
            const mapaAgrupamento = {};

            dadosAmbiente.listaBruta.forEach(item => {
                // Chave única para agrupar
                // Arredonda unitário para 2 casas para chave, para evitar que 10.00001 não agrupe com 10.00
                const chave = `${item.descricao}|${item.categoria}|${item.precoUnit.toFixed(4)}`;

                if (mapaAgrupamento[chave]) {
                    // Se já existe, soma
                    mapaAgrupamento[chave].quantidade += item.quantidade;
                    mapaAgrupamento[chave].precoTotal += item.precoTotal;
                } else {
                    // Se não, cria novo (clonando objeto para não alterar referência)
                    mapaAgrupamento[chave] = { ...item };
                    itensAgrupados.push(mapaAgrupamento[chave]); // Guarda referência ordenada
                }
            });

            // Recalcula o total do ambiente baseado na soma pós-processada (pra garantir bater centavos)
            const totalAmbienteReal = itensAgrupados.reduce((acc, i) => acc + i.precoTotal, 0);

            return {
                id: Date.now() + index,
                ambiente: amb,
                descricao: `${itensAgrupados.length} itens (agrupados)`,
                valorOriginal: totalAmbienteReal,
                valor: totalAmbienteReal, // Valor inicial de venda = Custo (Markup aplica na tela)
                detalhes: itensAgrupados, // Lista limpa e agrupada
                selecionado: true
            };
        });

        resolve(resultado);

      } catch (err) {
        reject("Erro ao processar arquivo: " + err.message);
      }
    };
    reader.onerror = (err) => reject("Erro de leitura: " + err);
    reader.readAsText(file);
  });
};