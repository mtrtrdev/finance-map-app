module.exports = {
  root: true,
  env: {
    es6: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "google"
  ],
  rules: {
    quotes: ["error", "double"],
    indent: ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "no-trailing-spaces": "error",
    "eol-last": "error",
    "comma-dangle": ["error", "never"],
    "max-len": ["off"],
    "require-jsdoc": "off",
    "quote-props": ["off"],
    "no-unused-vars": "off"
  },
  parserOptions: {
    ecmaVersion: 2020
  },
  globals: {
    functions: "readonly",
    logger: "readonly",
    onRequest: "readonly"
    // onSchedule: "readonly" // この行を削除またはコメントアウト
  }
};
