import empresasService from "../services/empresasService.js";

class EmpresasController {
  async criar(req, res) {
    try {
      const empresa = await empresasService.criarEmpresa(req.body);
      res.status(201).json(empresa);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async listar(req, res) {
    try {
      const list = await empresasService.listar();
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const emp = await empresasService.buscarPorId(req.params.id);
      if (!emp) return res.status(404).json({ error: "Empresa não encontrada" });
      res.json(emp);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new EmpresasController();
