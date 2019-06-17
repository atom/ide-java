const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {shell} = require('electron')
const {AutoLanguageClient, DownloadFile} = require('atom-languageclient')

const {actionProviderComposer, actionProviders} = require('./providers')
const {
  autoImportProvider,
  removeUnusedImportProvider
} = actionProviders

const serverDownloadUrl = 'http://download.eclipse.org/jdtls/milestones/0.39.0/jdt-language-server-0.39.0-201905150127.tar.gz'
const serverDownloadSize = 39070941
const serverLauncher = '/plugins/org.eclipse.equinox.launcher_1.5.300.v20190213-1655.jar'
const minJavaRuntime = 1.8
const bytesToMegabytes = 1024 * 1024

class JavaLanguageClient extends AutoLanguageClient {
  getGrammarScopes () { return [ 'source.java' ] }
  getLanguageName () { return 'Java' }
  getServerName () { return 'Eclipse JDT' }
  // List of preferences available at:
  // https://github.com/eclipse/eclipse.jdt.ls/blob/master/org.eclipse.jdt.ls.core/src/org/eclipse/jdt/ls/core/internal/preferences/Preferences.java
  getRootConfigurationKey() { return 'ide-java.server' }
  mapConfigurationObject(configuration) { return {java: configuration} }

  constructor () {
    super()
    this.statusElement = document.createElement('span')
    this.statusElement.className = 'inline-block'

    this.commands = {
      'java.ignoreIncompleteClasspath': () => {
        atom.config.set('ide-java.server.errors.incompleteClasspath.severity', 'ignore')
      },
      'java.ignoreIncompleteClasspath.help': () => { shell.openExternal('https://github.com/atom/ide-java/wiki/Incomplete-Classpath-Warning') },
      'java.projectConfiguration.status': (command, connection) => {
        // Arguments:
        // - 0: Object containing build file URI
        // - 1: 'disabled' for Never, 'interactive' for Now, 'automatic' for Always
        const [uri, status] = command.arguments
        const statusMap = {
          0: 'disabled',
          1: 'interactive',
          2: 'automatic',
        }
        atom.config.set('ide-java.server.configuration.updateBuildConfiguration', statusMap[status])

        if (status !== 0) {
          connection.sendCustomRequest('java/projectConfigurationUpdate', uri)
        }
      }
    }

    // Migrate ide-java.errors.incompleteClasspathSeverity -> ide-java.server.errors.incompleteClasspath.severity
    // Migration added in v0.10.0; feel free to remove after a few versions
    const severity = atom.config.get('ide-java.errors.incompleteClasspathSeverity')
    if (severity) {
      atom.config.unset('ide-java.errors.incompleteClasspathSeverity')
      atom.config.unset('ide-java.errors')
      atom.config.set('ide-java.server.errors.incompleteClasspath.severity', severity)
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
        childProcess.on('close', exitCode => {
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
      childProcess.on('close', exitCode => {
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
    const match = output.match(/ version "(\d+(.\d+)?)(.\d+)?(_\d+)?(?:-\w+)?"/)
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
      .then(exists => { if (!exists) fs.mkdirSync(dataDir, { recursive: true }) })
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
    const provideInstallStatus = (bytesDone, percent) => {
      this.updateInstallStatus(`downloading ${Math.floor(serverDownloadSize / bytesToMegabytes)} MB (${percent}% done)`)
    }
    return this.fileExists(serverHome)
      .then(doesExist => { if (!doesExist) fs.mkdirSync(serverHome, { recursive: true }) })
      .then(() => DownloadFile(serverDownloadUrl, localFileName, provideInstallStatus, serverDownloadSize))
      .then(() => this.updateInstallStatus('unpacking'))
      .then(() => decompress(localFileName, serverHome))
      .then(() => this.fileExists(path.join(serverHome, serverLauncher)))
      .then(doesExist => { if (!doesExist) throw Error(`Failed to install the ${this.getServerName()} language server`) })
      .then(() => this.updateInstallStatus('installed'))
      .then(() => fs.unlinkSync(localFileName))
  }

  preInitialization(connection) {
    let started = false
    connection.onCustom('language/status', (status) => {
      if (started) return
      this.updateStatusBar(status.message)
      // Additional messages can be generated after the server is ready
      // that we don't want to show (for example, build refreshes)
      if (status.type === 'Started') {
        started = true
      }
    })
    connection.onCustom('language/actionableNotification', (notification) => this.actionableNotification(notification, connection))
  }

  getInitializeParams(projectPath, process) {
    const params = super.getInitializeParams(projectPath, process);
    if (!params.initializationOptions) {
      params.initializationOptions = {};
    }
    params.initializationOptions.bundles = this.collectJavaExtensions();
    return params;
  }

  collectJavaExtensions() {
    return atom.packages.getLoadedPackages()
        .filter(pkg => Array.isArray(pkg.metadata.javaExtensions))
        .map(pkg => pkg.metadata.javaExtensions.map(p => path.resolve(pkg.path, p)))
        .reduce(e => e.concat([]), []);
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

  actionableNotification (notification, connection) {
    const options = { dismissable: true, detail: this.getServerName() }
    if (Array.isArray(notification.commands)) {
      options.buttons = notification.commands.map(command => ({
        text: command.title,
        onDidClick: () => onActionableButton(command)
      }))
    }

    const notificationDialog = this.createNotification(notification.severity, notification.message, options)

    const onActionableButton = (command) => {
      const commandFunction = this.commands[command.command]
      if (commandFunction != null) {
        commandFunction(command, connection)
      } else {
        console.log(`Unknown actionableNotification command '${command.command}'`)
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

  provideCodeActions() {
    return actionProviderComposer(
      this,
      autoImportProvider,
      removeUnusedImportProvider
    )
  }

  fileExists (path) {
    return new Promise(resolve => {
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
