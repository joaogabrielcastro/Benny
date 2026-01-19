import gatewayConfigsService from "../services/gatewayConfigsService.js";

class GatewayController {
  async criar(req, res) {
    try {
      const cfg = await gatewayConfigsService.criar(req.body);
      // não expor binário direto
      if (cfg.certificado_a1) cfg.certificado_a1 = "<binary>";
      res.status(201).json(cfg);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async listar(req, res) {
    try {
      const list = await gatewayConfigsService.listar();
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async buscar(req, res) {
    try {
      const cfg = await gatewayConfigsService.buscarPorId(req.params.id);
      if (!cfg) return res.status(404).json({ error: "Config not found" });
      // do not expose binary certificado directly in list endpoint
      if (cfg.certificado_a1) cfg.certificado_a1 = "<binary>";
      res.json(cfg);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async baixarCertificado(req, res) {
    try {
      const id = req.params.id;
      const cfg = await gatewayConfigsService.buscarPorId(id);
      if (!cfg) return res.status(404).json({ error: "Config not found" });
      if (!cfg.certificado_a1)
        return res.status(404).json({ error: "Certificado não encontrado" });

      // Registrar auditoria simples
      const usuario =
        req.headers["x-audit-user"] || req.query.user || "unknown";
      await gatewayConfigsService.registrarAuditoria(id, usuario);

      // Decrypt certificado and return base64
      import("../lib/crypto.js")
        .then(({ decryptToBase64 }) => {
          try {
            const base64 = decryptToBase64(cfg.certificado_a1);
            res.json({ certificadoBase64: base64 });
          } catch (e) {
            res
              .status(500)
              .json({ error: "Erro ao descriptografar certificado" });
          }
        })
        .catch((err) => {
          res.status(500).json({ error: "Erro interno" });
        });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async deletar(req, res) {
    try {
      const resp = await gatewayConfigsService.deletar(req.params.id);
      res.json(resp);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

export default new GatewayController();
