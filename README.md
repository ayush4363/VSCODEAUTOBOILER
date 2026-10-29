# Auto Boilerplate for VS Code

**Auto Boilerplate** automatically detects newly created or opened empty files in VS Code and inserts clean, idiomatic boilerplate code with the cursor placed directly inside the primary editable block (e.g. inside `main()` or `<body>`).

No snippet triggers, Tab pressing, or manual commands needed—it works automatically out of the box.

---

## Supported Languages & File Extensions

| Language | Extensions | Cursor Placement | Notes |
| :--- | :--- | :--- | :--- |
| **C** | `.c` | Inside `main()` | Standard C entry point with `return 0;` |
| **C++** | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.h`, `.hh`, `.hxx` | Inside `main()` | Standard C++ entry point with `<iostream>` and `using namespace std;` |
| **Java** | `.java` | Inside `main()` | Dynamically derives `public class <Name>` matching the filename |
| **Python** | `.py` | On `pass` statement | `def main(): pass` with `__name__ == '__main__'` guard |
| **JavaScript** | `.js`, `.cjs` | Inside `main()` | Node.js / CommonJS script with `require.main === module` check |
| **JavaScript (ESM)** | `.mjs` | Inside `main()` | Modern ES module export `export function main()` |
| **TypeScript** | `.ts`, `.cts`, `.mts` | Inside `main()` | Typed entry point `function main(): void` |
| **HTML** | `.html`, `.htm` | Inside `<body>` | HTML5 boilerplate with UTF-8 and responsive viewport |
| **CSS** | `.css` | Inside `body { ... }` | CSS reset and baseline styling with `:root` variables |
| **Kotlin** | `.kt`, `.kts` | Inside `main()` | Kotlin standard entry point `fun main() { ... }` |
| **Go** | `.go` | Inside `main()` | Standard `package main` with `fmt.Println` |
| **Rust** | `.rs` | Inside `main()` | Standard `fn main() { println!(...); }` |
| **C#** | `.cs` | Inside `Main()` | `class <Name>` derived from filename (or `Program`) with `Main` |

---

## Important Language Notes

### C++ (`<iostream>`)
The C++ template includes standard `#include <iostream>` and `using namespace std;`. This is 100% compliant with standard ISO C++ and works without missing-header errors across macOS (Apple Clang/Xcode), Linux (GCC/Clang), and Windows (MSVC).

### Java Class Naming
Java requires the name of any `public class` to match its source filename exactly.
- For `Main.java`, the class generated is `public class Main`.
- For `Solution.java`, the class generated is `public class Solution`.
- If the filename is not a valid Java identifier (e.g. contains spaces like `My Project.java`, dashes like `my-app.java`, or starts with a digit), Auto Boilerplate falls back safely to `public class Main` and inserts an explanatory comment explaining the Java compiler restriction.

### C# Class Naming
The C# template derives a valid C# identifier from the filename (e.g. `Calculator.cs` generates `class Calculator`). If the filename contains invalid characters or reserved words, it falls back to `class Program`.

---

## Safety Guarantees

- **Zero Overwriting**: The extension strictly checks that the target file has a size of 0 bytes (`length === 0`). It will **never** overwrite, replace, or modify any file that contains existing text.
- **Race Condition Protection**: Concurrency locks prevent duplicate insertions when multiple VS Code events (`onDidCreateFiles`, `onDidOpenTextDocument`, `onDidChangeActiveTextEditor`) fire simultaneously for the same file.
- **Emptiness Re-check**: The file's emptiness is re-verified immediately before applying the workspace edit.
- **Virtual / Read-Only Protection**: Ignores untitled documents (`Untitled-1`), git diff buffers, output windows, and non-file schemes.
- **No Background Polling**: Uses event-driven VS Code APIs without heavy filesystem watchers or interval polling.

---

## Configuration Settings

You can customize the extension via VS Code Settings (`Cmd + ,` on macOS) by searching for `Auto Boilerplate`:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `autoBoilerplate.enabled` | `boolean` | `true` | Globally enable or disable automatic boilerplate insertion. |
| `autoBoilerplate.onOpenEmptyFiles` | `boolean` | `true` | When `true`, inserts templates into empty files whenever they are opened. When `false`, only newly created files receive boilerplate. |
| `autoBoilerplate.showNotification` | `boolean` | `false` | When `true`, displays an informational message when a template is inserted. |

---

## Manual Usage (Optional)

Although normal usage is completely automatic upon file creation or opening, you can also trigger template insertion manually:
1. Open any empty supported file.
2. Open the Command Palette (`Cmd + Shift + P`).
3. Run **Auto Boilerplate: Insert Template into Current File**.

---

## Customizing Templates

To edit or add templates:
1. Open `~/auto-boilerplate/templates.js`.
2. Locate the `TEMPLATES` object or `EXTENSION_MAP`.
3. Add or modify the template string using `${CURSOR_MARKER}` where you want the cursor placed.
4. Run tests: `npm test`.
5. Re-package and install using `npx @vscode/vsce package` and `code --install-extension auto-boilerplate-1.0.0.vsix`.

---

## Uninstallation / Disabling

To disable or uninstall:
- **Disable**: Go to Extensions (`Cmd + Shift + X`), search for `Auto Boilerplate`, and click **Disable**.
- **Uninstall**: Click the gear icon next to `Auto Boilerplate` and click **Uninstall**, or run:
  ```bash
  code --uninstall-extension Ayush.auto-boilerplate
  ```
