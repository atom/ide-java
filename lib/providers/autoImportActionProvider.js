const ImportSuggestionListView = require('../views/importSuggestionListView')

function autoImportActionProvider(editor, range, diagnostic, languageClient) {
  if (!isCandidateForAutoImport(diagnostic)) return
  const missingType = getUnimportedType(diagnostic)

  return {
    getTitle() { return Promise.resolve(`Add import for ${missingType}`) },
    dispose() {},
    apply() {
      return getImportChoice(missingType, editor, range, languageClient)
      .then(chosenImport => {
        if (chosenImport) return addImport(editor, chosenImport)
        else languageClient.createNotification(2, 'No import suggestions found')
      })
      .catch(error => languageClient.createNotification(
        1, `Error performing autoimport: ${error.message}`, {}
      ))
    }
  }
}

/**
 * @name addImport
 * @description finds an appropriate location to insert a Java import statement,
 * will first check for the location of other import statements and will add
 * the import to a new line above other statements, otherwise will add it to
 * a full new line after the top level package statement
 * @param {atom$TextEditor} editor the editor of the document the import is to be added to
 * @param {String} importPkg the fully qualified Java package and type to import
 * @returns {Promise<void>}
 * @todo handle static imports
**/
function addImport(editor, importPkg) {
  let importInsertionRange
  let shouldInsertBelow = false

  // get first occurrence of an import
  editor.scan(/import.+$/, result => {
    importInsertionRange = result.range || result.computedRange
    stop()
  })

  // if there are no imports place under `package` declaration
  if (!importInsertionRange) {
    editor.scan(/package.+$/, result => {
      importInsertionRange = result.range || result.computedRange
      shouldInsertBelow = true
      stop()
    })
  }

  if (!importInsertionRange)
    throw new Error('No suitable location for import found')

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

  editor.insertText(`import ${importPkg};`, { autoIndent: true })
  editor.setCursorBufferPosition({
    row: curCursorPos.row + numLinesOffset,
    column: curCursorPos.column
  })
}

/**
 * @name getImportChoice
 * @description retrieves a list of import suggestions for the given missing type,
 * if there are multiple suggestions the user will be prompted to choose a specific
 * import
 * @param {String} missingType the Java type name being looked for
 * @param {TextEditor} editor
 * @param {atom$Range} typeRange the buffer range of the type name
 * @param {AtomLanguageClient} languageClient the parent AtomLanguageClient
 * @returns {Promise<String>} a promise resolving to the package address of the import,
 * null signifies user cancellation
**/
function getImportChoice(missingType, editor, typeRange, languageClient) {
  const autocompleteRequest = {
    editor,
    bufferPosition: typeRange.end,
    scopeDescriptor: editor.getRootScopeDescriptor().scopes[0],
    prefix: missingType,
    activatedManually: true
  }

  return languageClient.getSuggestions(autocompleteRequest)
  .then(ss => ss
    .filter(({ text }) => text === missingType)
    .map(buildImportSuggestion)
    // duplicate suggestions are sometimes returned for
    // different forms of a function call so dedupe
    .reduce((acc, nextImport) => {
      if (!~acc.findIndex(itm => itm === nextImport)) acc.push(nextImport)
      return acc
    }, [])
    .filter(i => !!i)
  ).then(possibleImports => {
    if (possibleImports.length === 0) return
    if (possibleImports.length === 1) return possibleImports[0]

    let view = new ImportSuggestionListView(possibleImports)
    return view.waitForConfirmOrCancel()
  })
}

function buildImportSuggestion(autocompleteSuggestion) {
  switch (autocompleteSuggestion.type) {
  case 'class':
  case 'mixin':
    const { displayText } = autocompleteSuggestion
    const [ typeName, pkgName ] = displayText.split('-').map(s => s.trim())

    if (!typeName || !pkgName)
      throw new Error(`Not enough parts in autocomplete suggestion to make import suggestion: ${displayText}`)

    return `${pkgName}.${typeName}`
  case 'function':
    return autocompleteSuggestion.leftLabel || autocompleteSuggestion.rightLabel;
  default:
    throw new Error(`Unknown autocomplete suggestion type ${autocompleteSuggestion.type}`)
  }
}

function getUnimportedType({ text }) {
  const typeNameExpr = /^[a-zA-Z0-9_]{0,}(?=\ )/ig
  const typeNameMatch = typeNameExpr.exec(text)

  if (!typeNameMatch) return ''

  const [ typeName ] = typeNameMatch
  return typeName
}

function isCandidateForAutoImport({ text }) {
  const testExpr = /^(?!The import).+ cannot be resolved[ to a (type|variable)]*/ig
  return testExpr.test(text)
}

module.exports = {
  provider: autoImportActionProvider,
  addImport, getImportChoice, getUnimportedType,
  buildImportSuggestion, isCandidateForAutoImport
}
