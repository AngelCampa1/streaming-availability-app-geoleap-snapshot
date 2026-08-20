# Code Style Guide - Frontend

## Overview

This document outlines the code style standards and linting configuration for the GeoLeap frontend application. Following these guidelines ensures consistent, maintainable, and high-quality code across the team.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Configuration Files](#configuration-files)
3. [Linting Rules](#linting-rules)
4. [Code Formatting](#code-formatting)
5. [Common Linting Errors](#common-linting-errors)
6. [Running Linters](#running-linters)
7. [IDE Setup](#ide-setup)
8. [Pre-commit Hooks](#pre-commit-hooks)

---

## Quick Reference

### Essential Commands

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Check code formatting
npm run format:check

# Auto-format code
npm run format

# Type checking
npm run typecheck

# Run all validation checks
npm run lint && npm run typecheck && npm test
```

### Zero Error Policy

All code must pass with **0 linting errors**. Warnings are acceptable but should be minimized.

---

## Configuration Files

### `.editorconfig`

Ensures consistent editor settings across different IDEs:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx}]
indent_style = space
indent_size = 2
max_line_length = 120

[*.{json,yml,yaml}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

### `.prettierrc.json`

Code formatting configuration:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 120,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "jsxBracketSameLine": false
}
```

### `eslint.config.mjs`

ESLint rules configuration (see [Linting Rules](#linting-rules) section).

---

## Linting Rules

### Critical Rules (Errors)

These rules are enforced as errors and will prevent code from being merged:

```javascript
{
  "@typescript-eslint/no-explicit-any": "error",  // Never use 'any' type
  "react-hooks/rules-of-hooks": "error",          // Follow React Hooks rules
  "react/jsx-no-undef": "error"                   // No undefined JSX elements
}
```

### Warning Rules

These rules generate warnings but won't block commits:

```javascript
{
  "@typescript-eslint/no-unused-vars": ["warn", {
    argsIgnorePattern: "^_",        // Allow unused params prefixed with _
    varsIgnorePattern: "^_",         // Allow unused vars prefixed with _
    caughtErrorsIgnorePattern: "^_"  // Allow unused errors prefixed with _
  }],
  "no-console": ["warn", { allow: ["warn", "error"] }],  // Allow console.warn/error
  "react-hooks/exhaustive-deps": "warn",                  // Check Hook dependencies
  "prefer-const": "warn"                                  // Prefer const over let
}
```

### Disabled Rules

Rules that are too strict for this project:

```javascript
{
  "@typescript-eslint/no-empty-function": "off",  // Allow empty functions (for callbacks)
  "@typescript-eslint/ban-ts-comment": "warn"     // Allow @ts-ignore with warning
}
```

---

## Code Formatting

### Prettier Configuration

Prettier handles automatic code formatting. Key settings:

- **Single Quotes**: Use single quotes for strings (except JSX)
- **Semicolons**: Always use semicolons
- **Line Width**: 120 characters maximum
- **Trailing Commas**: ES5 style (no trailing commas in function parameters)
- **Arrow Parens**: Avoid parentheses when possible (`x => x` instead of `(x) => x`)

### Example

```typescript
// ✅ GOOD - Follows Prettier formatting
const handleClick = () => {
  console.warn('Button clicked');
  fetchData().catch(_error => {
    // Error handled
  });
};

// ❌ BAD - Will be auto-formatted
const handleClick = () =>
{
  console.log("Button clicked")
  fetchData().catch((error) => {
    // Error not used
  })
}
```

---

## Common Linting Errors

### 1. Unused Variables

**Error**: `'variable' is defined but never used`

**Solution**:
```typescript
// ❌ BAD
.catch(error => {
  // error unused
})

// ✅ GOOD - Use the variable
.catch(error => {
  console.warn('Request failed:', error);
})

// ✅ ALSO GOOD - Prefix with underscore
.catch(_error => {
  // Clearly unused
})
```

### 2. Explicit Any Type

**Error**: `Unexpected any. Specify a different type`

**Solution**:
```typescript
// ❌ BAD
const process = (data: any) => data.property;

// ✅ GOOD - Use proper type
const process = (data: { property: string }) => data.property;

// ✅ ALSO GOOD - Use interface
interface ProcessData {
  property: string;
}
const process = (data: ProcessData) => data.property;
```

### 3. React Hooks Rules

**Error**: `React Hook useEffect has a missing dependency`

**Solution**:
```typescript
// ❌ BAD
useEffect(() => {
  fetchData(userId);
}, []); // userId missing from dependencies

// ✅ GOOD - Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ✅ ALTERNATIVE - Use callback ref if intentional
const fetchDataRef = useRef(fetchData);
useEffect(() => {
  fetchDataRef.current(userId);
}, []); // Safe if fetchData doesn't change
```

### 4. Console Statements

**Error**: `Unexpected console statement`

**Solution**:
```typescript
// ❌ BAD
console.log('Debug message');

// ✅ GOOD - Use allowed console methods
console.warn('Warning message');
console.error('Error message');

// ✅ BEST - Use proper logging
logger.debug('Debug message');
```

### 5. Undefined JSX

**Error**: `'Component' is not defined`

**Solution**:
```typescript
// ❌ BAD - Missing import
<MyComponent />

// ✅ GOOD - Import component
import { MyComponent } from '@/components/MyComponent';
<MyComponent />
```

---

## Running Linters

### Manual Execution

```bash
# Lint all files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Type check
npm run typecheck
```

### CI/CD Pipeline

All linting checks run automatically in the CI/CD pipeline:

1. ESLint validation (must have 0 errors)
2. Prettier formatting check
3. TypeScript type checking
4. Jest unit tests

---

## IDE Setup

### VS Code

Install recommended extensions:

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **Prettier** (`esbenp.prettier-vscode`)
3. **EditorConfig** (`editorconfig.editorconfig`)

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### WebStorm / IntelliJ IDEA

1. Enable **Prettier** in Settings → Languages & Frameworks → JavaScript → Prettier
2. Enable **ESLint** in Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
3. Enable **EditorConfig** (built-in support)

---

## Pre-commit Hooks

### Optional Husky Setup

To automatically validate code before commits:

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky init

# Create pre-commit hook
echo 'npm run lint && npm run typecheck' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Manual Pre-commit Checklist

Before committing code:

- [ ] `npm run lint` shows **0 errors** (warnings OK)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Code is formatted with Prettier
- [ ] No debugging code (console.log, debugger, etc.)

---

## Style Decisions

### Why Single Quotes?

Single quotes are preferred for consistency with TypeScript and modern JavaScript conventions. JSX attributes use double quotes to distinguish HTML-like syntax.

### Why 120 Character Line Length?

Modern displays support wider code views, and 120 characters balances readability with reducing unnecessary line breaks.

### Why Underscore Prefix for Unused Variables?

The `_` prefix clearly communicates intentionally unused parameters, reducing noise from linting warnings while maintaining code clarity.

### Why Warn Instead of Error for Some Rules?

Some rules (like `prefer-const`) are stylistic preferences that don't affect functionality. Warning instead of error allows gradual improvement without blocking development.

---

## Maintaining Code Quality

### Regular Audits

Run comprehensive checks regularly:

```bash
# Full validation suite
npm run lint && npm run typecheck && npm test

# Check for security vulnerabilities
npm audit

# Update dependencies
npm outdated
npm update
```

### Continuous Improvement

- Review warning trends monthly
- Update linting rules as team consensus evolves
- Keep dependencies up to date
- Document exceptions and special cases

---

## Questions and Support

For questions about code style or linting issues:

1. Check this documentation first
2. Review ESLint error messages (they often include fix suggestions)
3. Consult the team's code review guidelines
4. Ask in the team's development channel

---

## Appendix: Complete ESLint Configuration

```javascript
// eslint.config.mjs
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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "test-results/**",
      "coverage/**",
      "next-env.d.ts",
      "public/sw.js"
    ],
  },
  {
    rules: {
      // Relaxed warnings that don't affect functionality
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "jsx-a11y/alt-text": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",

      // Keep critical rules as errors
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react/jsx-no-undef": "error"
    },
  },
];

export default eslintConfig;
```

---

**Last Updated**: November 2025
**Version**: 1.0.0
