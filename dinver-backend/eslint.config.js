const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat();

module.exports = [
  js.configs.recommended,
  ...compat.config({
    env: {
      node: true,
      commonjs: true,
      es2021: true,
    },
    parserOptions: {
      ecmaVersion: 12,
    },
    rules: {
      'no-unused-vars': 'warn',
    },
  }),
];
