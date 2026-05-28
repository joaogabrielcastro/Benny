import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import { roleLabel } from "../utils/roles";

const emptyForm = {
  nome: "",
  email: "",
  senha: "",
  role: "mecanico",
  ativo: true,
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/usuarios");
      setUsuarios(data);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm(emptyForm);
    setModalAberto(true);
  };

  const abrirEditar = (u) => {
    setEditando(u);
    setForm({
      nome: u.nome,
      email: u.email,
      senha: "",
      role: u.role,
      ativo: u.ativo,
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        const payload = {
          nome: form.nome,
          email: form.email,
          role: form.role,
          ativo: form.ativo,
        };
        if (form.senha.trim()) payload.senha = form.senha;
        await api.put(`/usuarios/${editando.id}`, payload);
        toast.success("Usuário atualizado");
      } else {
        await api.post("/usuarios", {
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          role: form.role,
        });
        toast.success("Usuário criado");
      }
      fecharModal();
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao salvar usuário");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div className="page-enter">
      <PageHeader
        title="Usuários"
        subtitle="Cadastre administradores e mecânicos com acesso ao sistema."
        actions={
          <button type="button" onClick={abrirNovo} className="btn-brand">
            Novo usuário
          </button>
        }
      />

      <div className="pro-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  E-mail
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Perfil
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    {u.nome}
                    {Number(u.id) === Number(currentUser?.id) && (
                      <span className="ml-2 text-xs text-brand-600">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-sm">{roleLabel(u.role)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.ativo
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => abrirEditar(u)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <Modal
          isOpen
          onClose={fecharModal}
          title={editando ? "Editar usuário" : "Novo usuário"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome
              </label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input-pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {editando ? "Nova senha (opcional)" : "Senha"}
              </label>
              <input
                type="password"
                required={!editando}
                minLength={6}
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="input-pro"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Perfil
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input-pro"
              >
                <option value="admin">Administrador</option>
                <option value="mecanico">Mecânico</option>
              </select>
            </div>
            {editando && (
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Usuário ativo
              </label>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button type="button" onClick={fecharModal} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="btn-brand">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
