const actionProviderComposer = require('../lib/providers/actionProviderComposer')

const makeCodeAction = (title, result) => ({
  getTitle() { return title },
  dispose() {},
  apply() { return result }
})

const diagnosticMock = { text: 'Some diagnostic' }
const buildLanguageClientNotifierMock = errCb => ({
  createNotification: (severity, err) => done(errCb)
})

describe('actionProviderComposer', done => {
  it('provides diagnostics to providers', done => {
    const provider = idx => (_, __, diagnostic, cl) => {
      expect(diagnostic).to.be.equal(diagnosticMock)

      return [ makeCodeAction(`test${idx}`, Promise.resolve()) ]
    }

    actionProviderComposer(buildLanguageClientNotifierMock(done), provider(1), provider(2))
    .getCodeActions(null, null, [diagnosticMock])
    .then(actions => {
      expect(actions).not.to.be.null
      expect(actions.length).to.equal(2)
      expect(actions[0].getTitle()).to.equal('test1')
      done()
    }).catch(err => done(err))
  })

  it('accepts non-array code actions', done => {
    const provider = (_, __, diagnostic, cl) => {
      return makeCodeAction('test', Promise.resolve())
    }

    actionProviderComposer(buildLanguageClientNotifierMock(done), provider)
    .getCodeActions(null, null, [diagnosticMock])
    .then(actions => {
      expect(actions).not.to.be.null
      expect(actions.length).to.equal(1)
      expect(actions[0].getTitle()).to.equal('test')
      done()
    }).catch(err => done(err))
  })

  it('accepts promises containing actions', done => {
    const provider = (_, __, diagnostic, cl) => {
      return [ makeCodeAction('promise test', Promise.resolve(true)) ]
    }

    actionProviderComposer(buildLanguageClientNotifierMock(done), provider)
    .getCodeActions(null, null, [diagnosticMock])
    .then(() => done())
    .catch(err => done(err))
  })

  it('cleans all null results', done => {
    const provider = (_, __, diagnostic, cl) => { return null }

    actionProviderComposer(buildLanguageClientNotifierMock(done), provider)
    .getCodeActions(null, null, [diagnosticMock])
    .then(() => done())
    .catch(err => done(err))
  })

  it('reports errors thrown from providers', done => {
    const languageClientMock = { createNotification: (_, err) => {
      expect(err).not.to.be.null
      done()
    }}

    const provider = () => { throw new Error('Provider creation error') }

    actionProviderComposer(languageClientMock, provider)
    .getCodeActions(null, null, [diagnosticMock])
    .catch(err => done(err))
  })

  it('reports errors from providers with rejected promises', done => {
    const languageClientMock = { createNotification: (_, err) => {
      expect(err).not.to.be.null
      done()
    }}

    const provider = () => Promise.reject('Action creation error')

    actionProviderComposer(languageClientMock, provider)
    .getCodeActions(null, null, [diagnosticMock])
    .catch(err => done(err))
  })

  it('calls through with no providers', () => {
    actionProviderComposer(buildLanguageClientNotifierMock(done))
    .getCodeActions(null, null, [diagnosticMock])
    .then(actions => {
      expect(actions).not.to.be.null
      expect(actions.length).to.equal(0)
      done()
    }).catch(err => done(err))
  })
})
