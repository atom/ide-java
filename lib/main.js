const cp = require('child_process');
const path = require('path');
const glob = require('glob');
const {AutoBridge} = require('atom-languageclient');

class JavaLanguageServer extends AutoBridge {
  getGrammarScopes() { return [ 'source.java' ]; }
  getName() { return 'Java (Eclipse JDT)'; }

  constructor() {
    super();
    this.statusElement = document.createElement('span');
    this.statusElement.className = 'inline-block';
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

    this.log(`starting "${command} ${args.join(' ')}"`);
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
    this._lc.onCustom('language/status', (e) => this.updateStatus(`${this.getName()} ${e.type.replace(/^Started$/, '')} ${e.message}`));
  }

  updateStatus(statusText) {
    this.statusElement.textContent = statusText;
  }

  consumeStatusBar(statusBar) {
    this.statusTile = statusBar.addRightTile({ item: this.statusElement, priority: 1000 });
  }
}

module.exports = new JavaLanguageServer();
