// @ts-check
import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginJest from "eslint-plugin-jest";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "eslint.config.mjs",
      "**/node_modules/**",
      "**/dist/**",
      "**/lib/**",
      "**/build/**",
      "**/coverage/**",
      "**/public/**",
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  eslintPluginJest.configs["flat/recommended"],
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        ...globals.es2023,
      },
      sourceType: "module",
      parserOptions: {
        ecmaVersion: "latest",
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "prettier/prettier": ["error", { doubleQuote: true, printWidth: 120 }],
      ...pluginJs.configs.recommended.rules,
      ...eslintPluginJest.configs.recommended.rules,
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "error",
      "no-unused-expressions": "error",
      "no-unused-vars": "error",
      "no-use-before-define": "error",
      "no-useless-constructor": "error",
      semi: ["error", "always"],
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: "return",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
);
