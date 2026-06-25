# Deploy Benny no Coolify

Guia para **Bennys Centro Automotivo** (single-tenant, uma oficina).

## Visão geral

| Serviço | Sugestão |
|---------|----------|
| API | App Node (`backend/`, comando `npm start`) |
| Frontend | Build estático Vite (`frontend/`, `npm run build` → `dist/`) |
| Banco | PostgreSQL gerenciado pelo Coolify |

## 1. PostgreSQL

1. Crie um banco PostgreSQL no Coolify.
2. Copie a `DATABASE_URL` (connection string).

## 2. Backend (API)

**Build / start**

- Diretório raiz do app: `backend`
- Install: `npm ci`
- Start: `npm start`
- Node: **22**

**Variáveis obrigatórias**

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3011
JWT_SECRET=<mínimo 32 caracteres aleatórios>
DEFAULT_TENANT_ID=1
SKIP_DB_INIT_DDL=true
```

**Após o primeiro deploy (ou a cada migration nova)**

Execute no container ou como comando one-off:

```bash
npm run migrate
```

Isso aplica `backend/migrations/*.sql` e registra em `schema_migrations`.

**Nuvem Fiscal** — credenciais e ambiente (ver seção 7).

**Health check:** `GET /api/health`

## 3. Frontend

**Build**

- Diretório: `frontend`
- Build: `npm ci && npm run build`
- Publicar pasta `dist/`

**Variável de build**

```env
VITE_API_URL=https://api-benny.seudominio.com.br
```

(sem `/api` no final — o app adiciona automaticamente)

## 4. Migrations pendentes em produção

Confirme que estas migrations foram aplicadas:

- `005_notas_fiscais_por_modelo.sql` (NFS-e + NF-e separados por OS)

```bash
cd backend && npm run migrate
```

## 5. Checklist pós-deploy

- [ ] Login com usuário existente
- [ ] Listagem de OS, clientes, produtos (formato paginado)
- [ ] OS finalizada → NFS-e (serviços) e NF-e (peças) em **produção** (não sandbox)
- [ ] CEP do cliente salvo na OS antes de emitir NFS-e
- [ ] `JWT_SECRET` forte (não usar valor de desenvolvimento)

## 6. Painel Nuvem Fiscal (contadora)

Alinhar com Débora:

- Regime apuração ISS no painel: **1** = ISS pelo Simples (ME/EPP); com `tpRetISSQN=1` o Benny **não** envia alíquota na DPS (regra ADN)
- `NUVEM_FISCAL_TP_RET_ISSQN=1` (padrão) — só use `2` se houver retenção pelo tomador
- Certificado A1 configurado
- NBS definitivo em `NUVEM_FISCAL_C_NBS`
- CNPJ software SEFAZ: **46.363.985/0001-00** (Nuvem/WA2)

## 7. Mudar Nuvem Fiscal de Sandbox para Produção

### 7.1 Painel Nuvem Fiscal (web)

1. Empresa **Bennys** → **Serviços** → **NFS-e**
2. Troque o toggle de **Sandbox** para **Produção** (não deixe em Homologação)
3. Confira com a contadora: **lote, série e próximo número RPS** (alinhar ao último RPS real emitido)
4. Regime Simples Nacional (como no print): ME/EPP, reg. apuração **1**
5. Se Colombo exigir: login/senha/token da prefeitura em **Produção**
6. **Certificado A1** da oficina instalado na aba Certificado (válido em produção)
7. Repita para **NF-e** → **Produção** (se for emitir peças)

### 7.2 Console Nuvem (credenciais API)

1. [console.nuvemfiscal.com.br](https://console.nuvemfiscal.com.br) → **Credenciais de API**
2. Crie ou copie credenciais de **Produção** (as do Sandbox **não** funcionam na API de produção)

### 7.3 Coolify — variáveis do **backend**

```env
NUVEM_FISCAL_CLIENT_ID=<credencial PRODUÇÃO do console>
NUVEM_FISCAL_CLIENT_SECRET=<credencial PRODUÇÃO do console>
NUVEM_FISCAL_CNPJ_EMITENTE=55961553000100
NUVEM_FISCAL_API_URL=https://api.nuvemfiscal.com.br
NUVEM_FISCAL_AMBIENTE=producao
NUVEM_FISCAL_PROVEDOR=nacional
NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE=4105805
NUVEM_FISCAL_C_TRIB_NAC=140101
NUVEM_FISCAL_C_NBS=120013110
NUVEM_FISCAL_ALIQUOTA_ISS=2
NUVEM_FISCAL_TP_RET_ISSQN=1
WDAPI2_TOKEN=<token wdapi2>
# NF-e desativada até credenciamento SEFAZ/PR (só NFS-e por enquanto)
NUVEM_FISCAL_NFE_ENABLED=false
```

Quando o CSRT for liberado, altere para `NUVEM_FISCAL_NFE_ENABLED=1` e preencha IE + RESP_TEC + CSRT.

NF-e (peças), quando habilitar:

```env
NUVEM_FISCAL_EMITENTE_IE=<IE da oficina>
NUVEM_FISCAL_RESP_TEC_CNPJ=53020885000157
NUVEM_FISCAL_RESP_TEC_CONTATO=...
NUVEM_FISCAL_RESP_TEC_EMAIL=...
NUVEM_FISCAL_RESP_TEC_FONE=...
NUVEM_FISCAL_RESP_TEC_CSRT_ID=...
NUVEM_FISCAL_RESP_TEC_CSRT=...
```

4. **Redeploy** do backend após salvar.

### 7.4 Teste seguro

1. Emita **uma** NFS-e de valor baixo em OS real finalizada
2. Confirme status **autorizada** e PDF sem marca “homologação”
3. Contadora valida na prefeitura antes de emitir em volume

## Referência

Arquitetura: `backend/ARCHITECTURE.md`  
Checklist código: `backend/IMPLEMENTATION_CHECKLIST.md`
