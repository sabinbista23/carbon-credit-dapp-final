module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: ["eslint:recommended", "prettier"],
  ignorePatterns: ["client/**", "artifacts/**", "cache/**", "coverage/**", "node_modules/**"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-console": "off",
  },
};
