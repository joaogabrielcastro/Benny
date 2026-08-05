# Plano de migração: Nuvem Fiscal → ACBr API

> **Atualização:** o Benny migrou para a **Notaas** (API Key). Veja `docs/MIGRACAO_NOTAAS.md`. Este documento fica como histórico da tentativa ACBr.

**Contexto:** a Nuvem Fiscal foi desativada em **31/07/2026**.

Documentação oficial: [Migrando da Nuvem Fiscal para a ACBr API](https://dev.acbr.api.br/docs/migrando-da-nuvem-fiscal-para-a-acbr-api)

---

## Resumo executivo

A migração no código é **pequena** (troca de URLs + credenciais + textos). O trabalho operacional (console ACBr + recadastro da empresa + certificado) é o que libera a emissão novamente.

| Item | Nuvem Fiscal (antigo) | ACBr API (novo) |
|------|----------------------|-----------------|
| Produção | `https://api.nuvemfiscal.com.br` | `https://prod.acbr.api.br` |
| Homologação | `https://api.sandbox.nuvemfiscal.com.br` | `https://hom.acbr.api.br` |
| OAuth token | `https://auth.nuvemfiscal.com.br/oauth/token` | `https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token` |
| Console | console.nuvemfiscal.com.br | [console.acbr.api.br](https://console.acbr.api.br) |
| Fluxo | `client_credentials` | `client_credentials` (igual) |
| Paths `/nfse/dps`, `/nfe`, etc. | iguais | **iguais** (manter) |

**Importante (doc ACBr):**

- Credenciais Nuvem **não** funcionam na ACBr — gerar novas.
- Empresas cadastradas na Nuvem **precisam ser recadastradas** na ACBr.
- IDs de notas emitidas na Nuvem **não** valem na ACBr (cancelar/PDF de notas antigas pode falhar).

---

## Fase 0 — Conta e empresa (fora do código)

1. Criar conta / plano na ACBr API ([console.acbr.api.br](https://console.acbr.api.br)).
2. Gerar credencial **Produção** (e, se quiser testar, **Homologação**).
3. Recadastrar a empresa **BENNYS CENTRO AUTOMOTIVO** (CNPJ `55.961.553/0001-00`).
4. Instalar certificado A1 no painel ACBr (equivalente ao que existia na Nuvem).
5. Configurar NFS-e (ambiente, série/RPS, regime) e NF-e (CRT) no painel, como antes.
6. Guardar `Client ID` / `Client Secret` com segurança.

**Critério de saída:** token OAuth OK + consulta CEP de teste OK na ACBr.

---

## Fase 1 — Configuração Coolify (rápido, desbloqueia emissão)

Atualizar variáveis do **backend** (sem mudar paths de código ainda, se defaults forem ajustados; idealmente já com o código da Fase 2):

```env
# Remover / deixar de usar
# NUVEM_FISCAL_CLIENT_ID / SECRET / API_URL / AUTH_URL

ACBR_API_CLIENT_ID=<novo>
ACBR_API_CLIENT_SECRET=<novo>
ACBR_API_URL=https://prod.acbr.api.br
ACBR_API_AUTH_URL=https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token
ACBR_API_AMBIENTE=producao
ACBR_API_SCOPE=conta empresa cep cnpj nfse nfe nfce

# Demais dados fiscais (CNPJ, IBGE, ISS, IE, RESP_TEC…) podem manter os mesmos valores;
# apenas renomear o prefixo NUVEM_FISCAL_* → ACBR_API_* (ou alias no código na Fase 2).
```

Homologação (testes):

```env
ACBR_API_URL=https://hom.acbr.api.br
ACBR_API_AMBIENTE=homologacao
```

Corrigir typo antigo se ainda existir: `NNUVEM_FISCAL_C_NBS` → nome correto da var de NBS.

**Redeploy** após salvar.

---

## Fase 2 — Código Benny (compatível, baixo risco)

> **Status: implementado** — o app já usa defaults ACBr (`prod`/`hom`/`auth`) e lê `ACBR_API_*` com fallback `NUVEM_FISCAL_*`.

### 2.1 Camada HTTP / config (prioridade)

| Arquivo | Mudança |
|---------|---------|
| `backend/src/config/nuvemFiscal.js` | Renomear conceitualmente para provedor fiscal genérico **ou** ler `ACBR_API_*` com fallback legado `NUVEM_FISCAL_*`. Defaults: auth + API ACBr. |
| `backend/src/services/nuvemFiscalClient.js` | Usar novas URLs; manter paths `/nfse/dps`, `/nfe`, `/nfse/{id}`, cancelamento, pdf. |
| `backend/scripts/test-nuvem-fiscal.mjs` | Renomear/adaptar smoke test OAuth ACBr. |
| `backend/.env.example`, `docker-compose.yml`, `docs/DEPLOY_COOLIFY.md` | Documentar vars ACBr. |

### 2.2 O que **não** precisa reescrever (segundo a ACBr)

- Payloads NFS-e DPS (`nuvemFiscalNfsePayload.js`)
- Payloads NF-e (`nuvemFiscalNfePayload.js`)
- Parser de resposta / sync / cancel / PDF (mesma forma)
- Rotas Benny `/notas-fiscais/*`
- Fluxo OS → gerar → atualizar status → PDF

### 2.3 Ajustes cosméticos / dados

| Item | Ação |
|------|------|
| `notas_fiscais.provedor` | Novas emissões: `acbr_api` (default). Histórico pode ficar `nuvem_fiscal`. |
| Frontend (`NotaFiscalModal`, `fiscalUtils`, etc.) | Trocar textos “Nuvem Fiscal” → “ACBr API” / “provedor fiscal”. |
| Mensagens de erro CLIENT_ID/SECRET | Apontar console ACBr. |

### 2.4 Notas já emitidas na Nuvem

- **Consultar / cancelar / PDF** de `id_provedor` antigo: esperado **falhar** na ACBr.
- Política sugerida: manter PDF/XML já salvos no Benny; bloquear cancelamento remoto de notas Nuvem com mensagem clara; novas emissões só via ACBr.

---

## Fase 3 — Validação

### Homologação (`hom.acbr.api.br`)

1. `npm run test-nuvem-fiscal` (ou script ACBr) → token OK.
2. OS finalizada → emitir **NFS-e** → status autorizada + PDF.
3. Se NF-e habilitada: IE + CSRT + certificado → emitir **NF-e** de teste.

### Produção (`prod.acbr.api.br`)

1. Credencial **Produção** + empresa + certificado A1 no painel.
2. Uma NFS-e de valor baixo em OS real.
3. Contadora valida antes do volume.

---

## Fase 4 — Config por tenant (opcional / paralelo)

Se a branch com `fiscal_configuracoes` estiver ativa: manter CNPJ/IE/flags no banco; só a camada OAuth/URL fica global do SaaS (`ACBR_API_*`).  
Se ainda for 100% env: migrar vars no Coolify e seguir.

---

## Estimativa

| Fase | Esforço | Quem |
|------|---------|------|
| 0 Conta + empresa + certificado | 0,5–1 dia | Você / contadora |
| 1 Coolify | 30–60 min | Você |
| 2 Código (URL/creds/textos) | **0,5–1 dia** | Dev |
| 3 Homologação + 1 nota produção | 0,5–1 dia | Dev + oficina |
| Notas históricas Nuvem | ops / política | — |

**Total típico:** ~2–4 dias úteis (não semanas), graças à compatibilidade de API.

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Empresa não recadastrada na ACBr | Checklist Fase 0 obrigatório |
| Credencial sandbox na URL de produção | Parear tipo da credencial com `ACBR_API_URL` |
| Cancelar nota antiga Nuvem | UI: só cancelar se `provedor = acbr_api` |
| Plano / billing ACBr | Confirmar condições comerciais no e-mail pós-cadastro |
| Segredos vazados no chat | Rotacionar JWT, DB, Client Secret, WDAPI2 |

---

## Ordem sugerida de execução no código

1. Alias de config: ler `ACBR_API_*` (fallback `NUVEM_FISCAL_*`).
2. Defaults de `authUrl` / `apiBaseUrl` → ACBr.
3. Smoke test OAuth.
4. Emitir NFS-e em homologação.
5. Atualizar docs Coolify + textos UI.
6. Produção.

---

## Links

- Migração: https://dev.acbr.api.br/docs/migrando-da-nuvem-fiscal-para-a-acbr-api  
- Auth: https://dev.acbr.api.br/docs/autenticacao  
- Console: https://console.acbr.api.br  
- Status: página de status da ACBr API (doc intro)  
