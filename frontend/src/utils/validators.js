// Validação de CPF
export const validarCPF = (cpf) => {
  if (!cpf) return true; // Campo opcional

  cpf = cpf.replace(/[^\d]/g, "");

  if (cpf.length !== 11) return false;

  // Elimina CPFs inválidos conhecidos
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Valida 1º dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  // Valida 2º dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
};

// Validação de CNPJ
export const validarCNPJ = (cnpj) => {
  if (!cnpj) return true; // Campo opcional

  cnpj = cnpj.replace(/[^\d]/g, "");

  if (cnpj.length !== 14) return false;

  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Valida DVs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

// Validação de CPF ou CNPJ
export const validarCPFouCNPJ = (valor) => {
  if (!valor) return true;

  const numeros = valor.replace(/[^\d]/g, "");

  if (numeros.length === 11) {
    return validarCPF(valor);
  } else if (numeros.length === 14) {
    return validarCNPJ(valor);
  }

  return false;
};

// Validação de placa de veículo (formatos antigo e Mercosul)
export const validarPlaca = (placa) => {
  if (!placa) return false;

  placa = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Formato antigo: AAA9999
  const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  // Formato Mercosul: AAA9A99
  const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return formatoAntigo.test(placa) || formatoMercosul.test(placa);
};

// Validação de telefone
export const validarTelefone = (telefone) => {
  if (!telefone) return true;

  const numeros = telefone.replace(/[^\d]/g, "");

  // Aceita (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
  return numeros.length === 10 || numeros.length === 11;
};

// Validação de email
export const validarEmail = (email) => {
  if (!email) return true;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validação de campo obrigatório
export const validarObrigatorio = (valor) => {
  if (typeof valor === "string") {
    return valor.trim().length > 0;
  }
  return valor !== null && valor !== undefined && valor !== "";
};

// Validação de número positivo
export const validarNumeroPositivo = (valor) => {
  if (!valor) return true;
  const num = parseFloat(valor);
  return !isNaN(num) && num > 0;
};

// Validação de chassi (17 caracteres alfanuméricos)
export const validarChassi = (chassi) => {
  if (!chassi) return true;

  chassi = chassi.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Chassi deve ter 17 caracteres e não pode conter I, O ou Q
  if (chassi.length !== 17) return false;
  if (/[IOQ]/.test(chassi)) return false;

  return true;
};

// Mensagens de erro
export const mensagensErro = {
  cpfInvalido: "CPF inválido",
  cnpjInvalido: "CNPJ inválido",
  cpfCnpjInvalido: "CPF ou CNPJ inválido",
  placaInvalida: "Placa inválida",
  telefoneInvalido: "Telefone inválido",
  emailInvalido: "Email inválido",
  campoObrigatorio: "Campo obrigatório",
  numeroInvalido: "Número inválido",
  chassiInvalido: "Chassi inválido (deve ter 17 caracteres)",
};
