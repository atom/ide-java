const ImportSuggestionListView = require('../views/importSuggestionListView')

class AutoImportActionProvider {
  constructor(languageClient) {
    if (!languageClient)
      throw new Error('Must provide language client to AutoImportActionProvider')

    this.languageClient = languageClient;
  }

  getCodeActions(editor, range, diagnostics) {
    try {
      return diagnostics
      .filter(AutoImportActionProvider.isCandidateForAutoImport)
      .map(d => {
        const missingType = AutoImportActionProvider.getUnimportedType(d)

        return {
          getTitle() { return Promise.resolve(`Add import for ${missingType}`) },
          dispose() {},
          apply: () => this.getImportChoice(missingType, { editor, typeRange: range })
            .then(importChoice => { if (importChoice) return this.addImport(editor, importChoice) })
            .catch(error => this.languageClient.createNotification(
              1, `Error performing autoimport: ${error.message}`, {}
            ))
        }
      })
    } catch (error) {
      console.error('Error while creating code actions', error)
    }
  }

  /**
   * @name AutoImportActionProvider#getLocationForImport
   * @description finds an appropriate location to insert a Java import statement,
   * will first check for the location of other import statements and will add
   * the import to a new line above other statements, otherwise will add it to
   * a full new line after the top level package statement
   * @param {atom$TextEditor} editor the editor of the document the import is to be added to
   * @param {String} importPkg the fully qualified Java package and type to import
   * @returns {Promise<void>}
   * @todo handle static imports
  **/
  addImport(editor, importPkg) {
    let importInsertionRange
    let shouldInsertBelow = false

    // get first occurrence of an import
    const importGroupExpr = /import.+$/
    editor.scan(importGroupExpr, ({ match, computedRange }) => {
      importInsertionRange = computedRange
    })

    // if there are no imports place under `package` declaration
    const packageStmtExpr = /package.+$/
    if (!importInsertionRange) {
      editor.scan(packageStmtExpr, ({ match, computedRange }) => {
        importInsertionRange = computedRange
        shouldInsertBelow = true
      })
    }

    if (!importInsertionRange)
      return Promise.reject(new Error('No suitable location for import found'))

    const curCursorPos = editor.getCursorBufferPosition()
    editor.setCursorBufferPosition(importInsertionRange.start)

    let numLinesOffset;
    if (shouldInsertBelow) {
      // if inserting below ensure we clear a line above the import stmt
      editor.insertNewlineBelow()
      editor.insertNewlineBelow()
      numLinesOffset = 2
    } else {
      editor.insertNewlineAbove()
      numLinesOffset = 1
    }

    editor.insertText(`import ${importPkg};`)
    editor.setCursorBufferPosition(Object.assign({}, curCursorPos, {
      row: curCursorPos.row + numLinesOffset
    }))

    return Promise.resolve()
  }

  /**
   * @name AutoImportProvider#getImportChoice
   * @description retrieves a list of import suggestions for the given missing type,
   * if there are multiple suggestions the user will be prompted to choose a specific
   * import
   * @param {String} missingType the Java type name being looked for
   * @param {TextEditor} editor
   * @param {atom$Range} typeRange the buffer range of the type name
   * @returns {Promise<String>} a promise resolving to the package address of the import,
   * null signifies user cancellation
  **/
  getImportChoice(missingType, { editor, typeRange }) {
    const autocompleteRequest = {
      editor,
      bufferPosition: typeRange.end,
      scopeDescriptor: editor.getRootScopeDescriptor().scopes[0],
      prefix: missingType,
      activatedManually: true
    }

    return this.languageClient.getSuggestions(autocompleteRequest)
    .then(ss => ss
      .filter(({ text }) => text === missingType)
      .map(AutoImportActionProvider.buildImportSuggestion)
    ).then(possibleImports => {
      if (possibleImports.length === 1) return possibleImports[0]

      let view = new ImportSuggestionListView(possibleImports)
      return view.waitForConfirmOrCancel()
    })
  }

  static buildImportSuggestion(autocompleteSuggestion) {
    const { displayText } = autocompleteSuggestion
    const [ typeName, pkgName ] = displayText.split('-').map(s => s.trim())

    if (!typeName || !pkgName)
      throw new Error(`Not enough parts in autocomplete suggestion to make import suggestion: ${displayText}`)

    return `${pkgName}.${typeName}`
  }

  static getUnimportedType(diagnostic) {
    const typeNameExpr = /^[a-zA-Z0-9]{0,}(?=\ )/ig
    const [ typeName ] = typeNameExpr.exec(diagnostic.text)

    return typeName
  }

  static isCandidateForAutoImport(diagnostic) {
    const testExpr = /cannot be resolved to a type/ig
    return testExpr.test(diagnostic.text)
  }

  get grammarScopes() { return [ 'source.java' ] }
  get priority() { return 1 }
}

module.exports = function createAutoImportActionProvider(languageClient) {
  return new AutoImportActionProvider(languageClient)
}
