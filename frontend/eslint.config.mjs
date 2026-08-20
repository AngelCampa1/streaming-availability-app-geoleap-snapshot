import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const nextPluginConfig = nextCoreWebVitals.find((config) => config.plugins) ?? {};
const nextTypescriptPluginConfig = nextTypescript.find((config) => config.plugins) ?? {};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      ".jest-cache/**",
      ".swc/**",
      "out/**",
      "build/**",
      "dist/**",
      "test-results/**",
      "coverage/**",
      "*.txt",
      "*.log",
      "tsconfig.tsbuildinfo",
      "next-env.d.ts",
      "public/sw.js"
    ],
  },
  {
    plugins: {
      ...nextPluginConfig.plugins,
      ...nextTypescriptPluginConfig.plugins,
    },
    rules: {
      // Relaxed warnings that don't affect functionality
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "jsx-a11y/alt-text": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",

      // Keep critical rules as errors
      // Temporarily warning due to widespread usage in existing codebase - should be migrated to 'unknown' or proper types
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react/jsx-no-undef": "error"
    },
  },
  // Allow 'any' types in test files for mocking purposes
  {
    files: ["**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    },
  },
];

export default eslintConfig;
