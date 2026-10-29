/**
 * Verification Procedure Script
 *
 * Implements Section 8 Verification Procedure in a temporary workspace:
 * 1. Create a new empty file using creation events.
 * 2. Verify that the expected template appears automatically.
 * 3. Verify that the cursor is in the correct editable position.
 * 4. Save, close, and reopen the file.
 * 5. Verify that the template is not duplicated.
 * 6. Type sample code and verify that it is never overwritten.
 * 7. Test an existing empty file with onOpenEmptyFiles enabled.
 * 8. Test the same case with onOpenEmptyFiles disabled.
 * 9. Test an unsupported extension.
 * 10. Test a filename with spaces and unusual characters.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { AutoBoilerplateController } = require('../extension');
const { getTemplateForFile } = require('../templates');

/**
 * Creates a temporary workspace directory that is cleaned up after tests
 */
function createTempWorkspace() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-boilerplate-test-'));
  return {
    dir: tmpDir,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (err) {
        // ignore
      }
    }
  };
}

/**
 * Creates a mock VS Code environment operating against real filesystem files in tmpDir
 */
function createWorkspaceMockVsCode(tmpDir, settings = {}) {
  const currentSettings = {
    enabled: true,
    onOpenEmptyFiles: true,
    showNotification: false,
    ...settings
  };

  const visibleEditors = [];

  class MockPosition {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  }

  class MockRange {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  }

  class MockSelection {
    constructor(anchor, active) {
      this.anchor = anchor;
      this.active = active;
    }
  }

  class MockWorkspaceEdit {
    constructor() {
      this.operations = [];
    }
    insert(uri, position, text) {
      this.operations.push({ uri, position, text });
    }
  }

  const mock = {
    Position: MockPosition,
    Range: MockRange,
    Selection: MockSelection,
    WorkspaceEdit: MockWorkspaceEdit,
    TextEditorRevealType: { InCenterIfOutsideViewport: 1 },

    workspace: {
      getConfiguration: () => ({
        get: (key, defaultValue) => (key in currentSettings ? currentSettings[key] : defaultValue)
      }),
      applyEdit: async (edit) => {
        for (const op of edit.operations) {
          const filePath = op.uri.fsPath;
          fs.writeFileSync(filePath, op.text, 'utf-8');
        }
        return true;
      }
    },

    window: {
      visibleTextEditors: visibleEditors,
      showInformationMessage: async () => {}
    },

    setSetting: (key, value) => {
      currentSettings[key] = value;
    },

    createMockDocAndEditor: (filePath) => {
      const uri = {
        scheme: 'file',
        fsPath: filePath,
        toString: () => `file://${filePath}`
      };

      const doc = {
        uri,
        isUntitled: false,
        isClosed: false,
        getText: () => {
          if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
          }
          return '';
        }
      };

      const editor = {
        document: doc,
        selection: null,
        revealRange: () => {}
      };

      return { doc, editor };
    }
  };

  return mock;
}

