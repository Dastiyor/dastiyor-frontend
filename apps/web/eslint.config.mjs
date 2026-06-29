import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code worktrees
    ".claude/**",
  ]),
  // Tests and Jest config legitimately use `any` for mocks/fixtures and
  // CommonJS `require()` for setup — relax those rules there only.
  {
    files: [
      "**/__tests__/**",
      "**/*.test.{ts,tsx,js,jsx}",
      "jest.setup.js",
      "jest.config.js",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // The React Compiler lint rules (new in Next 16) flag many legitimate,
  // ubiquitous patterns — fetch-on-mount effects, hydration-safe localStorage
  // initialization, resetting state on navigation — that have no clean refactor
  // without regression risk in this app. Keep them as warnings so they stay
  // visible for incremental cleanup without blocking the build/CI.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
