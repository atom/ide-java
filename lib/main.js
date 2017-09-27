const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {shell} = require('electron')
const {AutoLanguageClient, DownloadFile} = require('atom-languageclient')

const serverDownloadUrl = 'http://download.eclipse.org/jdtls/snapshots/jdt-language-server-0.5.0-201709251422.tar.gz'
const serverDownloadSize = 42236024
const serverLauncher = '/plugins/org.eclipse.equinox.launcher_1.4.0.v20161219-1356.jar'
const minJavaRuntime = 1.8

class JavaLanguageClient extends AutoLanguageClient {
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
      'java.ignoreIncompleteClasspath': () => { this.ignoreIncompleteClasspath = true },
      'java.ignoreIncompleteClasspath.help': () => { shell.openExternal('https://github.com/redhat-developer/vscode-java/wiki/%22Classpath-is-incomplete%22-warning') }
    }
  }

  startServerProcess (projectPath) {
    const config = { 'win32': 'win', 'darwin': 'mac', 'linux': 'linux' }[process.platform]
    if (config == null) {
      throw Error(`${this.getServerName()} not supported on ${process.platform}`)
    }

    const serverHome = path.join(__dirname, '..', 'server')
    const command = this.getJavaCommand()

    return this.checkJavaVersion(command)
      .then(() => this.installServerIfRequired(serverHome))
      .then(() => this.getOrCreateDataDir(projectPath))
      .then(dataDir => {
        const args = [
          '-jar', path.join(serverHome, serverLauncher),
          '-configuration', path.join(serverHome, `config_${config}`),
          '-data', dataDir
        ]

        this.logger.debug(`starting "${command} ${args.join(' ')}"`)
        const childProcess = cp.spawn(command, args, { cwd: serverHome })
        this.captureServerErrors(childProcess)
        childProcess.on('exit', exitCode => {
          if (!childProcess.killed) {
            atom.notifications.addError('IDE-Java language server stopped unexpectedly.', {
              dismissable: true,
              description: this.processStdErr ? `<code>${this.processStdErr}</code>` : `Exit code ${exitCode}`
            })
          }
          this.updateStatusBar('Stopped')
        })
        return childProcess
      }
    )
  }

  checkJavaVersion (command) {
    return new Promise((resolve, reject) => {
      const childProcess = cp.spawn(command, [ '-showversion', '-version' ])
      childProcess.on('error', err => {
        let description = err.code == 'ENOENT'
          ? `No Java runtime found at <b>${command}</b>.`
          : `Could not spawn the Java runtime <b>${command}</b>.`
        atom.notifications.addError('IDE-Java could not launch your Java runtime.', {
          dismissable: true,
          buttons: [
            { text: 'Set Java Path', onDidClick: () => atom.workspace.open('atom://config/packages/ide-java') },
            { text: 'Download Java', onDidClick: () => shell.openExternal('http://www.oracle.com/technetwork/java/javase/downloads/index.html') },
          ],
          description: `${description}<p>If you have Java installed please Set Java Path correctly. If you do not please Download Java ${minJavaRuntime} or later and install it.</p><code>${err.message}</code>`
        })
        reject()
      })
      let stdErr = '', stdOut = ''
      childProcess.stderr.on('data', chunk => stdErr += chunk.toString())
      childProcess.stdout.on('data', chunk => stdOut += chunk.toString())
      childProcess.on('exit', exitCode => {
        const output = stdErr + '\n' + stdOut
        if (exitCode === 0 && output != null) {
          const version = output.match(/ version "(\d+.\d+).\d+_\d+"/)
          this.logger.debug(`found ${version[0]} using "${command}"`)
          if (Number(version[1]) >= minJavaRuntime) {
            resolve()
          } else {
            atom.notifications.addError(`IDE-Java requires Java ${minJavaRuntime} or later but found ${version[0]}`, {
              dismissable: true,
              buttons: [
                { text: 'Set Java Path', onDidClick: () => atom.workspace.open('atom://config/packages/ide-java') },
                { text: 'Download Java', onDidClick: () => shell.openExternal('http://www.oracle.com/technetwork/java/javase/downloads/index.html') },
              ],
              description: `If you have Java ${minJavaRuntime} installed please Set Java Path correctly. If you do not please Download Java ${minJavaRuntime} or later and install it.`
            })
            reject()
          }
        } else {
          atom.notifications.addError('IDE-Java encounted an error using the Java runtime.', {
            dismissable: true,
            description: stdErr != null ? `<code>${stdErr}</code>` : `Exit code ${exitCode}`
          })
          reject()
        }
      })
    })
  }

  getJavaCommand () {
    const javaPath = this.getJavaPath()
    return javaPath == null ? 'java' : path.join(javaPath, 'bin', 'java')
  }

  getJavaPath () {
    return (new Array(
      atom.config.get('ide-java.javaHome'),
      process.env['JDK_HOME'],
      process.env['JAVA_HOME'])
    ).find(j => j)
  }

  getOrCreateDataDir (projectPath) {
    const dataDir = path.join(os.tmpdir(), `atom-java-${encodeURIComponent(projectPath)}`)
    return this.fileExists(dataDir)
      .then(exists => { if (!exists) return fs.mkdir(dataDir) })
      .then(() => dataDir)
  }

  installServerIfRequired (serverHome) {
    return this.isServerInstalled(serverHome)
      .then(doesExist => { if (!doesExist) return this.installServer(serverHome) })
  }

  isServerInstalled (serverHome) {
    return this.fileExists(path.join(serverHome, serverLauncher))
  }

  installServer (serverHome) {
    const localFileName = path.join(serverHome, 'download.tar.gz')
    const decompress = require('decompress')
    this.logger.log(`Downloading ${serverDownloadUrl} to ${localFileName}`);
    return this.fileExists(serverHome)
      .then(doesExist => { if (!doesExist) fs.mkdirSync(serverHome) })
      .then(() => DownloadFile(serverDownloadUrl, localFileName, (bytesDone, percent) => this.updateStatusBar(`downloading ${percent}%`), serverDownloadSize))
      .then(() => this.updateStatusBar('unpacking'))
      .then(() => decompress(localFileName, serverHome))
      .then(() => this.fileExists(path.join(serverHome, serverLauncher)))
      .then(doesExist => { if (!doesExist) throw Error(`Failed to install the ${this.getServerName()} language server`) })
      .then(() => this.updateStatusBar('installed'))
      .then(() => fs.unlinkSync(localFileName))
  }

  preInitialization(connection) {
    connection.onCustom('language/status', (e) => this.updateStatusBar(`${e.type.replace(/^Started$/, '')} ${e.message}`))
    connection.onCustom('language/actionableNotification', this.actionableNotification.bind(this))
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

    const onActionableButton = (event, commandName) => {
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

module.exports = new JavaLanguageClient()
