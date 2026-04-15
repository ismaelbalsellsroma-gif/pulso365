import { Link } from "react-router-dom";
import {
  Clock,
  MapPin,
  Camera,
  Tablet,
  ShieldCheck,
  BarChart3,
  Check,
  ArrowRight,
  Smartphone,
  Coffee,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Fichaje en segundos",
    description:
      "Entrada, salida y pausas en un clic. Tu equipo entra, fichea y empieza a trabajar.",
  },
  {
    icon: MapPin,
    title: "Geolocalización y geofence",
    description:
      "Asegura que el fichaje se hace dentro del local. Detecta al vuelo fraudes de distancia.",
  },
  {
    icon: Tablet,
    title: "Modo kiosco",
    description:
      "Tablet fija en la entrada. El empleado introduce su PIN de 4-6 dígitos y ficha.",
  },
  {
    icon: Camera,
    title: "Foto anti-fraude",
    description:
      "Captura opcional al entrar y salir. Evita que alguien ficha por otro compañero.",
  },
  {
    icon: Smartphone,
    title: "Responsive real",
    description:
      "Móvil, tablet, navegador — la misma experiencia, pensada desde el móvil primero.",
  },
  {
    icon: BarChart3,
    title: "Reportes en vivo",
    description:
      "Horas trabajadas, extras, coste laboral y cobertura. Exportable a CSV y PDF.",
  },
];

const pricing = [
  {
    name: "Free",
    price: "0€",
    period: "/mes",
    description: "Para probarlo",
    features: ["Hasta 5 empleados", "1 local", "Fichaje móvil", "Historial 30 días"],
    cta: "Empezar gratis",
    featured: false,
  },
  {
    name: "Starter",
    price: "29€",
    period: "/mes",
    description: "Para bares y cafeterías",
    features: [
      "Hasta 20 empleados",
      "1 local",
      "Modo kiosco",
      "Geofence",
      "Reportes",
      "Soporte email",
    ],
    cta: "Probar Starter",
    featured: true,
  },
  {
    name: "Pro",
    price: "69€",
    period: "/mes",
    description: "Para restaurantes y grupos",
    features: [
      "Hasta 100 empleados",
      "Múltiples locales",
      "Foto anti-fraude",
      "API y webhooks",
      "Soporte prioritario",
    ],
    cta: "Probar Pro",
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">Fichaje</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900">Funciones</a>
            <a href="#pricing" className="hover:text-slate-900">Precios</a>
            <a href="#faq" className="hover:text-slate-900">Preguntas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="px-4 h-9 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="px-4 h-9 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 flex items-center gap-1.5"
            >
              Empezar gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 mb-6">
            <Coffee className="h-3 w-3" />
            Diseñado para hostelería · bares, restaurantes, hoteles
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-[1.05]">
            El fichaje que tu equipo
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              quiere usar
            </span>
          </h1>
          <p className="text-lg text-slate-600 mt-6 max-w-2xl mx-auto">
            Control horario moderno con geofence, modo kiosco y foto anti-fraude.
            Adiós Excel, adiós discusiones por las horas. Tu equipo fichea en 2 segundos
            y tú ves todo en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-elevated"
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-slate-50"
            >
              Ver funciones
            </a>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Sin tarjeta · Sin instalación · 2 minutos para empezar
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Todo lo que necesitas para el control horario
            </h2>
            <p className="text-slate-600 mt-4">
              Pensado desde el primer minuto para la realidad de un bar o un
              restaurante: caótica, rápida y móvil.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-brand-600" />
                </div>
                <div className="font-bold text-slate-900">{f.title}</div>
                <p className="text-sm text-slate-600 mt-2">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              En 3 pasos, todo tu equipo fichando
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: "1",
                title: "Crea tu cuenta",
                text: "Regístrate, añade tus empleados y define el PIN de cada uno. Dos minutos.",
              },
              {
                n: "2",
                title: "Configura el local",
                text: "Marca la ubicación del local y el radio de geofence. Listo para fichar.",
              },
              {
                n: "3",
                title: "Fichad",
                text: "Tu equipo usa el móvil o el kiosco. Tú ves todo en tiempo real desde el panel.",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-brand-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {s.n}
                </div>
                <div className="font-bold text-slate-900 text-lg">{s.title}</div>
                <p className="text-slate-600 text-sm mt-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Precios simples, sin sorpresas
            </h2>
            <p className="text-slate-600 mt-4">
              Empieza gratis, crece cuando lo necesites. Sin permanencias.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={
                  "rounded-2xl p-6 flex flex-col " +
                  (p.featured
                    ? "bg-slate-900 text-white border-2 border-brand-500 shadow-elevated scale-[1.02]"
                    : "bg-white border border-slate-200")
                }
              >
                <div className="font-bold text-lg">{p.name}</div>
                <div className={"text-sm " + (p.featured ? "text-slate-400" : "text-slate-500")}>
                  {p.description}
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold tabular-nums">{p.price}</span>
                  <span className={p.featured ? "text-slate-400" : "text-slate-500"}>
                    {p.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={"h-4 w-4 mt-0.5 shrink-0 " + (p.featured ? "text-brand-400" : "text-emerald-600")} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={
                    "mt-6 inline-flex items-center justify-center h-11 rounded-lg font-semibold text-sm " +
                    (p.featured
                      ? "bg-brand-500 text-white hover:bg-brand-400"
                      : "bg-slate-900 text-white hover:bg-slate-800")
                  }
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ShieldCheck className="h-10 w-10 text-brand-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-900">
            Cumple con la normativa de control horario
          </h2>
          <p className="text-slate-600 mt-4">
            Registro horario obligatorio, trazabilidad completa de cada fichaje, exportación
            para inspección de trabajo. Tranquilidad legal garantizada.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 mt-6 h-12 px-6 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700"
          >
            Empezar ahora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Fichaje</span>
            <span className="text-xs text-slate-500">
              · Control horario SaaS para hostelería
            </span>
          </div>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} · Hecho con ♥ en España
          </div>
        </div>
      </footer>
    </div>
  );
}
