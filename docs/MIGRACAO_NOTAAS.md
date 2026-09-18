# Migração para Notaas (NFS-e)

**Contexto:** Nuvem Fiscal foi desativada (31/07/2026). O Benny usa a **Notaas** para emissão de NFS-e via API Key.

Documentação: [docs.notaas.com.br](https://docs.notaas.com.br)

## O que mudou

| Item | Antes (ACBr / Nuvem) | Notaas |
|------|----------------------|--------|
| Auth | OAuth `client_id` / `secret` | Header `x-api-key: ntaas_...` |
| Emissão NFS-e | `POST /nfse/dps` | `POST /api/v1/emitir` |
| Status NFS-e | `GET /nfse/{id}` | `GET /api/v1/invoices/{id}/status` |
| PDF NFS-e | `GET /nfse/{id}/pdf` | `GET /api/v1/invoices/{id}/pdf` |
| Cancelar NFS-e | `POST /nfse/{id}/cancelamento` | `POST /api/v1/cancelar` |
| Emissão NF-e | — | `POST /api/v1/nfe/emitir` |
| Status NF-e | — | `GET /api/v1/nfe/invoices/{id}/status` |
| DANFE | — | `GET /api/v1/nfe/invoices/{id}/danfe` |
| Cancelar NF-e | — | `POST /api/v1/nfe/cancelar` |

Base URL: `https://platform.notaas.com.br/api/v1`

**Escopo:** **NFS-e** (serviços) e **NF-e** (peças, modelo 55). NF-e fica desligada por padrão (`NOTAAS_NFE_ENABLED=false`); ligue só para testes/homologação depois de configurar emitente e certificado no painel Notaas.

## Painel Notaas

1. Conta em [platform.notaas.com.br](https://platform.notaas.com.br) / [notaas.com.br](https://www.notaas.com.br)
2. Cadastrar empresa (CNPJ Bennys), certificado A1, município Colombo (IBGE `4105805`)
3. Código de serviço padrão LC 116: `310103` (mecânica — confirmar com contador)
4. Dashboard → **API Keys** → criar Project Key (`ntaas_...`)

## Coolify — variáveis do backend

```env
NOTAAS_API_KEY=ntaas_...
NOTAAS_API_URL=https://platform.notaas.com.br/api/v1
NOTAAS_CNPJ_EMITENTE=55961553000100
NOTAAS_AMBIENTE=producao
NOTAAS_CODIGO_MUNICIPIO_IBGE=4105805
NOTAAS_C_TRIB_NAC=310103
NOTAAS_C_NBS=120013110
NOTAAS_ALIQUOTA_ISS=2
# Teste NF-e: true — produção: mantenha false até validar homologação
NOTAAS_NFE_ENABLED=false
WDAPI2_TOKEN=<token wdapi2>
```

Para testar NF-e: no painel Notaas configure empresa + certificado A1 + CSRT (se a UF exigir), defina `NOTAAS_NFE_ENABLED=true` e `NOTAAS_AMBIENTE=homologacao`, emita a partir de uma OS finalizada com peças.

Remova `ACBR_API_*` / `NUVEM_FISCAL_CLIENT_*` para evitar confusão. Params fiscais antigos (`NUVEM_FISCAL_C_TRIB_NAC` etc.) ainda funcionam como fallback se `NOTAAS_*` correspondente estiver vazio.

**Nunca** commit a API Key. Se vazou em chat/log, revogue e gere outra no Dashboard.

## Teste local

```bash
cd backend
# no .env: NOTAAS_API_KEY=ntaas_...
npm run test-notaas
```

## Fluxo na OS

1. OS finalizada → Gerar NFS-e
2. Status `queued`/`processing` → use **Atualizar status**
3. `issued` → autorizada; PDF via botão DANFSe
4. Cancelar → `POST /cancelar` com o `invoiceId` gravado em `id_provedor`

## Notas antigas (ACBr/Nuvem)

IDs antigos **não** existem na Notaas. Consultar/cancelar/PDF remoto dessas notas tende a falhar — mantenha PDFs já baixados no Benny e reemita novas na Notaas.
