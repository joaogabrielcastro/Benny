import { resolveTenantId } from "../config/singleTenant.js";
import backupService from "../services/backupService.js";

class BackupController {
  async realizar(req, res) {
    const result = await backupService.realizar(resolveTenantId(req));
    res.json({
      success: true,
      message: "Backup realizado com sucesso",
      ...result,
    });
  }

  async listar(req, res) {
    const backups = await backupService.listar();
    res.json(backups);
  }
}

export default new BackupController();
