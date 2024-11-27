import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const compat = new FlatCompat();

export default [
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
