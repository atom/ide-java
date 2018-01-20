const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {shell} = require('electron')
const {AutoLanguageClient, DownloadFile} = require('atom-languageclient')

const serverDownloadUrl = 'http://download.eclipse.org/jdtls/milestones/0.11.0/jdt-language-server-0.11.0-201801162212.tar.gz'
const serverDownloadSize = 34931365
const serverLauncher = '/plugins/org.eclipse.equinox.launcher_1.4.0.v20161219-1356.jar'
const minJavaRuntime = 1.8
const bytesToMegabytes = 1024 * 1024

class JavaLanguageClient extends AutoLanguageClient {
  getGrammarScopes () { return [ 'source.java' ] }
  getLanguageName () { return 'Java' }
  getServerName () { return 'Eclipse JDT' }

  constructor () {
    super()
    this.statusElement = document.createElement('span')
    this.statusElement.className = 'inline-block'

    this.commands = {
      'java.ignoreIncompleteClasspath': () => { atom.config.set('ide-java.errors.incompleteClasspathSeverity', 'ignore') },
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
    let javaVersion

    return this.checkJavaVersion(command)
      .then(foundJavaVersion => {
        javaVersion = foundJavaVersion
        return this.installServerIfRequired(serverHome)
      })
      .then(() => this.getOrCreateDataDir(projectPath))
      .then(dataDir => {
        const args = []
        if (javaVersion >= 9) {
          args.push(
            '--add-modules=ALL-SYSTEM',
      		  '--add-opens', 'java.base/java.util=ALL-UNNAMED',
      		  '--add-opens', 'java.base/java.lang=ALL-UNNAMED'
          )
        }

        const extraArgs = this.parseArgs(atom.config.get('ide-java.virtualMachine.extraArgs'))
        args.push(...extraArgs)

        args.push(
          '-jar', path.join(serverHome, serverLauncher),
          '-configuration', path.join(serverHome, `config_${config}`),
          '-data', dataDir
        )

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
        this.showJavaRequirements(
          'IDE-Java could not launch your Java runtime.',
          err.code == 'ENOENT'
            ? `No Java runtime found at <b>${command}</b>.`
            : `Could not spawn the Java runtime <b>${command}</b>.`
        )
        reject()
      })
      let stdErr = '', stdOut = ''
      childProcess.stderr.on('data', chunk => stdErr += chunk.toString())
      childProcess.stdout.on('data', chunk => stdOut += chunk.toString())
      childProcess.on('exit', exitCode => {
        const output = stdErr + '\n' + stdOut
        if (exitCode === 0 && output.length > 2) {
          const version = this.getJavaVersionFromOutput(output)
          if (version == null) {
            this.showJavaRequirements(
              `IDE-Java requires Java ${minJavaRuntime} but could not determine your Java version.`,
              `Could not parse the Java '--showVersion' output <pre>${output}</pre>.`
            )
            reject()
          }
          if (version >= minJavaRuntime) {
            this.logger.debug(`Using Java ${version} from ${command}`)
            resolve(version)
          } else {
            this.showJavaRequirements(
              `IDE-Java requires Java ${minJavaRuntime} or later but found ${version}`,
              `If you have Java ${minJavaRuntime} installed please Set Java Path correctly. If you do not please Download Java ${minJavaRuntime} or later and install it.`
            )
            reject()
          }
        } else {
          atom.notifications.addError('IDE-Java encounted an error using the Java runtime.', {
            dismissable: true,
            description: stdErr != '' ? `<code>${stdErr}</code>` : `Exit code ${exitCode}`
          })
          reject()
        }
      })
    })
  }

  getJavaVersionFromOutput (output) {
    const match = output.match(/ version "(\d+(.\d+)?)(.\d+)?(_\d+)?"/)
    return match != null && match.length > 0 ? Number(match[1]) : null
  }

  showJavaRequirements (title, description) {
    atom.notifications.addError(title, {
      dismissable: true,
      buttons: [
        { text: 'Set Java Path', onDidClick: () => atom.workspace.open('atom://config/packages/ide-java') },
        { text: 'Download Java', onDidClick: () => shell.openExternal('http://www.oracle.com/technetwork/java/javase/downloads/index.html') },
      ],
      description: `${description}<p>If you have Java installed please Set Java Path correctly. If you do not please Download Java ${minJavaRuntime} or later and install it.</p>`
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
    return this.fileExists(serverHome)
      .then(doesExist => { if (!doesExist) fs.mkdirSync(serverHome) })
      .then(() => DownloadFile(serverDownloadUrl, localFileName, (bytesDone, percent) => this.updateInstallStatus(`downloading ${Math.floor(serverDownloadSize / bytesToMegabytes)} MB (${percent}% done)`), serverDownloadSize))
      .then(() => this.updateInstallStatus('unpacking'))
      .then(() => decompress(localFileName, serverHome))
      .then(() => this.fileExists(path.join(serverHome, serverLauncher)))
      .then(doesExist => { if (!doesExist) throw Error(`Failed to install the ${this.getServerName()} language server`) })
      .then(() => this.updateInstallStatus('installed'))
      .then(() => fs.unlinkSync(localFileName))
  }

  preInitialization(connection) {
    connection.onCustom('language/status', (e) => this.updateStatusBar(`${e.type.replace(/^Started$/, '')} ${e.message}`))
    connection.onCustom('language/actionableNotification', this.actionableNotification.bind(this))
  }

  updateInstallStatus (status) {
    const isComplete = status === 'installed'
    if (this.busySignalService) {
      if (this._installSignal == null) {
        if (!isComplete) {
          this._installSignal = this.busySignalService.reportBusy(status, { revealTooltip: true })
        }
      } else {
        if (isComplete) {
          this._installSignal.dispose()
        } else {
          this._installSignal.setTitle(status)
        }
      }
    } else {
      this.updateStatusBar(status)
    }
  }

  updateStatusBar (text) {
    this.statusElement.textContent = `${this.name} ${text}`
    if (!this.statusTile && this.statusBar) {
      this.statusTile = this.statusBar.addRightTile({ item: this.statusElement, priority: 1000 })
    }
  }

  actionableNotification (notification) {
    if (notification.message.startsWith('Classpath is incomplete.')) {
      switch(atom.config.get('ide-java.errors.incompleteClasspathSeverity')) {
        case 'ignore': return
        case 'error': {
          notification.severity = 1
          break
        }
        case 'warning': {
          notification.severity = 2
          break
        }
        case 'info': {
          notification.severity = 3
          break
        }
      }
    }

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
    this.statusBar = statusBar
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

  parseArgs(argsLine) {
  	if (!argsLine) return []

    // Split the args into an array based on whitespace outside of double-quotes
  	const args = argsLine.match(/(?:[^\s"]+|"[^"]*")+/g)
  	if (args === null) return []

    // Remove double quotes
  	return args.map(arg => arg.replace(/(\\)?"/g, (a, b) => a ? b : '').replace(/(\\)"/g, '"'))
  }
}

module.exports = new JavaLanguageClient()
