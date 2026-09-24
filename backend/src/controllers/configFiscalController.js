import { resolveTenantId } from "../config/singleTenant.js";
import {
  getFiscalConfig,
  salvarRegimeFiscal,
} from "../services/fiscal/configFiscalService.js";
import { REGIMES_FISCAIS, codigosDaFamilia } from "../domain/configuracaoFiscalTenant.js";

class ConfigFiscalController {
  async obter(req, res) {
    const config = await getFiscalConfig(resolveTenantId(req));
    res.json({
      ...config,
      opcoes: Object.entries(REGIMES_FISCAIS).map(([id, item]) => ({
        id,
        crt: item.crt,
        rotulo: item.rotulo,
        familia: item.familia,
        codigos: codigosDaFamilia(id),
      })),
    });
  }

  async atualizar(req, res) {
    const body = req.validated?.body ?? req.body;
    const config = await salvarRegimeFiscal(
      resolveTenantId(req),
      body.regime_tributario,
      body.icms_codigo,
      {
        uf: body.uf,
        cfop_interno: body.cfop_interno,
        cfop_interestadual: body.cfop_interestadual,
      },
      req.user?.id ?? "sistema",
    );
    res.json(config);
  }
}

export default new ConfigFiscalController();
