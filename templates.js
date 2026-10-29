/**
 * Auto Boilerplate - Template Registry & Generators
 *
 * Provides templates and cursor placement calculations for supported languages.
 */

const path = require('path');

// Marker used internally to compute 0-indexed line and character offset
const CURSOR_MARKER = '|CURSOR|';

// Java reserved keywords and literals
const JAVA_RESERVED_WORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null',
  'record', 'sealed', 'non-sealed', 'permits', 'yield'
]);

// C# reserved keywords
const CSHARP_RESERVED_WORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
  'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
  'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
  'record', 'init', 'nint', 'nuint', 'file', 'required', 'scoped'
]);

/**
 * Validates whether a string is a standard valid Java identifier
 * @param {string} name
 * @returns {boolean}
 */
function isValidJavaIdentifier(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) && !JAVA_RESERVED_WORDS.has(name);
}

/**
 * Validates whether a string is a standard valid C# identifier
 * @param {string} name
 * @returns {boolean}
 */
function isValidCSharpIdentifier(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && !CSHARP_RESERVED_WORDS.has(name);
}

/**
 * Derives a valid Java class name and optional explanation comment from a filename.
 * In standard Java, a public class must match the filename. If the filename is not
 * a valid identifier (e.g. contains spaces, dashes, or is a reserved keyword),
 * it safely falls back to 'Main' with an explanatory comment.
 *
 * @param {string} filename
 * @returns {{ className: string, comment: string | null }}
 */
function deriveJavaClassName(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  if (isValidJavaIdentifier(baseName)) {
    return { className: baseName, comment: null };
  }
  return {
    className: 'Main',
    comment: `// Note: "${baseName}" is not a valid Java identifier. In Java, a public class name must match its source filename.`
  };
}

/**
 * Derives a valid C# class name from a filename, falling back to 'Program'.
 *
 * @param {string} filename
 * @returns {string}
 */
function deriveCSharpClassName(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  if (isValidCSharpIdentifier(baseName)) {
    return baseName;
  }
  return 'Program';
}

/**
 * Resolves template string with CURSOR_MARKER into final text and line/character cursor position.
 *
 * @param {string} rawTemplate
 * @returns {{ content: string, cursor: { line: number, character: number } }}
 */
function resolveTemplate(rawTemplate) {
  const markerIndex = rawTemplate.indexOf(CURSOR_MARKER);
  if (markerIndex === -1) {
    return {
      content: rawTemplate,
      cursor: { line: 0, character: 0 }
    };
  }

  const content = rawTemplate.replace(CURSOR_MARKER, '');
  const prefix = rawTemplate.substring(0, markerIndex);
  const lines = prefix.split('\n');
  const line = lines.length - 1;
  const character = lines[line].length;

  return {
    content,
    cursor: { line, character }
  };
}

