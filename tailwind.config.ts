import type { Config } from "tailwindcss";

const v = (nombre: string) => `var(--${nombre})`;
const conSuave = (nombre: string) => ({ DEFAULT: v(nombre), suave: v(`${nombre}-suave`) });
const nivel = (nombre: string) => ({ DEFAULT: v(`nivel-${nombre}`), tinta: v(`nivel-${nombre}-tinta`), suave: v(`nivel-${nombre}-suave`) });

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/presentation/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fondo: v("fondo"),
        superficie: { DEFAULT: v("superficie"), 2: v("superficie-2") },
        borde: { DEFAULT: v("borde"), fuerte: v("borde-fuerte"), control: v("borde-control") },
        texto: { DEFAULT: v("texto"), suave: v("texto-suave") },
        primario: { DEFAULT: v("primario"), hover: v("primario-hover"), texto: v("primario-texto") },
        acento: { DEFAULT: v("acento"), texto: v("acento-texto") },
        foco: v("foco"),
        error: conSuave("error"),
        barra: {
          DEFAULT: v("barra"), 2: v("barra-2"), borde: v("barra-borde"),
          texto: v("barra-texto"), suave: v("barra-suave"),
        },
        estado: {
          vigente: conSuave("estado-vigente"),
          "por-vencer": conSuave("estado-por-vencer"),
          vencido: conSuave("estado-vencido"),
        },
        nivel: {
          supera: nivel("supera"),
          meta: nivel("meta"),
          minimo: nivel("minimo"),
          "fuera-de-meta": nivel("fuera-de-meta"),
          "sin-dato": nivel("sin-dato"),
        },
        serie: { laboral: v("serie-laboral"), trayecto: v("serie-trayecto") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { DEFAULT: v("radio"), lg: v("radio-lg") },
      boxShadow: { suave: v("sombra"), alta: v("sombra-alta") },
      spacing: { barra: v("ancho-barra"), cabecera: v("alto-cabecera") },
    },
  },
  plugins: [],
};
export default config;
