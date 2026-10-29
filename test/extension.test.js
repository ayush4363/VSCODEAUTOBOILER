/**
 * Auto Boilerplate Controller Integration & Unit Tests
 *
 * Validates:
 * - Empty-file insertion
 * - Non-empty file protection (never overwrite)
 * - Settings behavior (enabled, onOpenEmptyFiles, showNotification)
 * - Concurrency & duplicate event handling
 * - Cursor placement and pending cursor updates
 * - Virtual/untitled/read-only documents handling
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { AutoBoilerplateController } = require('../extension');

/**
 * Creates a mock VS Code environment for testing controller logic
 */
function createMockVsCode(initialSettings = {}) {
  const settings = {
    enabled: true,
    onOpenEmptyFiles: true,
    showNotification: false,
    ...initialSettings
  };

  const appliedEdits = [];
  const infoMessages = [];
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
      this.operations.push({ type: 'insert', uri, position, text });
    }
  }

  const mockVsCode = {
    Position: MockPosition,
    Range: MockRange,
    Selection: MockSelection,
    WorkspaceEdit: MockWorkspaceEdit,
    TextEditorRevealType: { InCenterIfOutsideViewport: 1 },

    workspace: {
      getConfiguration: (section) => {
        return {
          get: (key, defaultValue) => {
            if (key in settings) {
              return settings[key];
            }
            return defaultValue;
          }
        };
      },
      applyEdit: async (edit) => {
        appliedEdits.push(edit);
        // Mutate mock document if found
        for (const op of edit.operations) {
          const docUriStr = op.uri.toString();
          for (const ed of visibleEditors) {
            if (ed.document.uri.toString() === docUriStr) {
              ed.document._text += op.text;
            }
          }
        }
        return true;
      }
    },

    window: {
      visibleTextEditors: visibleEditors,
      showInformationMessage: async (msg) => {
        infoMessages.push(msg);
      }
    },

    // Test access helpers
    _appliedEdits: appliedEdits,
    _infoMessages: infoMessages,
    _visibleEditors: visibleEditors,
    _setSetting: (key, val) => {
      settings[key] = val;
    }
  };

  return mockVsCode;
}

/**
 * Creates a mock TextDocument
 */
function createMockDocument({
  fsPath = '/workspace/main.cpp',
  scheme = 'file',
  isUntitled = false,
  isClosed = false,
  text = ''
} = {}) {
  return {
    uri: {
      scheme,
      fsPath,
      toString: () => `${scheme}://${fsPath}`
    },
    isUntitled,
    isClosed,
    _text: text,
    getText: function () {
      return this._text;
    }
  };
}

/**
 * Creates a mock TextEditor
 */
function createMockEditor(doc) {
  return {
    document: doc,
    selection: null,
    revealedRange: null,
    revealRange: function (range) {
      this.revealedRange = range;
    }
  };
}

test('Empty file receives appropriate boilerplate template', async () => {
  const mockVsCode = createMockVsCode();
  const controller = new AutoBoilerplateController(mockVsCode);

  const doc = createMockDocument({ fsPath: '/workspace/main.cpp', text: '' });
  const editor = createMockEditor(doc);
  mockVsCode._visibleEditors.push(editor);

  const result = await controller.processDocument(doc, 'test');
  assert.strictEqual(result, true, 'Should successfully process empty .cpp file');
  assert.strictEqual(mockVsCode._appliedEdits.length, 1);
  const editOp = mockVsCode._appliedEdits[0].operations[0];
  assert.ok(editOp.text.includes('#include <iostream>'));
  assert.strictEqual(editor.selection.active.line, 4);
  assert.strictEqual(editor.selection.active.character, 4);
});

test('Non-empty file is strictly protected and never modified', async () => {
  const mockVsCode = createMockVsCode();
  const controller = new AutoBoilerplateController(mockVsCode);

  const existingCode = 'int x = 42;\n';
  const doc = createMockDocument({ fsPath: '/workspace/main.cpp', text: existingCode });
  const editor = createMockEditor(doc);
  mockVsCode._visibleEditors.push(editor);

  const result = await controller.processDocument(doc, 'test');
  assert.strictEqual(result, false, 'Should reject non-empty file');
  assert.strictEqual(mockVsCode._appliedEdits.length, 0, 'No edit should be applied');
  assert.strictEqual(doc.getText(), existingCode, 'Content should remain unchanged');
});

test('Rechecks emptiness immediately before applying edit (concurrency protection)', async () => {
  const mockVsCode = createMockVsCode();
  const controller = new AutoBoilerplateController(mockVsCode);

  const doc = createMockDocument({ fsPath: '/workspace/main.c', text: '' });
  // Simulate race: document becomes non-empty right before edit
  const evalResult = controller.evaluateDocument(doc, { enabled: true, onOpenEmptyFiles: true });
  assert.strictEqual(evalResult.shouldInsert, true);

  // User types right between eval and edit
  doc._text = '#include <stdio.h>';
  const result = await controller.processDocument(doc, 'test');
  assert.strictEqual(result, false, 'Should abort if text was added');
  assert.strictEqual(mockVsCode._appliedEdits.length, 0);
});

