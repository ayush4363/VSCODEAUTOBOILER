# Changelog

All notable changes to the **Auto Boilerplate** extension will be documented in this file.

## [1.0.2] - 2026-10-30

### Enhanced
- Enhanced HTML boilerplate to dynamically set `<title>` to match the file name (e.g. `index`, `contact`, etc.).
- Added `<link rel="stylesheet" href="style.css">` inside `<head>`.
- Added `<script src="script.js"></script>` inside `<body>`.
- Optimized cursor placement inside `<body>` before the script tag.

## [1.0.1] - 2026-10-29

### Fixed
- Replaced `#include <bits/stdc++.h>` with standard `#include <iostream>` in the C++ template to eliminate the `'bits/stdc++.h' file not found` red squiggly error on macOS Clang/Xcode environments.

## [1.0.0] - Initial Release

### Features
- **Automatic Template Insertion**: Automatically inserts clean, idiomatic boilerplate into newly created and opened empty files.
- **12 Supported Languages**:
  - C (`.c`)
  - C++ (`.cpp`, `.cc`, `.cxx`, `.hpp`, `.h`, `.hh`, `.hxx`)
  - Java (`.java`) with dynamic class name derivation and identifier validation
  - Python (`.py`) with `main()` and `__name__ == '__main__'` guard
  - JavaScript CommonJS (`.js`, `.cjs`) and ES Module (`.mjs`)
  - TypeScript (`.ts`, `.cts`, `.mts`)
  - HTML5 (`.html`, `.htm`) with responsive viewport
  - CSS (`.css`) with `:root` variables and modern reset baseline
  - Kotlin (`.kt`, `.kts`)
  - Go (`.go`)
  - Rust (`.rs`)
  - C# (`.cs`) with safe class name derivation
- **Automatic Cursor Positioning**: Automatically computes and places the editor cursor inside the primary editable region.
- **Strict Safety**: Checks for 0-byte file length, prevents overwriting existing text, and implements locking against concurrent duplicate events.
- **Configurable Settings**:
  - `autoBoilerplate.enabled`
  - `autoBoilerplate.onOpenEmptyFiles`
  - `autoBoilerplate.showNotification`
- **Manual Command**: Optional command palette action `Auto Boilerplate: Insert Template into Current File`.
