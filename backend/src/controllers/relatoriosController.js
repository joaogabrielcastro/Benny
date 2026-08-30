import { resolveTenantId } from "../config/singleTenant.js";
import relatoriosService from "../services/relatoriosService.js";
import fechamentoMensalService from "../services/fechamentoMensal/fechamentoMensalService.js";
import { AppError } from "../lib/AppError.js";

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

  async fechamentoMensal(req, res) {
    const { ano, mes } = req.validated.query;
    const data = await fechamentoMensalService.obterResumo(
      resolveTenantId(req),
      ano,
      mes,
    );
    if (data.erro) throw new AppError(400, data.erro);
    res.json(data);
  }

  async exportarFechamentoMensal(req, res) {
    const { ano, mes } = req.validated.query;
    const result = await fechamentoMensalService.exportarZip(
      resolveTenantId(req),
      ano,
      mes,
    );
    if (result.erro) throw new AppError(400, result.erro);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }
}

export default new RelatoriosController();
