import globals from "globals";
import js from "@eslint/js";

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
    rules: {
      "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "no-undef": "error",
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
    files: ["js/vendor/**"],
    rules: {
      "no-var": "off",
      "prefer-const": "off",
      "no-unused-vars": "off",
    },
  },
];
