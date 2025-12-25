import { toast } from 'sonner';

// --- FORMATAÇÃO VISUAL (BRL) ---
// Transforma números (1500.50) em texto formatado (R$ 1.500,50)
export const BRL = (valor) => {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- CONVERSÃO DE INPUT PARA NÚMERO (NOVO) ---
// Transforma texto (R$ 1.500,50) em número (1500.50) para salvar no banco
export const parseMoeda = (valorString) => {
  if (!valorString) return 0;
  // Remove tudo que não é dígito ou vírgula
  const limpo = valorString.toString().replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
};

// --- CÁLCULO FINANCEIRO / VPL (NOVO) ---
// Traz o valor parcelado a valor presente baseado na taxa de juros
export const calcularVPL = (valorTotal, parcelas, taxaMensal) => {
  if (!taxaMensal || taxaMensal <= 0 || !parcelas || parcelas <= 1) return valorTotal;
  
  const taxaDecimal = taxaMensal / 100;
  const valorParcela = valorTotal / parcelas;
  let vpl = 0;
  
  // Soma o valor presente de cada parcela
  for (let i = 1; i <= parcelas; i++) {
      vpl += valorParcela / Math.pow(1 + taxaDecimal, i);
  }
  return vpl;
};

// --- VALIDAÇÃO LÓGICA (CPF) ---
export const validarCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

// --- LINK WHATSAPP ---
export const whatsappLink = (telefone, mensagem) => {
  if (!telefone) return '#';
  const numeroLimpo = telefone.replace(/\D/g, '');
  const textoCodificado = encodeURIComponent(mensagem);
  return `https://wa.me/55${numeroLimpo}?text=${textoCodificado}`;
};

// --- MÁSCARAS DE INPUT ---
export const masks = {
  cpf: (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = v;
    return e;
  },
  
  celular: (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d\d)(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    e.target.value = v;
    return e;
  },

  moeda: (e) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = (value / 100).toFixed(2) + "";
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = "R$ " + value;
    return e;
  }
};

// --- NOTIFICAÇÕES INTELIGENTES (Sonner) ---
export const notificar = {
  sucesso: (msg) => toast.success(msg),
  erro: (msg) => toast.error(msg),
  info: (msg) => toast.info(msg)
};