test('Settings: autoBoilerplate.enabled = false disables insertion', async () => {
  const mockVsCode = createMockVsCode({ enabled: false });
  const controller = new AutoBoilerplateController(mockVsCode);

  const doc = createMockDocument({ fsPath: '/workspace/main.py', text: '' });
  const result = await controller.processDocument(doc, 'test');
  assert.strictEqual(result, false, 'Should not insert when disabled');
  assert.strictEqual(mockVsCode._appliedEdits.length, 0);
});

test('Settings: onOpenEmptyFiles = false skips previously existing empty files', async () => {
  const mockVsCode = createMockVsCode({ onOpenEmptyFiles: false });
  const controller = new AutoBoilerplateController(mockVsCode);

  // File opened from disk without creation event
  const doc = createMockDocument({ fsPath: '/workspace/existing.rs', text: '' });
  const result = await controller.processDocument(doc, 'test');
  assert.strictEqual(result, false, 'Should skip existing empty file when onOpenEmptyFiles is false');
  assert.strictEqual(mockVsCode._appliedEdits.length, 0);
});

test('Settings: onOpenEmptyFiles = false still allows newly created files', async () => {
  const mockVsCode = createMockVsCode({ onOpenEmptyFiles: false });
  const controller = new AutoBoilerplateController(mockVsCode);

  const doc = createMockDocument({ fsPath: '/workspace/newly_created.rs', text: '' });
  const editor = createMockEditor(doc);
  mockVsCode._visibleEditors.push(editor);

  // Simulate file creation event
  controller.handleFilesCreated({ files: [doc.uri] });

  // Now process opened document
  const result = await controller.processDocument(doc, 'test');
  assert.strictEqual(result, true, 'Should allow newly created file even if onOpenEmptyFiles is false');
  assert.strictEqual(mockVsCode._appliedEdits.length, 1);
  assert.ok(mockVsCode._appliedEdits[0].operations[0].text.includes('println!("Hello, world!");'));
});

test('Settings: showNotification displays message only when enabled', async () => {
  // Test with notification disabled (default)
  const mockVsCode1 = createMockVsCode({ showNotification: false });
  const controller1 = new AutoBoilerplateController(mockVsCode1);
  const doc1 = createMockDocument({ fsPath: '/workspace/app.js', text: '' });
  await controller1.processDocument(doc1, 'test');
  assert.strictEqual(mockVsCode1._infoMessages.length, 0, 'No notification when showNotification is false');

  // Test with notification enabled
  const mockVsCode2 = createMockVsCode({ showNotification: true });
  const controller2 = new AutoBoilerplateController(mockVsCode2);
  const doc2 = createMockDocument({ fsPath: '/workspace/app.js', text: '' });
  await controller2.processDocument(doc2, 'test');
  assert.strictEqual(mockVsCode2._infoMessages.length, 1, 'Notification displayed when showNotification is true');
  assert.ok(mockVsCode2._infoMessages[0].includes('Auto Boilerplate: Inserted JavaScript boilerplate into app.js'));
});

test('Ignores unsupported URI schemes and untitled documents', async () => {
  const mockVsCode = createMockVsCode();
  const controller = new AutoBoilerplateController(mockVsCode);

  // Untitled document (e.g. unsaved buffer)
  const untitledDoc = createMockDocument({ fsPath: 'Untitled-1', isUntitled: true });
  assert.strictEqual(await controller.processDocument(untitledDoc, 'test'), false);

  // Git / output / non-file virtual documents
  const gitDoc = createMockDocument({ fsPath: '/workspace/main.cpp', scheme: 'git' });
  assert.strictEqual(await controller.processDocument(gitDoc, 'test'), false);

  // Closed document
  const closedDoc = createMockDocument({ fsPath: '/workspace/main.cpp', isClosed: true });
  assert.strictEqual(await controller.processDocument(closedDoc, 'test'), false);

  assert.strictEqual(mockVsCode._appliedEdits.length, 0);
});

test('Concurrent duplicate events are safely locked and deduplicated', async () => {
  const mockVsCode = createMockVsCode();
  const controller = new AutoBoilerplateController(mockVsCode);

  const doc = createMockDocument({ fsPath: '/workspace/concurrent.go', text: '' });
  const editor = createMockEditor(doc);
  mockVsCode._visibleEditors.push(editor);

  // Fire two concurrent calls
  const [res1, res2] = await Promise.all([
    controller.processDocument(doc, 'event1'),
    controller.processDocument(doc, 'event2')
  ]);

  // One should succeed, one should be skipped
  assert.strictEqual(res1 || res2, true);
  assert.strictEqual(res1 && res2, false, 'Only one concurrent event should execute');
  assert.strictEqual(mockVsCode._appliedEdits.length, 1, 'Only one edit should be applied');
});

test('Pending cursor positioning applies when editor becomes active', async () => {
  const mockVsCode = createMockVsCode();
  const controller = new AutoBoilerplateController(mockVsCode);

  const doc = createMockDocument({ fsPath: '/workspace/delayed.kt', text: '' });
  // No editor is currently visible when document is processed
  const result = await controller.processDocument(doc, 'backgroundOpen');
  assert.strictEqual(result, true);
  assert.strictEqual(mockVsCode._appliedEdits.length, 1);

  // Now the editor becomes active later
  const editor = createMockEditor(doc);
  await controller.handleActiveEditorChanged(editor);
  assert.ok(editor.selection, 'Cursor should be positioned when editor becomes active');
  assert.strictEqual(editor.selection.active.line, 1);
  assert.strictEqual(editor.selection.active.character, 4);
});
