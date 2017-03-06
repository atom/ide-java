const cp = require('child_process');
const path = require('path');
const glob = require('glob');
const {AutoLanguageClient} = require('atom-languageclient');

class JavaLanguageServer extends AutoLanguageClient {
  getGrammarScopes() { return [ 'source.java' ]; }
  getName() { return 'Java (Eclipse JDT)'; }

  constructor() {
    super();
    this.statusElement = document.createElement('span');
    this.statusElement.className = 'inline-block';

    // TODO: Replace this with a workspace configuration system
    this.ignoreIncompleteClasspath = false;
    this.commands = {
      'java.ignoreIncompleteClasspath': () => { this.ignoreIncompleteClasspath = true }
    }
  }

  startServerProcess() {
    const config = { 'win32': 'win', 'darwin': 'mac', 'linux': 'linux' }[process.platform];
    if (config == null) {
      throw `${this.getName()} not supported on ${process.platform}`;
    }

    const serverHome = path.join(__dirname, '..', 'server');
    const command = 'java';
    const args = [
      '-jar', this.getOrInstallLauncher(serverHome),
      '-configuration', path.join(serverHome, `config_${config}`)
    ];

    this.logger.debug(`starting "${command} ${args.join(' ')}"`);
    return cp.spawn(command, args, { cwd: serverHome });
  }

  getOrInstallLauncher(serverHome) {
    let launchers = this.getLaunchers(serverHome);
    if (launchers.length < 1) {
      installLauncher('http://download.eclipse.org/jdtls/snapshots/jdt-language-server-0.1.0-201702132114.tar.gz', serverHome);
      launchers = this.getLaunchers(serverHome);
      if (launchers.length < 1) {
        throw `${this.getName()} failed to install language server runtime`;
      }
    }

    return launchers[0];
  }

  getLaunchers(serverHome) {
	  return glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', { cwd: serverHome });
  }

  installLauncher(url, serverHome) {
    // TODO: Wire up
  }

  postInitialization(InitializationResult) {
    this._lc.onCustom('language/status', (e) => this.statusElement.textContent = `${this.getName()} ${e.type.replace(/^Started$/, '')} ${e.message}`);
    this._lc.onCustom('language/actionableNotification', this.actionableNotification.bind(this));
  }

  actionableNotification(notification) {
    // Temporary until we have workspace configuration
    if (this.ignoreIncompleteClasspath && notification.message.includes('Classpath is incomplete')) return;

    const options = { dismissable: true, detail: this.getName() };
    if (Array.isArray(notification.commands)) {
      options.buttons = notification.commands.map(c => ({ text: c.title, onDidClick: (e) => this.onActionableButton(e, c.command) }));
      // TODO: Deal with the actions
    }
    switch(notification.severity) {
      case 1: return atom.notifications.addError(notification.message, options);
      case 2: return atom.notifications.addWarning(notification.message, options);
      case 3: return atom.notifications.addInfo(notification.message, options);
      case 4: console.log(notification.message);
    }
  }

  onActionableButton(event, commandName) {
    // TODO: Seriously should be a better way than this - docs lacking
    const notification = event.path.find(p => p.model && p.model.dismiss).model;

    const commandFunction = this.commands[commandName];
    if (commandFunction != null) {
      commandFunction();
    } else {
      console.log(`Unknown actionableNotification command '${commandName}'`);
    }

    notification.dismiss();
  }

  consumeStatusBar(statusBar) {
    this.statusTile = statusBar.addRightTile({ item: this.statusElement, priority: 1000 });
  }
}

module.exports = new JavaLanguageServer();
