class RemoveUnusedImportActionProvider {
  get grammarScopes() { return [ 'source.java' ] }
  get priority() { return 1 }

  constructor() {}

  getCodeActions(editor, range, diagnostics) {
    return diagnostics
    .filter(RemoveUnusedImportActionProvider.isUnusedImport)
    .map(d => {
      return {
        getTitle() { return Promise.resolve('Remove unused import') },
        dispose() {},
        apply() {
          const selections = editor.getSelectedBufferRanges()

          editor.setSelectedBufferRange(range)
          editor.deleteLine()

          editor.setSelectedBufferRanges(selections)

          return Promise.resolve()
        }
      }
    })
  }

  static isUnusedImport({ text }) {
    const unusedImportExpr = /The import [a-z0-9\.]+ is never used/ig
    return unusedImportExpr.test(text)
  }
}

module.exports = () => new RemoveUnusedImportActionProvider()
