// Máscara de CPF: 000.000.000-00
export const mascaraCPF = (valor) => {
  if (!valor) return "";

  valor = valor.replace(/\D/g, "");
  valor = valor.substring(0, 11);

  if (valor.length <= 3) return valor;
  if (valor.length <= 6) return `${valor.slice(0, 3)}.${valor.slice(3)}`;
  if (valor.length <= 9)
    return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;

  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(
    6,
    9
  )}-${valor.slice(9)}`;
};

// Máscara de CNPJ: 00.000.000/0000-00
export const mascaraCNPJ = (valor) => {
  if (!valor) return "";

  valor = valor.replace(/\D/g, "");
  valor = valor.substring(0, 14);

  if (valor.length <= 2) return valor;
  if (valor.length <= 5) return `${valor.slice(0, 2)}.${valor.slice(2)}`;
  if (valor.length <= 8)
    return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5)}`;
  if (valor.length <= 12)
    return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(
      5,
      8
    )}/${valor.slice(8)}`;

  return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(
    5,
    8
  )}/${valor.slice(8, 12)}-${valor.slice(12)}`;
};

// Máscara de CPF ou CNPJ (detecta automaticamente)
export const mascaraCPFouCNPJ = (valor) => {
  if (!valor) return "";

  const numeros = valor.replace(/\D/g, "");

  if (numeros.length <= 11) {
    return mascaraCPF(valor);
  } else {
    return mascaraCNPJ(valor);
  }
};

// Máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
export const mascaraTelefone = (valor) => {
  if (!valor) return "";

  valor = valor.replace(/\D/g, "");
  valor = valor.substring(0, 11);

  if (valor.length <= 2) return valor;
  if (valor.length <= 6) return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
  if (valor.length <= 10)
    return `(${valor.slice(0, 2)}) ${valor.slice(2, 6)}-${valor.slice(6)}`;

  return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
};

// Máscara de CEP: 00000-000
export const mascaraCEP = (valor) => {
  if (!valor) return "";

  valor = valor.replace(/\D/g, "");
  valor = valor.substring(0, 8);

  if (valor.length <= 5) return valor;

  return `${valor.slice(0, 5)}-${valor.slice(5)}`;
};

// Máscara de placa: AAA-0000 ou AAA0A00 (Mercosul)
export const mascaraPlaca = (valor) => {
  if (!valor) return "";

  valor = valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
  valor = valor.substring(0, 7);

  // Formato antigo: AAA-9999
  if (valor.length <= 3) return valor;
  if (/^[A-Z]{3}$/.test(valor.substring(0, 3)) && /^\d/.test(valor[3])) {
    // Verifica se é formato antigo (próximo caractere é número)
    return `${valor.slice(0, 3)}-${valor.slice(3)}`;
  }

  // Formato Mercosul: AAA9A99 (sem traço)
  return valor;
};

// Máscara de moeda: R$ 0.000,00
export const mascaraMoeda = (valor) => {
  if (!valor) return "";

  valor = valor.toString().replace(/\D/g, "");

  if (valor.length === 0) return "0,00";
  if (valor.length === 1) return `0,0${valor}`;
  if (valor.length === 2) return `0,${valor}`;

  const centavos = valor.slice(-2);
  const reais = valor.slice(0, -2);

  const reaisFormatados = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${reaisFormatados},${centavos}`;
};

// Remove máscara (retorna apenas números)
export const removerMascara = (valor) => {
  if (!valor) return "";
  return valor.replace(/\D/g, "");
};

// Remove máscara de moeda e converte para número
export const moedaParaNumero = (valor) => {
  if (!valor) return 0;

  // Remove tudo exceto números e vírgula
  valor = valor.toString().replace(/[^\d,]/g, "");

  // Substitui vírgula por ponto
  valor = valor.replace(",", ".");

  return parseFloat(valor) || 0;
};

// Formata número para moeda
export const numeroParaMoeda = (numero) => {
  if (!numero && numero !== 0) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
};
