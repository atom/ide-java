import * as cp from 'child_process';
import * as path from 'path';
import * as glob from 'glob';
import {AutoBridge} from 'atom-languageclient';

export default class JavaLanguageServer extends AutoBridge {
  name = 'Java (Eclipse JDT)';
  grammarScopes = ['source.java'];

  async startServerProcess() {
    const config = { 'win32': 'win', 'darwin': 'mac', 'linux': 'linux' }[process.platform];
    if (config == null) {
      throw `${this.name} not supported on ${process.platform}`;
    }

    const serverHome = path.join(__dirname, '..', 'server');
    const command = 'java';
    const args = [
      '-jar', this._getLauncherPath(serverHome),
      '-configuration', path.join(serverHome, `config_${config}`)
    ];

    this._log(`starting "${command} ${args.join(' ')}"`);
    return await cp.spawn(command, args, { cwd: serverHome });
  }

  _getLauncherPath(serverHome) {
    const globPath = '**/plugins/org.eclipse.equinox.launcher_*.jar';
	  const launchers = glob.sync(globPath, { cwd: serverHome });
    if (launchers.length === 0) {
        throw `could not find language server entry point with ${globPath}`;
    }
    if (launchers.length > 1) {
        throw `found multiple language server entry points with ${globPath}`;
    }
    return launchers[0];
  }
}
