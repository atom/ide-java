module.exports = {
  ActionProviderComposer: require('./actionProviderComposer'),
  actionProviders: {
    AutoImportProvider: require('./autoImportActionProvider').provider,
    RemoveUnusedImportProvider: require('./removeUnusedImportActionProvider').provider
  }
}
