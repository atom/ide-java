const {pointsAreEqual} = require('./helpers/points.helper')
const {
  provider, addImport, getImportChoice, getUnimportedType,
  buildImportSuggestion, isCandidateForAutoImport
} = require('../lib/providers/autoImportActionProvider')

describe.only('autoImportActionProvider', () => {
  describe('isCandidateForAutoImport', () => {
    it('should return true for class resolution errors', () => {
      const text = 'SomeClass cannot be resolved'
      expect(isCandidateForAutoImport({text})).to.be.true
    })

    it('should return true for type resolution errors', () => {
      const text = 'SomeType cannot be resolved to a type'
      expect(isCandidateForAutoImport({text})).to.be.true
    })

    it('should return true for variable resolution errors', () => {
      const text = 'SOME_VAR cannot be resolved to a variable'
      expect(isCandidateForAutoImport({text})).to.be.true
    })

    it('should return false for imports that cannot be resolved', () => {
      const text = 'The import javax cannot be resolved'
      expect(isCandidateForAutoImport({text})).to.be.false
    })
  })

  describe('getUnimportedType', () => {
    it('should return the full type name', () => {
      const text = 'SomeClass cannot be resolved'
      expect(getUnimportedType({text})).to.equal('SomeClass')
    })

    it('should return empty string if no match was found', () => {
      const text = 'invaliderrormessage'
      expect(getUnimportedType({text})).to.equal('')
    })
  })

  describe('buildImportSuggestion', () => {
    describe('Suggestion Type: `class`', () => {
      it('should build the correct import package path', () => {
        const suggestion = {
          type: 'class',
          displayText: 'Map - java.util'
        }

        expect(buildImportSuggestion(suggestion)).to.equal('java.util.Map')
      })

      it('should throw error if type or package name is missing', () => {
        try {
          expect.fail('Should have thrown error')
        } catch (error) {
          expect(error).not.to.be.null
        }
      })
    })

    describe('Suggestion Type: `function`', () => {
      it('should return the correct import package path', () => {
        const suggestion = {
          type: 'function',
          leftLabel: 'com.example.MyException'
        }

        expect(buildImportSuggestion(suggestion)).to.equal('com.example.MyException')
      })

      it('should throw error if `leftLabel` property is missing', () => {
        try {
          expect.fail('Should have thrown error')
        } catch (error) {
          expect(error).not.to.be.null
        }
      })
    })

    describe('Suggestion Type: `mixin`', () => {
      it('should build the correct import package path', () => {
        const suggestion = {
          type: 'mixin',
          displayText: 'PostMessage - org.springframework.web.bind.annotation'
        }

        expect(buildImportSuggestion(suggestion)).to.equal('org.springframework.web.bind.annotation.PostMessage')
      })

      it('should throw error if type or package name is missing', () => {
        try {
          expect.fail('Should have thrown error')
        } catch (error) {
          expect(error).not.to.be.null
        }
      })
    })

    it('should throw error for unknown suggestion type', () => {
      try {
        buildImportSuggestion({ type: 'unknown type' })
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).not.to.be.null
      }
    })
  })

  // TODO test the multichoice UI component, somehow
  describe('getImportChoice', () => {
    const range = { start: [0, 0], end: [0, 0] }
    const editorMock = { getRootScopeDescriptor: () => ({ scopes: [ 'source.java' ] }) }
    const makeLanguageClientWithSuggestions = (...suggestions) => ({
      getSuggestions(autocompleteRequest) { return Promise.resolve(suggestions) }
    })

    it('should return an import suggestion w/o prompting the user if there is only one', () => {
      const client = makeLanguageClientWithSuggestions(
        {
          text: 'Map',
          type: 'class',
          displayText: 'Map - java.util'
        },
        {
          text: 'Optional',
          type: 'class',
          displayText: 'Optional - java.util'
        }
      )

      return getImportChoice('Map', editorMock, range, client)
      .then(chosenImport => expect(chosenImport).to.equal('java.util.Map'))
    })

    it('should dedupe suggestions', () => {
      const client = makeLanguageClientWithSuggestions(
        {
          text: 'MyException',
          type: 'function',
          leftLabel: 'com.example.MyException',
          displayText: 'MyException()'
        },
        {
          text: 'MyException',
          type: 'function',
          leftLabel: 'com.example.MyException',
          displayText: 'MyException(String msg)'
        }
      )

      return getImportChoice('MyException', editorMock, range, client)
      .then(chosenImport => expect(chosenImport).to.equal('com.example.MyException'))
    })

    it('should only suggest exact import matches', () => {
      const client = makeLanguageClientWithSuggestions(
        {
          text: 'HashMap',
          type: 'class',
          displayText: 'HashMap - java.util'
        },
        {
          text: 'Map',
          type: 'class',
          displayText: 'Map - java.util'
        }
      )

      return getImportChoice('HashMap', editorMock, range, client)
      .then(chosenImport => expect(chosenImport).to.equal('java.util.HashMap'))
    })

    it('should return nothing if no suggestions are found', () => {
      const client = makeLanguageClientWithSuggestions()

      return getImportChoice('HashMap', editorMock, range, client)
      .then(chosenImport => expect(chosenImport).not.to.be.defined)
    })
  })

  describe('addImport', () => {
    let editor
    beforeEach(() => atom.workspace.open().then(e => editor = e))

    it('should place imports above other imports', () => {
      const pkg = 'java.util.Optional'
      const editorText = `
package com.example;

import java.util.Map;
`
      const expectedText = `
package com.example;

import ${pkg};
import java.util.Map;
`

      editor.setText(editorText)
      addImport(editor, pkg)

      expect(editor.getText()).to.equal(expectedText)
    })

    it('should place imports below package if no imports exist', () => {
      const pkg = 'java.util.Optional'
      const editorText = `
package com.example;
`

      const expectedText = '\npackage com.example;'
        + `\n\nimport ${pkg};\n`

      editor.setText(editorText)
      addImport(editor, pkg)

      expect(editor.getText()).to.equal(expectedText)
    })

    it('should throw error if there are no imports or package statement', () => {
      try {
        editor.setText('')
        addImport(editor, 'java.util.Optional')
        expect.fail('should have thrown error')
      } catch (error) {
        expect(error).not.to.be.null
      }
    })

    it('should retain users cursor position', () => {
      const pkg = 'java.util.Optional'
      const editorText = `
package com.example;

public class MyClass {}
`

      editor.setText(editorText)

      editor.setCursorBufferPosition({ row: 3, column: 15 })
      const curWord = editor.getWordUnderCursor()

      addImport(editor, pkg)
      expect(editor.getWordUnderCursor()).to.equal(curWord)
    })
  })

  describe('Code Action', () => {
    const makeLanguageClientWithSuggestions = (failcb, ...suggestions) => ({
      getSuggestions(autocompleteRequest) { return Promise.resolve(suggestions) },
      createNotification(_, errMsg, opts) { return failcb(errMsg) }
    })

    let editor
    beforeEach(() => atom.workspace.open().then(e => editor = e))

    it('should insert found import', done => {
      const client = makeLanguageClientWithSuggestions(
        done, {
          text: 'Map',
          type: 'class',
          displayText: 'Map - java.util'
        },
        {
          text: 'HashMap',
          type: 'class',
          displayText: 'HashMap - java.util'
        }
      )

      const editorText = `
package com.example;

import java.util.Map;

public class MyClass {
  private Map<String, String> m;
  public MyClass() { m = new HashMap<>() }
}
`

      const expectedText = `
package com.example;

import java.util.HashMap;
import java.util.Map;

public class MyClass {
  private Map<String, String> m;
  public MyClass() { m = new HashMap<>() }
}
`
      editor.setText(editorText)

      const range = { start: [7, 29], end: [7, 35] }
      const diagnostic = { text: 'HashMap cannot be resolved to a type' }

      editor.setCursorBufferPosition({ row: 7, column: 29 })
      const wordUnderCursor = editor.getWordUnderCursor()

      provider(editor, range, diagnostic, client).apply()
      .then(() => {
        expect(editor.getText()).to.equal(expectedText)
        expect(editor.getWordUnderCursor()).to.equal(wordUnderCursor)
        done()
      }).catch(err => done(err))
    })

    it('should notify the user if no import suggestions were found', () => {
      const client = makeLanguageClientWithSuggestions(err => {
        expect(err).not.to.be.null
        expect(editor.getText()).to.equal(editorText)
        done()
      })

      const editorText = `
package com.example;

import java.util.Map;

public class MyClass {
  private Map<String, String> m;
  public MyClass() { m = new HashMap<>() }
}
`

      editor.setText(editorText)

      const range = { start: [8, 31], end: [8, 37] }
      const diagnostic = { text: 'HashMap cannot be resolved to a type' }

      provider(editor, range, diagnostic, client).apply()
      .catch(err => done(err))
    })

    it('should notify the user if apply rejects', () => {
      const client = {
        createNotification(_, errMsg, {}) {
          expect(errMsg).not.to.be.null
          expect(editor.getText()).to.equal(editorText)
          done()
        },
        getSuggestions(req) { return Promise.reject('Some error') }
      }

      const editorText = 'package com.example;'
      editor.setText(editorText)

      const range = { start: [0, 0], end: [0, 0] }
      const diagnostic = { text: 'HashMap cannot be resolved to a type' }

      provider(editor, range, diagnostic, client).apply()
      .catch(err => done(err))
    })
  })
})
