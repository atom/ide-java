module.exports = {
  actionProviderComposer: require('./actionProviderComposer'),
  actionProviders: {
    autoImportProvider: require('./autoImportActionProvider').provider,
    removeUnusedImportProvider: require('./removeUnusedImportActionProvider').provider
  }
}
