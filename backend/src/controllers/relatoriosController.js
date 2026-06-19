import { resolveTenantId } from "../config/singleTenant.js";
import relatoriosService from "../services/relatoriosService.js";

class RelatoriosController {
  async dashboard(req, res) {
    const data = await relatoriosService.dashboard(resolveTenantId(req));
    res.json(data);
  }

  async vendas(req, res) {
    const { dataInicio, dataFim } = req.query;
    const data = await relatoriosService.vendas(
      resolveTenantId(req),
      dataInicio,
      dataFim,
    );
    res.json(data);
  }
}

export default new RelatoriosController();
