import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 暂时关闭，后续优化时会逐个处理
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;