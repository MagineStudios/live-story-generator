import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Apply less strict rules globally
    rules: {
      // Disable rules that are causing your current issues
      "@typescript-eslint/no-explicit-any": "off",       // Allow 'any' type
      "@typescript-eslint/no-unused-vars": ["warn", {    // Downgrade unused vars to warnings
        "argsIgnorePattern": "^_",                       // Ignore vars starting with underscore
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/ban-ts-comment": "warn",       // Downgrade ts-comment restrictions to warnings

      // Additional rules to relax TypeScript strictness
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions (!)
      "no-console": "off",                               // Allow console statements
      "@typescript-eslint/explicit-module-boundary-types": "off", // Don't require explicit return types

      // More permissive handling of promises and types
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",

      // Add rule to fix the unescaped entities issue
      "react/no-unescaped-entities": "off"  // Turn off the react rule causing issues with apostrophes
    }
  },
  {
    // Ignore certain patterns
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "dist/**",
      "build/**",
      "*.wasm.js",
      "src/**/runtime/**",
      "src/generated/**",
    ]
  }
];

export default eslintConfig;