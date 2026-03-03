// import ContentService from '../../../../../../../grapesjs-preset-mautic/src/content.service';
import MjmlService from 'grapesjs-preset-mautic/dist/mjml/mjml.service';
import ContentService from 'grapesjs-preset-mautic/dist/content.service';

class CodeEditor {
  editor;

  opts;

  codeEditor;

  codePopup;

  constructor(editor, opts = {}) {
    this.editor = editor;
    this.opts = opts;

    this.codeEditor = this.buildCodeEditor();
    this.codePopup = this.buildCodePopup();
  }

  // Build codeEditor (CodeMirror instance)
  buildCodeEditor() {
    const codeEditor = this.editor.CodeManager.getViewer('CodeMirror').clone();

    codeEditor.set({
      codeName: 'htmlmixed',
      readOnly: false,
      theme: 'hopscotch',
      autoBeautify: true,
      autoCloseTags: true,
      autoCloseBrackets: true,
      lineWrapping: true,
      styleActiveLine: true,
      smartIndent: true,
      indentWithTabs: true,
    });

    return codeEditor;
  }

  // Build popup content, codeEditor area and buttons
  buildCodePopup() {
    const cfg = this.editor.getConfig();

    const codePopup = document.createElement('div');
    const btnEdit = document.createElement('button');
    const btnCancel = document.createElement('button');
    const textarea = document.createElement('textarea');

    btnEdit.innerHTML = Mautic.translate('grapesjsbuilder.sourceEditBtnLabel');
    btnEdit.className = `${cfg.stylePrefix}btn-prim ${cfg.stylePrefix}btn-code-edit`;
    btnEdit.onclick = this.updateCode.bind(this);

    btnCancel.innerHTML = Mautic.translate('grapesjsbuilder.sourceCancelBtnLabel');
    btnCancel.className = `${cfg.stylePrefix}btn-prim ${cfg.stylePrefix}btn-code-cancel`;
    btnCancel.onclick = this.cancelCode.bind(this);

    codePopup.appendChild(textarea);
    codePopup.appendChild(btnEdit);
    codePopup.appendChild(btnCancel);

    this.codeEditor.init(textarea);

    return codePopup;
  }

  // Load content and show popup
  showCodePopup(editor) {
    this.updateEditorContents();
    // this.codeEditor.editor.refresh();
    // editor.Modal.setContent('');
    editor.Modal.setContent(this.codePopup);
    editor.Modal.setTitle(Mautic.translate('grapesjsbuilder.sourceEditModalTitle'));
    editor.Modal.open();

    editor.Modal.onceClose(() => editor.stopCommand('preset-mautic:code-edit'));
  }

  /**
   * Extract body content from full HTML code
   * @param {string} code - The full HTML code
   * @returns {string} - The body content or original code if no body tag found
   */
  extractBodyContent(code) {
    const bodyMatch = code.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }
    return code;
  }

  /**
   * Update the main editors canvas content with the
   * content from modals editor.
   * @todo show validation results in UI
   */
  updateCode() {
    const code = this.codeEditor.editor.getValue();
    // validate MJML code
    if (ContentService.isMjmlMode(this.editor)) {
      MjmlService.mjmlToHtml(code);
    }

    try {
      // For HTML pages (non-MJML mode), extract body content to prevent
      // head elements from being duplicated into body on each save
      const isMjml = ContentService.isMjmlMode(this.editor);
      let contentToSet = code.trim();
      if (!isMjml) {
        contentToSet = this.extractBodyContent(code);
      }

      // delete canvas and set new content
      this.editor.DomComponents.getWrapper().set('content', '');
      this.editor.setComponents(contentToSet)

      // Reinitialize the content after parsing MJML.
      // This can be removed once the issue with self-closing tags is resolved in grapesjs-mjml.
      // See: https://github.com/GrapesJS/mjml/issues/149
      // Skip this step for non-MJML (HTML landing pages) to avoid duplicating content
      if (isMjml) {
        const parsedContent = MjmlService.getEditorMjmlContent(this.editor);
        this.editor.setComponents(parsedContent);
      }

      this.editor.Modal.close();
    } catch (e) {
      window.alert(`${Mautic.translate('grapesjsbuilder.sourceSyntaxError')} \n${e.message}`);
    }
  }

  // Close popup
  cancelCode() {
    this.editor.Modal.close();
  }

  /**
   * Set the content to be edited in the popup editor
   */
  updateEditorContents() {
    // Check if MJML plugin is on
    let content;
    if (ContentService.isMjmlMode(this.editor)) {
      content = MjmlService.getEditorMjmlContent(this.editor);
    } else {
      content = ContentService.getEditorHtmlContent(this.editor);
    }
    this.codeEditor.setContent(content);
  }
}

export default CodeEditor;