test('Verification Procedure: All 12 Languages in a Temporary Workspace', async (t) => {
  const workspace = createTempWorkspace();
  const tmpDir = workspace.dir;

  const languages = [
    { name: 'C', file: 'main.c', snippet: '    printf("Hello C\\n");\n' },
    { name: 'C++', file: 'main.cpp', snippet: '    cout << "Hello C++" << endl;\n' },
    { name: 'Java', file: 'Main.java', snippet: '        System.out.println("Hello Java");\n' },
    { name: 'Python', file: 'script.py', snippet: '    print("Hello Python")\n' },
    { name: 'JavaScript', file: 'app.js', snippet: '    console.log("Hello JS");\n' },
    { name: 'TypeScript', file: 'app.ts', snippet: '    console.log("Hello TS");\n' },
    { name: 'HTML', file: 'index.html', snippet: '    <h1>Hello HTML</h1>\n' },
    { name: 'CSS', file: 'style.css', snippet: '    background-color: #000;\n' },
    { name: 'Kotlin', file: 'main.kt', snippet: '    println("Hello Kotlin")\n' },
    { name: 'Go', file: 'main.go', snippet: '    fmt.Println("Custom Go")\n' },
    { name: 'Rust', file: 'main.rs', snippet: '    println!("Custom Rust");\n' },
    { name: 'C#', file: 'Program.cs', snippet: '        Console.WriteLine("Hello C#");\n' }
  ];

  try {
    for (const lang of languages) {
      await t.test(`Language ${lang.name} (${lang.file})`, async () => {
        const mockVsCode = createWorkspaceMockVsCode(tmpDir);
        const controller = new AutoBoilerplateController(mockVsCode);
        const filePath = path.join(tmpDir, lang.file);

        // 1. Create a new empty file using Explorer event simulation
        fs.writeFileSync(filePath, '', 'utf-8');
        const { doc, editor } = mockVsCode.createMockDocAndEditor(filePath);
        mockVsCode.window.visibleTextEditors.push(editor);

        controller.handleFilesCreated({ files: [doc.uri] });

        // 2. Open document and verify expected template appears automatically
        const inserted = await controller.processDocument(doc, 'testOpen');
        assert.strictEqual(inserted, true, `${lang.name}: Template should be inserted`);

        const expectedTemplate = getTemplateForFile(filePath);
        const contentOnDisk = fs.readFileSync(filePath, 'utf-8');
        assert.strictEqual(contentOnDisk, expectedTemplate.content, `${lang.name}: Content should match template`);

        // 3. Verify cursor is in the correct editable position
        assert.ok(editor.selection, `${lang.name}: Editor selection should be defined`);
        assert.strictEqual(
          editor.selection.active.line,
          expectedTemplate.cursor.line,
          `${lang.name}: Cursor line mismatch`
        );
        assert.strictEqual(
          editor.selection.active.character,
          expectedTemplate.cursor.character,
          `${lang.name}: Cursor character mismatch`
        );

        // 4. Save, close, and reopen the file
        // (Simulate closing editor and reopening)
        mockVsCode.window.visibleTextEditors.length = 0;
        const reopen = mockVsCode.createMockDocAndEditor(filePath);
        mockVsCode.window.visibleTextEditors.push(reopen.editor);

        // 5. Verify that template is not duplicated
        const secondInsert = await controller.processDocument(reopen.doc, 'reopen');
        assert.strictEqual(secondInsert, false, `${lang.name}: Should not insert on reopen (not empty)`);
        assert.strictEqual(
          fs.readFileSync(filePath, 'utf-8'),
          expectedTemplate.content,
          `${lang.name}: Content should not be duplicated`
        );

        // 6. Type sample code and verify that it is never overwritten
        fs.appendFileSync(filePath, lang.snippet, 'utf-8');
        const contentWithUserCode = fs.readFileSync(filePath, 'utf-8');
        const thirdInsert = await controller.processDocument(reopen.doc, 'reopenWithUserCode');
        assert.strictEqual(thirdInsert, false, `${lang.name}: Must not overwrite user code`);
        assert.strictEqual(
          fs.readFileSync(filePath, 'utf-8'),
          contentWithUserCode,
          `${lang.name}: User code must be preserved`
        );
      });
    }

    // 7. Test an existing empty file with onOpenEmptyFiles enabled
    await t.test('Existing empty file with onOpenEmptyFiles enabled', async () => {
      const mockVsCode = createWorkspaceMockVsCode(tmpDir, { onOpenEmptyFiles: true });
      const controller = new AutoBoilerplateController(mockVsCode);
      const filePath = path.join(tmpDir, 'existing_empty.cpp');
      fs.writeFileSync(filePath, '', 'utf-8');

      const { doc, editor } = mockVsCode.createMockDocAndEditor(filePath);
      mockVsCode.window.visibleTextEditors.push(editor);

      const inserted = await controller.processDocument(doc, 'openExisting');
      assert.strictEqual(inserted, true, 'Should populate existing empty file when onOpenEmptyFiles=true');
      assert.ok(fs.readFileSync(filePath, 'utf-8').includes('#include <bits/stdc++.h>'));
    });

    // 8. Test an existing empty file with onOpenEmptyFiles disabled
    await t.test('Existing empty file with onOpenEmptyFiles disabled', async () => {
      const mockVsCode = createWorkspaceMockVsCode(tmpDir, { onOpenEmptyFiles: false });
      const controller = new AutoBoilerplateController(mockVsCode);
      const filePath = path.join(tmpDir, 'existing_empty_skip.cpp');
      fs.writeFileSync(filePath, '', 'utf-8');

      const { doc, editor } = mockVsCode.createMockDocAndEditor(filePath);
      mockVsCode.window.visibleTextEditors.push(editor);

      const inserted = await controller.processDocument(doc, 'openExisting');
      assert.strictEqual(inserted, false, 'Should skip existing empty file when onOpenEmptyFiles=false');
      assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), '', 'File should remain empty');
    });

    // 9. Test an unsupported extension
    await t.test('Unsupported extension is ignored', async () => {
      const mockVsCode = createWorkspaceMockVsCode(tmpDir);
      const controller = new AutoBoilerplateController(mockVsCode);
      const filePath = path.join(tmpDir, 'document.pdf');
      fs.writeFileSync(filePath, '', 'utf-8');

      const { doc, editor } = mockVsCode.createMockDocAndEditor(filePath);
      mockVsCode.window.visibleTextEditors.push(editor);

      const inserted = await controller.processDocument(doc, 'openPdf');
      assert.strictEqual(inserted, false, 'Should ignore unsupported extension');
      assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), '', 'File should remain empty');
    });

    // 10. Test a filename with spaces and unusual characters
    await t.test('Filename with spaces and unusual characters', async () => {
      const mockVsCode = createWorkspaceMockVsCode(tmpDir);
      const controller = new AutoBoilerplateController(mockVsCode);
      const filePath = path.join(tmpDir, 'My App (Special) [Test] #1.py');
      fs.writeFileSync(filePath, '', 'utf-8');

      const { doc, editor } = mockVsCode.createMockDocAndEditor(filePath);
      mockVsCode.window.visibleTextEditors.push(editor);

      const inserted = await controller.processDocument(doc, 'openSpecial');
      assert.strictEqual(inserted, true, 'Should successfully process filename with spaces and special chars');
      assert.ok(fs.readFileSync(filePath, 'utf-8').includes('def main():'));
    });

  } finally {
    workspace.cleanup();
  }
});
