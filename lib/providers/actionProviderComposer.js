/**
 * @name actionProviderComposer
 * @description a function that satisfies the Atom IDE CodeActionProvider
 * interface, running each diagnostic through a series of providers, each
 * of which may return either a valid CodeAction (optionally wrapped in a
 * Promise) as defined by Atom IDE or null if a given provider chooses not
 * to provide an action for the diagnostic
 * @param {JavaLanguageClient} languageClient the wrapping Java language client
 * @param {[function]} providers a list of providers to register
 * @returns {atom$CodeActionProvider}
**/
function actionProviderComposer(languageClient, ...providers) {
  return {
    grammarScopes: [ 'source.java' ],
    priority: 1,
    getCodeActions(editor, range, diagnostics) {
      try {
        return Promise.all(
          diagnostics.reduce((acc, diagnostic) =>
            providers
            .map(p => p(editor, range, diagnostic, languageClient))
            .filter(action => !!action)
          , [])
        ).catch(error => { languageClient.createNotification(
            1, `Error getting code actions for diagnostic: ${error.toString()}`
          )
        })
      } catch (error) {
        languageClient.createNotification(
          1, `Error getting code actions ${error.toString()}`
        )
      }
    }
  }
}

module.exports = actionProviderComposer
