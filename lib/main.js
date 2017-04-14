const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const {AutoLanguageClient, DownloadFile} = require('atom-languageclient')

const serverDownloadUrl = 'https://download.jboss.org/jbosstools/static/vscode/jdt-language-server-0.1.0-201703022129.tar.gz'
const serverDownloadSize = 40837499
const serverLauncherJar = '/plugins/org.eclipse.equinox.launcher_1.4.0.v20161219-1356.jar'

class JavaLanguageServer extends AutoLanguageClient {
  getGrammarScopes () { return [ 'source.java' ] }
  getLanguageName () { return 'Java' }
  getServerName () { return 'Eclipse JDT' }

  constructor () {
    super()
    this.statusElement = document.createElement('span')
    this.statusElement.className = 'inline-block'

    // TODO: Replace this with a workspace configuration system
    this.ignoreIncompleteClasspath = false
    this.commands = {
      'java.ignoreIncompleteClasspath': () => { this.ignoreIncompleteClasspath = true }
    }
  }

  startServerProcess () {
    const config = { 'win32': 'win', 'darwin': 'mac', 'linux': 'linux' }[process.platform]
    if (config == null) {
      throw Error(`${this.getServerName()} not supported on ${process.platform}`)
    }

    const serverHome = path.join(__dirname, '..', 'server')
    const command = 'java'

    return this.getOrInstallLauncher(serverHome)
      .then(launcher => {
        const args = [
          '-jar', launcher,
          '-configuration', path.join(serverHome, `config_${config}`)
        ]

        this.logger.debug(`starting "${command} ${args.join(' ')}"`)
        return cp.spawn(command, args, { cwd: serverHome })
      }
    )
  }

  getOrInstallLauncher (serverHome) {
    const fullLauncherJar = path.join(serverHome, serverLauncherJar)
    return this.fileExists(fullLauncherJar).then(doesExist =>
      doesExist ? fullLauncherJar : this.installServer(serverHome).then(() => fullLauncherJar)
    )
  }

  installServer (serverHome) {
    const localFileName = path.join(serverHome, 'download.tar.gz')
    const decompress = require('decompress')
    return this.fileExists(serverHome)
      .then(doesExist => { if (!doesExist) fs.mkdir(serverHome) })
      .then(() => { DownloadFile(serverDownloadUrl, localFileName, (bytesDone, percent) => this.updateStatusBar(`downloading ${percent}%`), serverDownloadSize) })
      .then(() => this.updateStatusBar('unpacking'))
      .then(() => decompress(localFileName, serverHome))
      .then(() => this.fileExists(path.join(serverHome, serverLauncherJar)))
      .then(doesExist => { if (!doesExist) throw Error(`Failed to install the ${this.getServerName()} language server`) })
      .then(() => this.updateStatusBar('installed'))
      .then(() => Promise.resolve(true))
  }

  preInitialization () {
    this._lc.onCustom('language/status', (e) => this.updateStatusBar(`${e.type.replace(/^Started$/, '')} ${e.message}`))
    this._lc.onCustom('language/actionableNotification', this.actionableNotification.bind(this))
  }

  updateStatusBar (text) {
    this.statusElement.textContent = `${this.name} ${text}`
  }

  actionableNotification (notification) {
    // Temporary until we have workspace configuration
    if (this.ignoreIncompleteClasspath && notification.message.includes('Classpath is incomplete')) return

    const options = { dismissable: true, detail: this.getServerName() }
    if (Array.isArray(notification.commands)) {
      options.buttons = notification.commands.map(c => ({ text: c.title, onDidClick: (e) => onActionableButton(e, c.command) }))
      // TODO: Deal with the actions
    }

    const notificationDialog = this.createNotification(notification.severity, notification.message, options)

    function onActionableButton (event, commandName) {
      const commandFunction = this.commands[commandName]
      if (commandFunction != null) {
        commandFunction()
      } else {
        console.log(`Unknown actionableNotification command '${commandName}'`)
      }
      notificationDialog.dismiss()
    }
  }

  createNotification (severity, message, options) {
    switch (severity) {
      case 1: return atom.notifications.addError(message, options)
      case 2: return atom.notifications.addWarning(message, options)
      case 3: return atom.notifications.addInfo(message, options)
      case 4: console.log(message)
    }
  }

  consumeStatusBar (statusBar) {
    this.statusTile = statusBar.addRightTile({ item: this.statusElement, priority: 1000 })
  }

  fileExists (path) {
    return new Promise((resolve, reject) => {
      fs.access(path, fs.R_OK, error => {
        resolve(!error || error.code !== 'ENOENT')
      })
    })
  }

  deleteFileIfExists (path) {
    return new Promise((resolve, reject) => {
      fs.unlink(path, error => {
        if (error && error.code !== 'ENOENT') { reject(error) } else { resolve() }
      })
    })
  }
}

module.exports = new JavaLanguageServer()
