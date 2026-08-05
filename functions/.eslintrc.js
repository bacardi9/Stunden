module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": ["error", {
      args: "none",
      varsIgnorePattern: "^(onRequest|onCall|onSchedule|logger)$"
    }],
    "no-undef": "off",
  },
};
