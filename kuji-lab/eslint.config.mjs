import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // setState-after-mount is intentional here: client hooks/contexts hydrate
      // from localStorage in an effect to avoid SSR hydration mismatches.
      "react-hooks/set-state-in-effect": "warn",
      // React Compiler diagnostic; memoization fallback is acceptable.
      "react-hooks/preserve-manual-memoization": "warn",
      // /api/auth/signin is an API route, not a page — <a> is fine.
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
