# Sistema de Impressão de Ordem de Serviço

## 📄 Visão Geral

O sistema de impressão de Ordem de Serviço (OS) foi completamente reformulado para fornecer um documento profissional, completo e otimizado para impressão em uma única página.

## ✨ Características Principais

### 1. Cabeçalho Profissional da Empresa

**Informações incluídas:**

- Logo da empresa (círculo azul com texto "BENNY'S MOTORSPORT")
- Nome completo: **BENNYS CENTRO AUTOMOTIVO**
- **CNPJ:** 55.961.553
- **Telefones:**
  - 91084254-47
  - (41) 9 9236-2952
- **Endereço:** Prefeito João Batista Stocco N°2472
- **Número da OS** em destaque

### 2. Dados do Cliente e Veículo

Informações organizadas em tabela estruturada:

- **Cliente:** Nome completo e telefone
- **Veículo:** Modelo e placa
- **Entrada:** Data e hora da entrada
- **Previsão de Entrega:** Data estimada
- **Quilometragem (Km)**
- **Chassi:** Número do chassi do veículo
- **Observações do Veículo:** Condições e observações

### 3. Produtos Utilizados

Tabela detalhada com:

- Código do produto
- Descrição
- Quantidade
- Valor unitário
- Valor total

**Subtotal de Produtos** exibido ao final

### 4. Serviços Executados

Tabela com:

- Código do serviço
- Descrição
- Quantidade
- Valor unitário
- Valor total

**Subtotal de Serviços** exibido ao final

### 5. Totais e Valores

- **Valor Total de Produtos**
- **Valor Total de Serviços**
- **VALOR TOTAL DA OS** (em destaque)

### 6. Observações Gerais

Campo livre para observações adicionais sobre a OS.

### 7. Garantia

Caixa destacada com a mensagem:

> **"Todos os nossos serviços e produtos possuem 3 meses de garantia"**

### 8. Agradecimento e Assinaturas

- Mensagem de agradecimento: **"Obrigado pela preferência!"**
- Linha de assinatura da empresa: **BENNYS CENTRO AUTOMOTIVO**
- Linha de assinatura do cliente

## 🗄️ Alterações no Banco de Dados

### Novos Campos Adicionados

Na tabela `ordens_servico`:

```sql
ALTER TABLE ordens_servico
ADD COLUMN IF NOT EXISTS chassi VARCHAR(50),
ADD COLUMN IF NOT EXISTS previsao_entrega DATE;
```

## 📝 Formulário de Criação de OS

O formulário foi atualizado para incluir:

### Novos Campos:

1. **Chassi** - Campo de texto para o número do chassi
2. **Previsão de Entrega** - Campo de data para estimar a conclusão do serviço

### Layout Reorganizado:

- Primeira linha: Km, Chassi, Previsão de Entrega
- Segunda linha: Observações do Veículo, Responsável Técnico

## 🖨️ Como Imprimir

1. Acesse a **página de detalhes da OS**
2. Clique no botão **"Imprimir OS"**
3. O navegador abrirá a janela de impressão
4. Configure:
   - **Orientação:** Retrato
   - **Tamanho:** A4
   - **Margens:** Padrão
5. Clique em **Imprimir**

## 🎨 Otimizações de Impressão

- **Layout otimizado** para caber em uma única página A4
- **Fontes reduzidas** para melhor aproveitamento do espaço
- **Margens ajustadas** (10mm em todos os lados)
- **Espaçamentos compactos** entre seções
- **CSS @media print** para garantir que apenas o conteúdo relevante seja impresso
- **Tabelas com bordas** para melhor organização visual

## 📱 Responsividade

O componente de impressão:

- **Oculto na tela** - Não aparece durante a navegação normal
- **Visível apenas na impressão** - Ativado automaticamente ao imprimir
- **Formatação fixa** - Garantia de layout consistente em todas as impressões

## 🔧 Componentes Técnicos

### Frontend:

- **OSImpressao.jsx** - Componente de impressão
- **OSDetalhes.jsx** - Página de detalhes com botão de impressão
- **OSForm.jsx** - Formulário atualizado com novos campos
- **react-to-print v3** - Biblioteca de impressão

### Backend:

- **server.js** - Endpoints atualizados para aceitar chassi e previsão de entrega
- **database.js** - Migrations para novos campos

## ✅ Checklist de Implementação

- [x] Adicionar campos `chassi` e `previsao_entrega` ao banco de dados
- [x] Atualizar formulário de criação de OS
- [x] Atualizar endpoints do backend
- [x] Implementar cabeçalho profissional com logo e informações da empresa
- [x] Criar tabelas organizadas para cliente/veículo
- [x] Adicionar campos de chassi e previsão de entrega
- [x] Incluir tabelas de produtos e serviços
- [x] Adicionar seção de totais
- [x] Incluir mensagem de garantia
- [x] Adicionar assinaturas
- [x] Otimizar layout para uma página
- [x] Testar impressão

## 🚀 Próximos Passos

1. **Personalização do Logo:** Permitir upload de logo personalizado
2. **Configurações da Empresa:** Interface para editar informações da empresa
3. **Templates de OS:** Múltiplos templates de impressão
4. **Exportação PDF:** Gerar PDF diretamente sem precisar imprimir
5. **Email Automático:** Enviar OS por email para o cliente

## 📞 Suporte

Para dúvidas ou problemas com o sistema de impressão, verifique:

1. Se o navegador está atualizado
2. Se as configurações de impressão estão corretas
3. Se todos os dados obrigatórios da OS estão preenchidos

---

**Documentação atualizada em:** 2025
**Versão:** 2.0
