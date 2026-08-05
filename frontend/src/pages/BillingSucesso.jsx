import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function BillingSucesso() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 px-4">
      <Logo size="lg" />
      <h1 className="mt-6 text-2xl font-bold">Pagamento recebido</h1>
      <p className="mt-2 text-slate-400 text-center max-w-md">
        Sua assinatura está sendo ativada. Em instantes você já pode entrar com o e-mail e a
        senha cadastrados.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/login"
          className="rounded-xl bg-blue-500 hover:bg-blue-400 px-5 py-2.5 font-semibold text-white"
        >
          Ir para o login
        </Link>
        <Link
          to="/assinatura"
          className="rounded-xl border border-slate-600 px-5 py-2.5 font-semibold"
        >
          Ver assinatura
        </Link>
      </div>
    </div>
  );
}
