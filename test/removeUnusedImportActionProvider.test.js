// TODO: we need to create an atom editor and fill it with text in order
// to test text editing
// from https://discuss.atom.io/t/cannot-get-active-text-editor-in-tests/24285/7
// [workspaceElement, activationPromise, editor] = []
//
// beforeEach ->
//   workspaceElement = atom.views.getView(atom.workspace)
//   activationPromise = atom.packages.activatePackage('word-count-tutorial')
//   waitsForPromise ->
//     atom.workspace.open().then (e) ->
//       editor = e

const {pointsAreEqual} = require('./helpers/points.helper')
const {Point} = require('atom')
const {provider, isUnusedImport} = require('../lib/providers/removeUnusedImportActionProvider')

describe('RemoveUnusedImportActionProvider', () => {
  describe('isUnusedImport', () => {
    it('should return true for unused class import messages', () => {
      const msg = { text: 'The import Map is never used' }
      expect(isUnusedImport(msg)).to.be.true
    })

    it('should return true for unused constant import messages', () => {
      const msg = { text: 'The import SOME_CONSTANT is never used' }
      expect(isUnusedImport(msg)).to.be.true
    })

    it('should return false for other error messages', () => {
      const msg = { text: 'Never used import Map' }
      expect(isUnusedImport(msg)).to.be.false
    })
  })

  describe('Code Action', () => {
    let editor

    beforeEach(() => {
      return atom.workspace.open().then(e => editor = e)
    })

    it('should delete the import', () => {
      const srcText = `
  package com.example;

  import com.example.SomeUsedImport;
  import com.example.SomeUnusedImport;
  import com.example.SomeOtherUsedImport;

  public class MyClass {}
`

      const expectedText = `
  package com.example;

  import com.example.SomeUsedImport;
  import com.example.SomeOtherUsedImport;

  public class MyClass {}
`

      editor.setText(srcText)
      const importRange = { start: [4, 2], end: [4, 38] }
      const diagnostic = { text: 'The import SomeUnusedImport is never used' }

      const action = provider(editor, importRange, diagnostic)
      expect(action).not.to.be.null

      return action.apply()
      .then(() => expect(editor.getText()).to.equal(expectedText))
    })

    it('should return the cursor to its previous position', () => {
      const srcText = `
  package com.example;

  import com.example.SomeUnusedImport;
`

      editor.setText(srcText)

      const cursorPos = new Point(1, 0)
      editor.setCursorBufferPosition(cursorPos)

      const importRange = { start: [3, 2], end: [3, 38] }
      const diagnostic = { text: 'The import SomeUnusedImport is never used' }

      const action = provider(editor, importRange, diagnostic)
      expect(action).not.to.be.null

      return action.apply()
      .then(() => expect(
          pointsAreEqual(cursorPos, editor.getCursorBufferPosition())
        ).to.be.true
      )
    })
  })
})
