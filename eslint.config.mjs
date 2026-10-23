import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Reglas nuevas del React Compiler como aviso en codigo existente
const rulesComoAviso = {
  "react-hooks/refs": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/use-memo": "warn",
};

const config = [
  ...nextVitals,
  ...nextTs,
  { rules: rulesComoAviso },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
