/**
 * Auto Boilerplate - VS Code Extension
 *
 * Automatically inserts language-specific boilerplate code into newly created
 * or opened empty files with proper cursor placement.
 */

let vscode;
try {
  vscode = require('vscode');
} catch {
  // VS Code API is injected at runtime by the extension host.
  // In unit test environments, the API is injected via dependency injection.
  vscode = null;
}
const path = require('path');
const { getTemplateForFile, isSupportedExtension } = require('./templates');

/**
 * Core controller that encapsulates the logic for template insertion,
 * event handling, concurrency protection, and cursor positioning.
 */
class AutoBoilerplateController {
  constructor(vscodeApi = vscode) {
    this.vscode = vscodeApi;
    // Tracks URIs of files created via VS Code creation events
    this.newlyCreatedUris = new Map(); // uriString -> timestamp
    // Tracks URIs currently being edited to prevent race conditions
    this.inFlightUris = new Set();
    // Tracks desired cursor positions for documents not yet focused in an editor
    this.pendingCursors = new Map(); // uriString -> { line, character }
    // Clean up created URIs older than 10 minutes to prevent memory leaks
    this.CREATED_URI_TTL_MS = 10 * 60 * 1000;
  }

  /**
   * Reads extension configuration
   * @param {vscode.Uri} [uri]
   * @returns {{ enabled: boolean, onOpenEmptyFiles: boolean, showNotification: boolean }}
   */
  getConfig(uri) {
    const config = this.vscode.workspace.getConfiguration('autoBoilerplate', uri);
    return {
      enabled: config.get('enabled', true),
      onOpenEmptyFiles: config.get('onOpenEmptyFiles', true),
      showNotification: config.get('showNotification', false)
    };
  }

  /**
   * Records a newly created file URI
   * @param {vscode.Uri} uri
   */
  recordCreatedUri(uri) {
    if (!uri || uri.scheme !== 'file') return;
    this.pruneOldUris();
    this.newlyCreatedUris.set(uri.toString(), Date.now());
  }

  /**
   * Prunes stale entries from newlyCreatedUris
   */
  pruneOldUris() {
    const now = Date.now();
    for (const [uriStr, timestamp] of this.newlyCreatedUris.entries()) {
      if (now - timestamp > this.CREATED_URI_TTL_MS) {
        this.newlyCreatedUris.delete(uriStr);
      }
    }
  }

  /**
   * Determines whether a template should be inserted into the document.
   * Pure evaluation function useful for verification and unit testing.
   *
   * @param {vscode.TextDocument} document
   * @param {{ enabled: boolean, onOpenEmptyFiles: boolean }} config
   * @returns {{ shouldInsert: boolean, reason: string, templateInfo?: any }}
   */
  evaluateDocument(document, config) {
    if (!document || !document.uri) {
      return { shouldInsert: false, reason: 'Invalid document or URI' };
    }

    // Only process real filesystem files
    if (document.uri.scheme !== 'file') {
      return { shouldInsert: false, reason: 'Unsupported URI scheme' };
    }

    // Never modify untitled documents
    if (document.isUntitled) {
      return { shouldInsert: false, reason: 'Untitled document' };
    }

    // Do not modify closed documents
    if (document.isClosed) {
      return { shouldInsert: false, reason: 'Document is closed' };
    }

    // Check if extension is enabled
    if (!config.enabled) {
      return { shouldInsert: false, reason: 'Extension disabled by configuration' };
    }

    // Check file extension
    const filePath = document.uri.fsPath;
    if (!isSupportedExtension(filePath)) {
      return { shouldInsert: false, reason: 'Unsupported file extension' };
    }

    const templateInfo = getTemplateForFile(filePath);
    if (!templateInfo) {
      return { shouldInsert: false, reason: 'No template available for extension' };
    }

    // Crucial safety check: NEVER overwrite non-empty file contents
    const text = document.getText();
    if (text.length > 0) {
      return { shouldInsert: false, reason: 'File is not empty' };
    }

    const uriKey = document.uri.toString();

    // Prevent concurrent duplicate executions
    if (this.inFlightUris.has(uriKey)) {
      return { shouldInsert: false, reason: 'Template insertion already in progress' };
    }

    // Check onOpenEmptyFiles setting
    const isNewlyCreated = this.newlyCreatedUris.has(uriKey);
    if (!config.onOpenEmptyFiles && !isNewlyCreated) {
      return {
        shouldInsert: false,
        reason: 'Existing empty file opened and onOpenEmptyFiles is false'
      };
    }

    return { shouldInsert: true, reason: 'Eligible for template insertion', templateInfo };
  }

  /**
   * Applies boilerplate insertion to a document if eligible.
   *
   * @param {vscode.TextDocument} document
   * @param {string} [triggerSource='unknown']
   * @returns {Promise<boolean>} True if template was inserted
   */
  async processDocument(document, triggerSource = 'unknown') {
    if (!document || !document.uri) return false;

    const config = this.getConfig(document.uri);
    const evaluation = this.evaluateDocument(document, config);

    if (!evaluation.shouldInsert) {
      return false;
    }

    const uriKey = document.uri.toString();
    const { templateInfo } = evaluation;

    // Acquire lock
    this.inFlightUris.add(uriKey);

    try {
      // Recheck document state immediately before applying edit
      if (document.isClosed || document.getText().length > 0) {
        return false;
      }

      // Use WorkspaceEdit for safe, undoable document modification
      const edit = new this.vscode.WorkspaceEdit();
      edit.insert(document.uri, new this.vscode.Position(0, 0), templateInfo.content);

      const success = await this.vscode.workspace.applyEdit(edit);
      if (!success) {
        return false;
      }

      // Successfully populated; remove from newlyCreated tracking
      this.newlyCreatedUris.delete(uriKey);

      // Position the cursor at the target editable line/column
      this.applyCursorPosition(document.uri, templateInfo.cursor);

      // Show notification if enabled in settings
      if (config.showNotification) {
        const baseName = path.basename(document.uri.fsPath);
        this.vscode.window.showInformationMessage(
          `Auto Boilerplate: Inserted ${templateInfo.language} boilerplate into ${baseName}.`
        );
      }

      return true;
    } catch (error) {
      console.error(`Auto Boilerplate: Error processing ${uriKey}:`, error);
      return false;
    } finally {
      // Release lock
      this.inFlightUris.delete(uriKey);
    }
  }

