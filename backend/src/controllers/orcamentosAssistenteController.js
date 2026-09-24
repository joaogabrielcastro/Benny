import pool from "../../database.js";
import { resolveTenantId } from "../config/singleTenant.js";
import { createOrcamentosAssistenteService } from "../services/orcamentos/orcamentosAssistenteService.js";

const orcamentosAssistenteService = createOrcamentosAssistenteService({
  query: (sql, params) => pool.query(sql, params),
});

class OrcamentosAssistenteController {
  async sugerir(req, res) {
    const body = req.validated?.body ?? req.body;
    const result = await orcamentosAssistenteService.sugerir({
      tenantId: resolveTenantId(req),
      userId: req.user?.id ?? null,
      body,
    });
    res.json(result);
  }
}

export default new OrcamentosAssistenteController();
