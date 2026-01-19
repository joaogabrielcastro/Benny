import contasPagarService from "../services/contasPagarService.js";
import logger from "../config/logger.js";

class ContasPagarController {
  async listar(req, res) {
    try {
      const filtros = req.query || {};
      const rows = await contasPagarService.listar(filtros);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar contas:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const conta = await contasPagarService.buscarPorId(req.params.id);
      if (!conta) return res.status(404).json({ error: "Conta não encontrada" });
      res.json(conta);
    } catch (error) {
      logger.error("Erro ao buscar conta:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const nova = await contasPagarService.criar(req.body);

      // criar lembrete automático (3 dias antes)
      try {
        const dataLembrete = new Date(nova.data_vencimento);
        dataLembrete.setDate(dataLembrete.getDate() - 3);
        dataLembrete.setHours(9, 0, 0, 0);

        // Importar lembretesService dinamicamente para evitar ciclo de importação
        const lembretesService = (await import("../services/lembretesService.js")).default;
        await lembretesService.criar({
          tipo: "conta_pagar",
          referencia_id: nova.id,
          titulo: "Lembrete de Pagamento",
          mensagem: `Conta a vencer em 3 dias: ${nova.descricao} - ${nova.valor}`,
          data_lembrete: dataLembrete,
          prioridade: "alta",
        });
      } catch (err) {
        logger.error("Falha ao criar lembrete automático para conta:", err);
      }

      res.status(201).json({ message: "Conta criada com sucesso", conta: nova });
    } catch (error) {
      logger.error("Erro ao criar conta:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const updated = await contasPagarService.atualizar(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Conta não encontrada" });
      res.json({ message: "Conta atualizada com sucesso", conta: updated });
    } catch (error) {
      logger.error("Erro ao atualizar conta:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async deletar(req, res) {
    try {
      await contasPagarService.deletar(req.params.id);
      res.json({ message: "Conta deletada com sucesso" });
    } catch (error) {
      logger.error("Erro ao deletar conta:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async alertasResumo(req, res) {
    try {
      const resumo = await contasPagarService.alertasResumo();
      res.json(resumo);
    } catch (error) {
      logger.error("Erro ao obter alertas resumo:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ContasPagarController();