  /**
   * Sets cursor position in the editor for the given document URI.
   * If editor is not currently visible, records target position for when it gains focus.
   *
   * @param {vscode.Uri} uri
   * @param {{ line: number, character: number }} cursor
   */
  applyCursorPosition(uri, cursor) {
    if (!cursor) return;
    const uriKey = uri.toString();
    const targetPos = new this.vscode.Position(cursor.line, cursor.character);

    // Look for an editor matching this document
    const editors = this.vscode.window.visibleTextEditors || [];
    const matchingEditor = editors.find(e => e.document && e.document.uri.toString() === uriKey);

    if (matchingEditor) {
      matchingEditor.selection = new this.vscode.Selection(targetPos, targetPos);
      matchingEditor.revealRange(
        new this.vscode.Range(targetPos, targetPos),
        this.vscode.TextEditorRevealType ? this.vscode.TextEditorRevealType.InCenterIfOutsideViewport : 0
      );
      this.pendingCursors.delete(uriKey);
    } else {
      // Store pending cursor to be applied when the editor becomes active
      this.pendingCursors.set(uriKey, cursor);
    }
  }

  /**
   * Handles active editor change event to fulfill any pending cursor positioning
   * and process the newly focused document if empty.
   *
   * @param {vscode.TextEditor} editor
   */
  async handleActiveEditorChanged(editor) {
    if (!editor || !editor.document) return;
    const uri = editor.document.uri;
    const uriKey = uri.toString();

    // Check if there is a pending cursor for this document
    if (this.pendingCursors.has(uriKey)) {
      const cursor = this.pendingCursors.get(uriKey);
      this.pendingCursors.delete(uriKey);
      const targetPos = new this.vscode.Position(cursor.line, cursor.character);
      editor.selection = new this.vscode.Selection(targetPos, targetPos);
      editor.revealRange(
        new this.vscode.Range(targetPos, targetPos),
        this.vscode.TextEditorRevealType ? this.vscode.TextEditorRevealType.InCenterIfOutsideViewport : 0
      );
    }

    // Process document if it is empty
    await this.processDocument(editor.document, 'activeEditorChanged');
  }

  /**
   * Handles file creation events from VS Code Explorer
   * @param {vscode.FileCreateEvent} event
   */
  handleFilesCreated(event) {
    if (!event || !Array.isArray(event.files)) return;
    for (const uri of event.files) {
      this.recordCreatedUri(uri);
    }
  }

  /**
   * Handles document open events
   * @param {vscode.TextDocument} document
   */
  async handleDocumentOpened(document) {
    await this.processDocument(document, 'documentOpened');
  }
}

let controllerInstance = null;

/**
 * Activates the Auto Boilerplate extension
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const controller = new AutoBoilerplateController(vscode);
  controllerInstance = controller;

  // 1. Listen for file creation events (e.g. via Explorer "New File")
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(event => {
      controller.handleFilesCreated(event);
    })
  );

  // 2. Listen for document open events
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      controller.handleDocumentOpened(document);
    })
  );

  // 3. Listen for active editor changes (to position cursor and catch newly opened tabs)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      controller.handleActiveEditorChanged(editor);
    })
  );

  // 4. Register manual command for user convenience
  context.subscriptions.push(
    vscode.commands.registerCommand('autoBoilerplate.insert', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Auto Boilerplate: No active editor found.');
        return;
      }
      const inserted = await controller.processDocument(editor.document, 'manualCommand');
      if (!inserted) {
        const text = editor.document.getText();
        if (text.length > 0) {
          vscode.window.showWarningMessage('Auto Boilerplate: Cannot insert into non-empty file.');
        } else if (!isSupportedExtension(editor.document.uri.fsPath)) {
          vscode.window.showWarningMessage(`Auto Boilerplate: Unsupported file extension.`);
        }
      }
    })
  );

  // 5. Inspect currently open documents upon activation
  if (Array.isArray(vscode.workspace.textDocuments)) {
    for (const doc of vscode.workspace.textDocuments) {
      controller.processDocument(doc, 'activationInspection');
    }
  }

  // Also check the currently active editor if present
  if (vscode.window.activeTextEditor) {
    controller.handleActiveEditorChanged(vscode.window.activeTextEditor);
  }
}

/**
 * Deactivates the Auto Boilerplate extension
 */
function deactivate() {
  if (controllerInstance) {
    controllerInstance.newlyCreatedUris.clear();
    controllerInstance.inFlightUris.clear();
    controllerInstance.pendingCursors.clear();
    controllerInstance = null;
  }
}

module.exports = {
  activate,
  deactivate,
  AutoBoilerplateController
};
