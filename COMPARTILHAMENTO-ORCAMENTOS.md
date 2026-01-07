# Funcionalidade de Compartilhamento de Orçamentos

## Como Funciona

### 1. Compartilhar Orçamento com o Cliente

Na página de detalhes do orçamento (quando o status é "Pendente"), você verá dois botões:

#### 🟢 **Botão WhatsApp**

- Clique para abrir o WhatsApp automaticamente
- Envia uma mensagem com o link do orçamento direto para o cliente
- Requer que o telefone do cliente esteja cadastrado

#### 🟣 **Botão Compartilhar**

- Copia o link público do orçamento
- Você pode colar o link onde quiser (email, SMS, outro mensageiro)

### 2. O que o Cliente Vê

Quando o cliente acessa o link, ele verá:

- **Dados completos do orçamento** (produtos, serviços, valores)
- **Informações do veículo e cliente**
- **Valor total** destacado
- **Botões para aprovar ou reprovar** o orçamento

### 3. Aprovação/Reprovação

O cliente pode:

- ✅ **Aprovar** - O status muda para "Aprovado" e você pode converter em OS
- ❌ **Reprovar** - O status muda para "Reprovado"

Após a ação do cliente, ele verá uma confirmação na tela.

## Fluxo Completo

```
1. Criar Orçamento (Status: Pendente)
   ↓
2. Compartilhar via WhatsApp ou Link
   ↓
3. Cliente acessa o link e visualiza o orçamento
   ↓
4. Cliente aprova ou reprova
   ↓
5. Status atualiza automaticamente no sistema
   ↓
6. Se aprovado: Converter em OS
```

## URL da Página Pública

O link gerado tem o formato:

```
https://seu-dominio.com/orcamento-publico/{id}
```

Exemplo:

```
http://localhost:5175/orcamento-publico/1
```

## Recursos Importantes

✅ **Página pública** - Não precisa de login para visualizar
✅ **Visual profissional** - Design bonito e responsivo
✅ **Fácil de usar** - Cliente aprova com 2 cliques
✅ **Integração WhatsApp** - Envio direto pelo app
✅ **Status em tempo real** - Atualização automática
✅ **Segurança** - Apenas visualização e aprovação (sem edição)

## Observações

- O link é válido enquanto o orçamento existir no sistema
- Após aprovação/reprovação, os botões de ação são desabilitados
- O status do orçamento é atualizado em tempo real no sistema interno
