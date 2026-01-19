import agendamentosService from "../services/agendamentosService.js";
import lembretesService from "../services/lembretesService.js";
import logger from "../config/logger.js";

class AgendamentosController {
  async listar(req, res) {
    try {
      const filtros = req.query || {};
      const rows = await agendamentosService.listar(filtros);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar agendamentos:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const ag = await agendamentosService.buscarPorId(req.params.id);
      if (!ag) return res.status(404).json({ error: "Agendamento não encontrado" });
      res.json(ag);
    } catch (error) {
      logger.error("Erro ao buscar agendamento:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const novo = await agendamentosService.criar(req.body);

      // Criar lembrete automático
      const dataLembrete = new Date(novo.data_agendamento);
      dataLembrete.setDate(dataLembrete.getDate() - 1);
      dataLembrete.setHours(9, 0, 0, 0);

      try {
        await lembretesService.criar({
          tipo: "agendamento",
          referencia_id: novo.id,
          titulo: "Lembrete de Agendamento",
          mensagem: `Agendamento amanhã às ${novo.hora_inicio} - ${novo.tipo_servico}`,
          data_lembrete: dataLembrete,
          prioridade: "alta",
        });
      } catch (err) {
        logger.error("Falha ao criar lembrete automático:", err);
      }
      res.status(201).json({ message: "Agendamento criado com sucesso", agendamento: novo });
    } catch (error) {
      if (error.code === "CONFLITO_AGENDAMENTO") {
        return res.status(400).json({ error: error.message });
      }
      logger.error("Erro ao criar agendamento:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const atualizado = await agendamentosService.atualizar(req.params.id, req.body);
      if (!atualizado) return res.status(404).json({ error: "Agendamento não encontrado" });
      res.json({ message: "Agendamento atualizado com sucesso", agendamento: atualizado });
    } catch (error) {
      logger.error("Erro ao atualizar agendamento:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async deletar(req, res) {
    try {
      await agendamentosService.deletar(req.params.id);
      res.json({ message: "Agendamento deletado com sucesso" });
    } catch (error) {
      logger.error("Erro ao deletar agendamento:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async hojeLista(req, res) {
    try {
      const lista = await agendamentosService.hojeLista();
      res.json(lista);
    } catch (error) {
      logger.error("Erro ao listar agendamentos do dia:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AgendamentosController();
