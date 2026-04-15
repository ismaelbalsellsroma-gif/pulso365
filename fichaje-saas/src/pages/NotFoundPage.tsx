import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-slate-300">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">
          Página no encontrada
        </h1>
        <p className="text-slate-500 mt-2">
          La ruta que buscas no existe o fue movida.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-4 h-10 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
