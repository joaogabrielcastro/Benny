import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import backupService from "../services/backupService.js";
import logger from "../config/logger.js";

class BackupController {
  async realizar(req, res) {
    try {
      const result = await backupService.realizar(SINGLE_TENANT_ID);
      res.json({
        success: true,
        message: "Backup realizado com sucesso",
        ...result,
      });
    } catch (error) {
      logger.error("Erro ao realizar backup:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async listar(req, res) {
    try {
      const backups = await backupService.listar();
      res.json(backups);
    } catch (error) {
      logger.error("Erro ao listar backups:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new BackupController();
