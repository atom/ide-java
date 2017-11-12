const {SelectListView} = require('atom-space-pen-views')

class ImportSuggestionListView extends SelectListView {
  constructor(importSuggestions = []) {
    super()

    if (importSuggestions.length === 0)
      throw new Error('Import suggestions list cannot be empty')

    this.importSuggestions = importSuggestions

    this.setItems(this.importSuggestions)
    this.panel = atom.workspace.addModalPanel({ item: this })
    this.panel.show()
    this.focusFilterEditor()

    this._promise = new Promise((resolve, reject) => {
      this._confirmWith = resolve
      this._rejectWith = reject
    })
  }

  waitForConfirmOrCancel() { return this._promise }
  viewForItem(itm) { return `<li>${itm}</li>` }

  confirmed(itm) {
    this._confirmWith(itm)
    this.close()
  }

  cancelled() { this.close() }
  close() { if (this.panel) this.panel.destroy() }
}

module.exports = ImportSuggestionListView
