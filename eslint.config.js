export default [
  {
    ignores: ["node_modules/", "assets/words.txt"],
  },
  {
    files: ["src/**/*.js", "test/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        self: "readonly",
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        performance: "readonly",
        URL: "readonly",
        Blob: "readonly",
        Worker: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      eqeqeq: ["error", "smart"],
    },
  },
];
