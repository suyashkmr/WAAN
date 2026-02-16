import globals from "globals";
import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["js/vendor/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "no-undef": "error",
      "import/no-unused-modules": [
        "error",
        {
          unusedExports: true,
          src: ["js/**/*.js", "apps/server/src/**/*.js", "tests/**/*.js"],
          ignoreExports: ["js/main.js", "apps/server/src/index.js"],
        },
      ],
    },
  },
  {
    files: ["js/**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
    rules: {
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    files: ["apps/server/src/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
  {
    files: ["js/vendor/**"],
    rules: {
      "no-var": "off",
      "prefer-const": "off",
      "no-unused-vars": "off",
    },
  },
];