// Language definitions and raw templates with cursor placement markers
const TEMPLATES = {
  c: {
    language: 'C',
    generate: () =>
      `#include <stdio.h>\n\nint main(void) {\n    ${CURSOR_MARKER}\n    return 0;\n}\n`
  },
  cpp: {
    language: 'C++',
    generate: () =>
      `#include <iostream>\nusing namespace std;\n\nint main() {\n    ${CURSOR_MARKER}\n    return 0;\n}\n`
  },
  java: {
    language: 'Java',
    generate: (filename) => {
      const { className, comment } = deriveJavaClassName(filename || 'Main.java');
      if (comment) {
        return `${comment}\npublic class ${className} {\n    public static void main(String[] args) {\n        ${CURSOR_MARKER}\n    }\n}\n`;
      }
      return `public class ${className} {\n    public static void main(String[] args) {\n        ${CURSOR_MARKER}\n    }\n}\n`;
    }
  },
  python: {
    language: 'Python',
    generate: () =>
      `def main():\n    ${CURSOR_MARKER}pass\n\n\nif __name__ == "__main__":\n    main()\n`
  },
  javascript: {
    language: 'JavaScript',
    generate: () =>
      `function main() {\n    ${CURSOR_MARKER}\n}\n\nif (require.main === module) {\n    main();\n}\n`
  },
  javascriptEsm: {
    language: 'JavaScript (ESM)',
    generate: () =>
      `export function main() {\n    ${CURSOR_MARKER}\n}\n\nmain();\n`
  },
  typescript: {
    language: 'TypeScript',
    generate: () =>
      `function main(): void {\n    ${CURSOR_MARKER}\n}\n\nmain();\n`
  },
  html: {
    language: 'HTML',
    generate: (filename) => {
      const title = (filename ? path.basename(filename, path.extname(filename)) : '') || 'Document';
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${title}</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    ${CURSOR_MARKER}\n    <script src="script.js"></script>\n</body>\n</html>\n`;
    }
  },
  css: {
    language: 'CSS',
    generate: () =>
      `:root {\n    --primary-color: #007acc;\n    --background-color: #ffffff;\n    --text-color: #333333;\n    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n}\n\n*,\n*::before,\n*::after {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n}\n\nbody {\n    font-family: var(--font-family);\n    background-color: var(--background-color);\n    color: var(--text-color);\n    line-height: 1.6;\n    min-height: 100vh;\n    ${CURSOR_MARKER}\n}\n`
  },
  kotlin: {
    language: 'Kotlin',
    generate: () =>
      `fun main() {\n    ${CURSOR_MARKER}\n}\n`
  },
  go: {
    language: 'Go',
    generate: () =>
      `package main\n\nimport "fmt"\n\nfunc main() {\n    ${CURSOR_MARKER}fmt.Println("Hello, World!")\n}\n`
  },
  rust: {
    language: 'Rust',
    generate: () =>
      `fn main() {\n    ${CURSOR_MARKER}println!("Hello, world!");\n}\n`
  },
  csharp: {
    language: 'C#',
    generate: (filename) => {
      const className = deriveCSharpClassName(filename || 'Program.cs');
      return `using System;\n\nclass ${className} {\n    static void Main(string[] args) {\n        ${CURSOR_MARKER}\n    }\n}\n`;
    }
  }
};

/**
 * Extension to template key registry.
 * Maps all supported file extensions (lowercase) to the appropriate template key.
 */
const EXTENSION_MAP = {
  // C
  '.c': 'c',

  // C++ (source and headers)
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.h': 'cpp',
  '.hh': 'cpp',
  '.hxx': 'cpp',

  // Java
  '.java': 'java',

  // Python
  '.py': 'python',

  // JavaScript
  '.js': 'javascript',
  '.cjs': 'javascript',
  '.mjs': 'javascriptEsm',

  // TypeScript
  '.ts': 'typescript',
  '.cts': 'typescript',
  '.mts': 'typescript',

  // HTML
  '.html': 'html',
  '.htm': 'html',

  // CSS
  '.css': 'css',

  // Kotlin
  '.kt': 'kotlin',
  '.kts': 'kotlin',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // C#
  '.cs': 'csharp'
};

/**
 * Checks if a file path has a supported extension.
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupportedExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase();
  return Object.prototype.hasOwnProperty.call(EXTENSION_MAP, ext);
}

/**
 * Retrieves the boilerplate template and cursor placement for a given file path.
 * Returns null if the file extension is not supported.
 *
 * @param {string} filePath
 * @returns {{ language: string, content: string, cursor: { line: number, character: number }, extension: string } | null}
 */
function getTemplateForFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const ext = path.extname(filePath).toLowerCase();
  const templateKey = EXTENSION_MAP[ext];
  if (!templateKey) return null;

  const templateDef = TEMPLATES[templateKey];
  if (!templateDef) return null;

  const rawTemplate = templateDef.generate(filePath);
  const resolved = resolveTemplate(rawTemplate);

  return {
    language: templateDef.language,
    content: resolved.content,
    cursor: resolved.cursor,
    extension: ext
  };
}

module.exports = {
  CURSOR_MARKER,
  TEMPLATES,
  EXTENSION_MAP,
  isSupportedExtension,
  isValidJavaIdentifier,
  isValidCSharpIdentifier,
  deriveJavaClassName,
  deriveCSharpClassName,
  resolveTemplate,
  getTemplateForFile
};
