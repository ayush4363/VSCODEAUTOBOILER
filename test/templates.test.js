/**
 * Unit tests for Auto Boilerplate template registry, class name sanitization,
 * cursor coordinates, and unsupported extensions.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isSupportedExtension,
  isValidJavaIdentifier,
  isValidCSharpIdentifier,
  deriveJavaClassName,
  deriveCSharpClassName,
  resolveTemplate,
  getTemplateForFile,
  EXTENSION_MAP
} = require('../templates');

test('Extension-to-template mapping covers all 12 required languages', () => {
  const expectedMappings = [
    // 1. C
    { file: 'main.c', lang: 'C' },
    // 2. C++
    { file: 'main.cpp', lang: 'C++' },
    { file: 'code.cc', lang: 'C++' },
    { file: 'code.cxx', lang: 'C++' },
    { file: 'header.hpp', lang: 'C++' },
    { file: 'header.h', lang: 'C++' },
    { file: 'header.hh', lang: 'C++' },
    { file: 'header.hxx', lang: 'C++' },
    // 3. Java
    { file: 'Main.java', lang: 'Java' },
    // 4. Python
    { file: 'script.py', lang: 'Python' },
    // 5. JavaScript
    { file: 'app.js', lang: 'JavaScript' },
    { file: 'server.cjs', lang: 'JavaScript' },
    { file: 'module.mjs', lang: 'JavaScript (ESM)' },
    // 6. TypeScript
    { file: 'index.ts', lang: 'TypeScript' },
    { file: 'common.cts', lang: 'TypeScript' },
    { file: 'esm.mts', lang: 'TypeScript' },
    // 7. HTML
    { file: 'index.html', lang: 'HTML' },
    { file: 'index.htm', lang: 'HTML' },
    // 8. CSS
    { file: 'style.css', lang: 'CSS' },
    // 9. Kotlin
    { file: 'Main.kt', lang: 'Kotlin' },
    { file: 'script.kts', lang: 'Kotlin' },
    // 10. Go
    { file: 'main.go', lang: 'Go' },
    // 11. Rust
    { file: 'main.rs', lang: 'Rust' },
    // 12. C#
    { file: 'Program.cs', lang: 'C#' }
  ];

  for (const { file, lang } of expectedMappings) {
    assert.strictEqual(isSupportedExtension(file), true, `${file} should be supported`);
    const template = getTemplateForFile(file);
    assert.ok(template, `Template for ${file} should exist`);
    assert.strictEqual(template.language, lang, `Language for ${file} should be ${lang}`);
    assert.ok(template.content.length > 0, `Template content for ${file} should not be empty`);
    assert.ok(template.cursor.line >= 0, `Cursor line for ${file} should be >= 0`);
    assert.ok(template.cursor.character >= 0, `Cursor character for ${file} should be >= 0`);
  }
});

test('Case-insensitive extension matching', () => {
  assert.strictEqual(isSupportedExtension('MAIN.CPP'), true);
  const cpp = getTemplateForFile('MAIN.CPP');
  assert.strictEqual(cpp.language, 'C++');

  assert.strictEqual(isSupportedExtension('App.JS'), true);
  const js = getTemplateForFile('App.JS');
  assert.strictEqual(js.language, 'JavaScript');
});

test('Unsupported extensions return null / false', () => {
  const unsupported = [
    'README.md',
    'package.json',
    'data.csv',
    'notes.txt',
    '.gitignore',
    'image.png',
    'archive.tar.gz',
    'script.sh',
    'no_extension',
    '',
    null,
    undefined
  ];

  for (const file of unsupported) {
    assert.strictEqual(isSupportedExtension(file), false, `${file} should not be supported`);
    assert.strictEqual(getTemplateForFile(file), null, `${file} should return null template`);
  }
});

test('Java class name generation and validation', () => {
  // Standard valid identifiers
  assert.strictEqual(isValidJavaIdentifier('Main'), true);
  assert.strictEqual(isValidJavaIdentifier('Solution'), true);
  assert.strictEqual(isValidJavaIdentifier('BinarySearchTree'), true);
  assert.strictEqual(isValidJavaIdentifier('_internal'), true);
  assert.strictEqual(isValidJavaIdentifier('$Helper'), true);

  // Reserved keywords
  assert.strictEqual(isValidJavaIdentifier('class'), false);
  assert.strictEqual(isValidJavaIdentifier('public'), false);
  assert.strictEqual(isValidJavaIdentifier('int'), false);
  assert.strictEqual(isValidJavaIdentifier('null'), false);

  // Invalid identifiers (spaces, dashes, leading digits, punctuation)
  assert.strictEqual(isValidJavaIdentifier('my-class'), false);
  assert.strictEqual(isValidJavaIdentifier('my class'), false);
  assert.strictEqual(isValidJavaIdentifier('123Main'), false);
  assert.strictEqual(isValidJavaIdentifier('Main!'), false);

  // Derivation results
  const res1 = deriveJavaClassName('Main.java');
  assert.strictEqual(res1.className, 'Main');
  assert.strictEqual(res1.comment, null);

  const res2 = deriveJavaClassName('Solution.java');
  assert.strictEqual(res2.className, 'Solution');
  assert.strictEqual(res2.comment, null);

  const res3 = deriveJavaClassName('my-app.java');
  assert.strictEqual(res3.className, 'Main');
  assert.ok(res3.comment.includes('not a valid Java identifier'));

  const res4 = deriveJavaClassName('class.java');
  assert.strictEqual(res4.className, 'Main');
  assert.ok(res4.comment.includes('not a valid Java identifier'));

  const res5 = deriveJavaClassName('App With Spaces.java');
  assert.strictEqual(res5.className, 'Main');
  assert.ok(res5.comment.includes('not a valid Java identifier'));

  // Template content for Main.java
  const javaMain = getTemplateForFile('Main.java');
  assert.ok(javaMain.content.includes('public class Main {'));

  // Template content for Solution.java
  const javaSolution = getTemplateForFile('Solution.java');
  assert.ok(javaSolution.content.includes('public class Solution {'));
});

test('C# class name generation and validation', () => {
  assert.strictEqual(isValidCSharpIdentifier('Program'), true);
  assert.strictEqual(isValidCSharpIdentifier('Calculator'), true);
  assert.strictEqual(isValidCSharpIdentifier('_Service'), true);

  // Keywords and invalid names
  assert.strictEqual(isValidCSharpIdentifier('class'), false);
  assert.strictEqual(isValidCSharpIdentifier('namespace'), false);
  assert.strictEqual(isValidCSharpIdentifier('123Program'), false);
  assert.strictEqual(isValidCSharpIdentifier('my-service'), false);

  assert.strictEqual(deriveCSharpClassName('Program.cs'), 'Program');
  assert.strictEqual(deriveCSharpClassName('Calculator.cs'), 'Calculator');
  assert.strictEqual(deriveCSharpClassName('my-service.cs'), 'Program');
  assert.strictEqual(deriveCSharpClassName('class.cs'), 'Program');

  const csProg = getTemplateForFile('Calculator.cs');
  assert.ok(csProg.content.includes('class Calculator {'));
});

test('Cursor placement coordinates verify exact editable location', () => {
  // C
  const c = getTemplateForFile('main.c');
  const cLines = c.content.split('\n');
  assert.strictEqual(c.cursor.line, 3);
  assert.strictEqual(c.cursor.character, 4);
  assert.strictEqual(cLines[2], 'int main(void) {');
  assert.strictEqual(cLines[3], '    ');
  assert.strictEqual(cLines[4], '    return 0;');

  // C++
  const cpp = getTemplateForFile('main.cpp');
  const cppLines = cpp.content.split('\n');
  assert.strictEqual(cpp.cursor.line, 4);
  assert.strictEqual(cpp.cursor.character, 4);
  assert.strictEqual(cppLines[3], 'int main() {');
  assert.strictEqual(cppLines[4], '    ');
  assert.strictEqual(cppLines[5], '    return 0;');

  // Python: cursor on the pass line
  const py = getTemplateForFile('script.py');
  const pyLines = py.content.split('\n');
  assert.strictEqual(py.cursor.line, 1);
  assert.strictEqual(py.cursor.character, 4);
  assert.strictEqual(pyLines[1], '    pass');

  // Java
  const java = getTemplateForFile('Main.java');
  const javaLines = java.content.split('\n');
  assert.strictEqual(java.cursor.line, 2);
  assert.strictEqual(java.cursor.character, 8);
  assert.strictEqual(javaLines[1], '    public static void main(String[] args) {');
  assert.strictEqual(javaLines[2], '        ');

  // JavaScript CommonJS
  const js = getTemplateForFile('app.js');
  const jsLines = js.content.split('\n');
  assert.strictEqual(js.cursor.line, 1);
  assert.strictEqual(js.cursor.character, 4);
  assert.strictEqual(jsLines[0], 'function main() {');
  assert.ok(js.content.includes('if (require.main === module)'));

  // JavaScript ESM (.mjs)
  const mjs = getTemplateForFile('app.mjs');
  const mjsLines = mjs.content.split('\n');
  assert.strictEqual(mjs.cursor.line, 1);
  assert.strictEqual(mjs.cursor.character, 4);
  assert.strictEqual(mjsLines[0], 'export function main() {');
  assert.strictEqual(mjs.content.includes('require.main'), false);

  // TypeScript
  const ts = getTemplateForFile('app.ts');
  const tsLines = ts.content.split('\n');
  assert.strictEqual(ts.cursor.line, 1);
  assert.strictEqual(ts.cursor.character, 4);
  assert.strictEqual(tsLines[0], 'function main(): void {');

  // HTML
  const html = getTemplateForFile('index.html');
  const htmlLines = html.content.split('\n');
  assert.strictEqual(html.cursor.line, 8);
  assert.strictEqual(html.cursor.character, 4);
  assert.strictEqual(htmlLines[7], '<body>');
  assert.strictEqual(htmlLines[8], '    ');
  assert.strictEqual(htmlLines[9], '</body>');

  // CSS
  const css = getTemplateForFile('style.css');
  const cssLines = css.content.split('\n');
  assert.strictEqual(css.cursor.line, 21);
  assert.strictEqual(css.cursor.character, 4);
  assert.strictEqual(cssLines[15], 'body {');
  assert.strictEqual(cssLines[21], '    ');
  assert.strictEqual(cssLines[22], '}');

  // Kotlin
  const kt = getTemplateForFile('main.kt');
  const ktLines = kt.content.split('\n');
  assert.strictEqual(kt.cursor.line, 1);
  assert.strictEqual(kt.cursor.character, 4);
  assert.strictEqual(ktLines[0], 'fun main() {');

  // Go
  const go = getTemplateForFile('main.go');
  const goLines = go.content.split('\n');
  assert.strictEqual(go.cursor.line, 5);
  assert.strictEqual(go.cursor.character, 4);
  assert.strictEqual(goLines[4], 'func main() {');
  assert.strictEqual(goLines[5], '    fmt.Println("Hello, World!")');

  // Rust
  const rs = getTemplateForFile('main.rs');
  const rsLines = rs.content.split('\n');
  assert.strictEqual(rs.cursor.line, 1);
  assert.strictEqual(rs.cursor.character, 4);
  assert.strictEqual(rsLines[0], 'fn main() {');
  assert.strictEqual(rsLines[1], '    println!("Hello, world!");');

  // C#
  const cs = getTemplateForFile('Program.cs');
  const csLines = cs.content.split('\n');
  assert.strictEqual(cs.cursor.line, 4);
  assert.strictEqual(cs.cursor.character, 8);
  assert.strictEqual(csLines[3], '    static void Main(string[] args) {');
  assert.strictEqual(csLines[4], '        ');
});

test('Handling filenames with spaces, punctuation, and unusual characters', () => {
  const weirdCpp = getTemplateForFile('My Complex (Test) [File] & More.cpp');
  assert.ok(weirdCpp);
  assert.strictEqual(weirdCpp.language, 'C++');

  const weirdPy = getTemplateForFile('script v1.2-alpha.py');
  assert.ok(weirdPy);
  assert.strictEqual(weirdPy.language, 'Python');

  const weirdJs = getTemplateForFile('path/to/my module #1.js');
  assert.ok(weirdJs);
  assert.strictEqual(weirdJs.language, 'JavaScript');
});
