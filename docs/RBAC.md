# RBAC — Admin e Mecânico

## Papéis

| Papel | `role` no banco | Acesso |
|--------|-----------------|--------|
| **Administrador** | `admin` | Sistema completo |
| **Mecânico** | `mecanico` | Ordens de serviço e agenda (operacional) |

Usuários antigos com `user` ou vazio são tratados como **admin** no login.

## Mecânico pode

- Listar e ver OS; editar OS; alterar status (iniciar, finalizar, cancelar)
- Imprimir OS
- Ver agenda; confirmar / iniciar / concluir agendamentos
- Consultar clientes, veículos, produtos e serviços (leitura, para montar a OS)

## Mecânico não pode

- Painel inicial, orçamentos, estoque, contas a pagar
- Criar/excluir OS; emitir notas fiscais
- Cadastrar clientes, veículos, produtos; criar agendamentos
- Relatórios, backup, auditoria, lembretes

## Cadastro pela interface (recomendado)

Como **admin**, acesse **Usuários** no menu → **Novo usuário** → escolha perfil **Mecânico** ou **Administrador**.

## Via SQL (alternativa)

```sql
UPDATE usuarios SET role = 'mecanico' WHERE email = 'mecanico@oficina.com';
```

Após alterar o papel, o usuário deve **sair e entrar de novo** para renovar o JWT.

## Deploy

```bash
cd backend && npm run migrate   # aplica 008_rbac_roles.sql
```
