'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _child_process = require('child_process');

var cp = _interopRequireWildcard(_child_process);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _glob = require('glob');

var glob = _interopRequireWildcard(_glob);

var _atom = require('atom');

var _atomLanguageclient = require('atom-languageclient');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

let JavaLanguageServer = class JavaLanguageServer {
  constructor() {
    this._pathMatch = /^.+\.java$/;
    this.name = 'Java (Eclipse JDT)';
    this.grammarScopes = ['source.java'];
    this._configMap = {
      'win32': 'win',
      'darwin': 'mac',
      'linux': 'linux'
    };
  }

  activate() {
    this._subscriptions = new _atom.CompositeDisposable();
    this._subscriptions.add(atom.workspace.observeTextEditors(e => this.startOrStopServer()));
  }

  startOrStopServer() {
    var _this = this;

    return _asyncToGenerator(function* () {
      // TODO: Replace this with something that uses public APIs and gets called when things go away so it
      // can actually stop the server.   Stopping might want to be on a timer after the last close.
      for (let buffer of atom.project.buffers) {
        if (buffer.file != null && _this._pathMatch.test(buffer.file.path)) {
          return _this.startServer();
        }
      }
      return _this.stopServer();
    })();
  }

  startServer() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (_this2._server != null) return;

      const config = _this2._configMap[process.platform];
      if (config == null) {
        _this2._log(`not supported on ${process.platform}`);
        return;
      }

      const serverHome = path.join(__dirname, '..', 'server');
      const launcherPath = _this2._getLauncherPath(serverHome);
      if (launcherPath == null) return;

      const command = 'java';
      const args = ['-jar', launcherPath, '-configuration', path.join(serverHome, `config_${config}`)];

      _this2._log(`starting "${command} ${args.join(' ')}"`);
      _this2._process = cp.spawn(command, args, { cwd: serverHome });
      _this2._server = new _atomLanguageclient.RunningServerV2(_this2.name, _this2._process);

      yield _this2._server.start(_this2._getInitializeParams());
    })();
  }

  deactivate() {
    this._subscriptions.dispose();
  }

  stopServer() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (_this3._server != null) {
        _this3._log('stopping');
        yield _this3._server.shutdown();
        _this3._server = null;
        _this3._process.kill();
      };
    })();
  }

  provideOutlines() {
    return {
      name: this.name,
      grammarScopes: this.grammarScopes,
      priority: 1,
      getOutline: this.getOutline.bind(this)
    };
  }

  getOutline(editor) {
    if (this._server == null || this._server.symbolProvider == null) return Promise.resolve(null);
    return this._server.symbolProvider.getOutline(editor);
  }

  provideLinter() {
    return {
      name: this.name,
      scope: 'project',
      lintOnFly: true,
      grammarScopes: this.grammarScopes,
      lint: this.provideLinting.bind(this)
    };
  }

  provideLinting(editor) {
    return this._server && this._server.linter ? this._server.linter.provideDiagnostics() : Promise.resolve([]);
  }

  provideAutocomplete() {
    return {
      selector: '.source',
      excludeLowerPriority: false,
      getSuggestions: this.provideSuggestions.bind(this)
    };
  }

  provideSuggestions(request) {
    return this._server && this._server.autoComplete ? this._server.autoComplete.provideSuggestions(request) : Promise.resolve([]);
  }

  _getInitializeParams() {
    const rootDirs = atom.project.getDirectories();

    return {
      processId: process.pid,
      capabilities: {},
      rootPath: rootDirs.length > 0 ? rootDirs[0].path : null
    };
  }

  _log(message) {
    console.log(`${this.name} ${message}`);
  }

  _getLauncherPath(serverHome) {
    const globPath = '**/plugins/org.eclipse.equinox.launcher_*.jar';
    const launchers = glob.sync(globPath, { cwd: serverHome });
    if (launchers.length === 0) {
      this._log(`could not find language server entry point with ${globPath}`);
      return null;
    }
    if (launchers.length > 1) {
      this._log(`found multiple language server entry points with ${globPath}`);
      return null;
    }
    return launchers[0];
  }
};
exports.default = JavaLanguageServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi9qYXZhLWxhbmd1YWdlLXNlcnZlci5qcyJdLCJuYW1lcyI6WyJjcCIsImZzIiwicGF0aCIsImdsb2IiLCJKYXZhTGFuZ3VhZ2VTZXJ2ZXIiLCJfcGF0aE1hdGNoIiwibmFtZSIsImdyYW1tYXJTY29wZXMiLCJfY29uZmlnTWFwIiwiYWN0aXZhdGUiLCJfc3Vic2NyaXB0aW9ucyIsImFkZCIsImF0b20iLCJ3b3Jrc3BhY2UiLCJvYnNlcnZlVGV4dEVkaXRvcnMiLCJlIiwic3RhcnRPclN0b3BTZXJ2ZXIiLCJidWZmZXIiLCJwcm9qZWN0IiwiYnVmZmVycyIsImZpbGUiLCJ0ZXN0Iiwic3RhcnRTZXJ2ZXIiLCJzdG9wU2VydmVyIiwiX3NlcnZlciIsImNvbmZpZyIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsIl9sb2ciLCJzZXJ2ZXJIb21lIiwiam9pbiIsIl9fZGlybmFtZSIsImxhdW5jaGVyUGF0aCIsIl9nZXRMYXVuY2hlclBhdGgiLCJjb21tYW5kIiwiYXJncyIsIl9wcm9jZXNzIiwic3Bhd24iLCJjd2QiLCJzdGFydCIsIl9nZXRJbml0aWFsaXplUGFyYW1zIiwiZGVhY3RpdmF0ZSIsImRpc3Bvc2UiLCJzaHV0ZG93biIsImtpbGwiLCJwcm92aWRlT3V0bGluZXMiLCJwcmlvcml0eSIsImdldE91dGxpbmUiLCJiaW5kIiwiZWRpdG9yIiwic3ltYm9sUHJvdmlkZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInByb3ZpZGVMaW50ZXIiLCJzY29wZSIsImxpbnRPbkZseSIsImxpbnQiLCJwcm92aWRlTGludGluZyIsImxpbnRlciIsInByb3ZpZGVEaWFnbm9zdGljcyIsInByb3ZpZGVBdXRvY29tcGxldGUiLCJzZWxlY3RvciIsImV4Y2x1ZGVMb3dlclByaW9yaXR5IiwiZ2V0U3VnZ2VzdGlvbnMiLCJwcm92aWRlU3VnZ2VzdGlvbnMiLCJyZXF1ZXN0IiwiYXV0b0NvbXBsZXRlIiwicm9vdERpcnMiLCJnZXREaXJlY3RvcmllcyIsInByb2Nlc3NJZCIsInBpZCIsImNhcGFiaWxpdGllcyIsInJvb3RQYXRoIiwibGVuZ3RoIiwibWVzc2FnZSIsImNvbnNvbGUiLCJsb2ciLCJnbG9iUGF0aCIsImxhdW5jaGVycyIsInN5bmMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQTs7SUFBWUEsRTs7QUFDWjs7SUFBWUMsRTs7QUFDWjs7SUFBWUMsSTs7QUFDWjs7SUFBWUMsSTs7QUFFWjs7QUFDQTs7Ozs7O0lBSXFCQyxrQixHQUFOLE1BQU1BLGtCQUFOLENBQXlCO0FBQUE7QUFBQSxTQUl0Q0MsVUFKc0MsR0FJekIsWUFKeUI7QUFBQSxTQU10Q0MsSUFOc0MsR0FNL0Isb0JBTitCO0FBQUEsU0FPdENDLGFBUHNDLEdBT3RCLENBQUMsYUFBRCxDQVBzQjtBQUFBLFNBc0h0Q0MsVUF0SHNDLEdBc0h6QjtBQUNYLGVBQVMsS0FERTtBQUVYLGdCQUFVLEtBRkM7QUFHWCxlQUFTO0FBSEUsS0F0SHlCO0FBQUE7O0FBU3RDQyxhQUFpQjtBQUNmLFNBQUtDLGNBQUwsR0FBc0IsK0JBQXRCO0FBQ0EsU0FBS0EsY0FBTCxDQUFvQkMsR0FBcEIsQ0FBd0JDLEtBQUtDLFNBQUwsQ0FBZUMsa0JBQWYsQ0FBbUNDLENBQUQsSUFBTyxLQUFLQyxpQkFBTCxFQUF6QyxDQUF4QjtBQUNEOztBQUVLQSxtQkFBTixHQUF5QztBQUFBOztBQUFBO0FBQ3ZDO0FBQ0E7QUFDQSxXQUFLLElBQUlDLE1BQVQsSUFBbUJMLEtBQUtNLE9BQUwsQ0FBYUMsT0FBaEMsRUFBeUM7QUFDdkMsWUFBSUYsT0FBT0csSUFBUCxJQUFlLElBQWYsSUFBdUIsTUFBS2YsVUFBTCxDQUFnQmdCLElBQWhCLENBQXFCSixPQUFPRyxJQUFQLENBQVlsQixJQUFqQyxDQUEzQixFQUFtRTtBQUNqRSxpQkFBTyxNQUFLb0IsV0FBTCxFQUFQO0FBQ0Q7QUFDRjtBQUNELGFBQU8sTUFBS0MsVUFBTCxFQUFQO0FBUnVDO0FBU3hDOztBQUVLRCxhQUFOLEdBQW1DO0FBQUE7O0FBQUE7QUFDakMsVUFBSSxPQUFLRSxPQUFMLElB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RSxrQiIsImZpbGUiOiJqYXZhLWxhbmd1YWdlLXNlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEBmbG93XHJcblxyXG5pbXBvcnQgKiBhcyBjcCBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBnbG9iIGZyb20gJ2dsb2InO1xyXG5cclxuaW1wb3J0IHtDb21wb3NpdGVEaXNwb3NhYmxlfSBmcm9tICdhdG9tJztcclxuaW1wb3J0IHtDb252ZXJ0fSBmcm9tICdhdG9tLWxhbmd1YWdlY2xpZW50JztcclxuaW1wb3J0IHtMYW5ndWFnZUNsaWVudFYyIGFzIGxzfSBmcm9tICdhdG9tLWxhbmd1YWdlY2xpZW50JztcclxuaW1wb3J0IHtSdW5uaW5nU2VydmVyVjJ9IGZyb20gJ2F0b20tbGFuZ3VhZ2VjbGllbnQnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSmF2YUxhbmd1YWdlU2VydmVyIHtcclxuICBfc3Vic2NyaXB0aW9uczogYXRvbSRDb21wb3NpdGVEaXNwb3NhYmxlO1xyXG4gIF9wcm9jZXNzOiBjaGlsZF9wcm9jZXNzJENoaWxkUHJvY2VzcztcclxuICBfc2VydmVyOiBSdW5uaW5nU2VydmVyVjI7XHJcbiAgX3BhdGhNYXRjaCA9IC9eLitcXC5qYXZhJC87XHJcblxyXG4gIG5hbWUgPSAnSmF2YSAoRWNsaXBzZSBKRFQpJztcclxuICBncmFtbWFyU2NvcGVzID0gWydzb3VyY2UuamF2YSddO1xyXG5cclxuICBhY3RpdmF0ZSgpOiB2b2lkIHtcclxuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xyXG4gICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKChlKSA9PiB0aGlzLnN0YXJ0T3JTdG9wU2VydmVyKCkpKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHN0YXJ0T3JTdG9wU2VydmVyKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gVE9ETzogUmVwbGFjZSB0aGlzIHdpdGggc29tZXRoaW5nIHRoYXQgdXNlcyBwdWJsaWMgQVBJcyBhbmQgZ2V0cyBjYWxsZWQgd2hlbiB0aGluZ3MgZ28gYXdheSBzbyBpdFxyXG4gICAgLy8gY2FuIGFjdHVhbGx5IHN0b3AgdGhlIHNlcnZlci4gICBTdG9wcGluZyBtaWdodCB3YW50IHRvIGJlIG9uIGEgdGltZXIgYWZ0ZXIgdGhlIGxhc3QgY2xvc2UuXHJcbiAgICBmb3IgKGxldCBidWZmZXIgb2YgYXRvbS5wcm9qZWN0LmJ1ZmZlcnMpIHtcclxuICAgICAgaWYgKGJ1ZmZlci5maWxlICE9IG51bGwgJiYgdGhpcy5fcGF0aE1hdGNoLnRlc3QoYnVmZmVyLmZpbGUucGF0aCkpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zdGFydFNlcnZlcigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5zdG9wU2VydmVyKCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzdGFydFNlcnZlcigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICh0aGlzLl9zZXJ2ZXIgIT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IGNvbmZpZzogc3RyaW5nID0gdGhpcy5fY29uZmlnTWFwW3Byb2Nlc3MucGxhdGZvcm1dO1xyXG4gICAgaWYgKGNvbmZpZyA9PSBudWxsKSB7XHJcbiAgICAgIHRoaXMuX2xvZyhgbm90IHN1cHBvcnRlZCBvbiAke3Byb2Nlc3MucGxhdGZvcm19YCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzZXJ2ZXJIb21lOiBzdHJpbmcgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnc2VydmVyJyk7XHJcbiAgICBjb25zdCBsYXVuY2hlclBhdGg6ID9zdHJpbmcgPSB0aGlzLl9nZXRMYXVuY2hlclBhdGgoc2VydmVySG9tZSk7XHJcbiAgICBpZiAobGF1bmNoZXJQYXRoID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gJ2phdmEnO1xyXG4gICAgY29uc3QgYXJncyA9IFtcclxuICAgICAgJy1qYXInLCBsYXVuY2hlclBhdGgsXHJcbiAgICAgICctY29uZmlndXJhdGlvbicsIHBhdGguam9pbihzZXJ2ZXJIb21lLCBgY29uZmlnXyR7Y29uZmlnfWApXHJcbiAgICBdO1xyXG5cclxuICAgIHRoaXMuX2xvZyhgc3RhcnRpbmcgXCIke2NvbW1hbmR9ICR7YXJncy5qb2luKCcgJyl9XCJgKTtcclxuICAgIHRoaXMuX3Byb2Nlc3MgPSBjcC5zcGF3bihjb21tYW5kLCBhcmdzLCB7IGN3ZDogc2VydmVySG9tZSB9KTtcclxuICAgIHRoaXMuX3NlcnZlciA9IG5ldyBSdW5uaW5nU2VydmVyVjIodGhpcy5uYW1lLCB0aGlzLl9wcm9jZXNzKTtcclxuXHJcbiAgICBhd2FpdCB0aGlzLl9zZXJ2ZXIuc3RhcnQodGhpcy5fZ2V0SW5pdGlhbGl6ZVBhcmFtcygpKTtcclxuICB9XHJcblxyXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHN0b3BTZXJ2ZXIoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAodGhpcy5fc2VydmVyICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5fbG9nKCdzdG9wcGluZycpO1xyXG4gICAgICBhd2FpdCB0aGlzLl9zZXJ2ZXIuc2h1dGRvd24oKTtcclxuICAgICAgdGhpcy5fc2VydmVyID0gbnVsbDtcclxuICAgICAgdGhpcy5fcHJvY2Vzcy5raWxsKCk7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJvdmlkZU91dGxpbmVzKCk6IG51Y2xpZGUkT3V0bGluZVByb3ZpZGVyIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcclxuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5ncmFtbWFyU2NvcGVzLFxyXG4gICAgICBwcmlvcml0eTogMSxcclxuICAgICAgZ2V0T3V0bGluZTogdGhpcy5nZXRPdXRsaW5lLmJpbmQodGhpcylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldE91dGxpbmUoZWRpdG9yOiBhdG9tJFRleHRFZGl0b3IpOiBQcm9taXNlPD9udWNsaWRlJE91dGxpbmU+IHtcclxuICAgIGlmICh0aGlzLl9zZXJ2ZXIgPT0gbnVsbCB8fCB0aGlzLl9zZXJ2ZXIuc3ltYm9sUHJvdmlkZXIgPT0gbnVsbCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcclxuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXIuc3ltYm9sUHJvdmlkZXIuZ2V0T3V0bGluZShlZGl0b3IpO1xyXG4gIH1cclxuXHJcbiAgcHJvdmlkZUxpbnRlcigpOiBsaW50ZXIkU3RhbmRhcmRMaW50ZXIge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxyXG4gICAgICBzY29wZTogJ3Byb2plY3QnLFxyXG4gICAgICBsaW50T25GbHk6IHRydWUsXHJcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ3JhbW1hclNjb3BlcyxcclxuICAgICAgbGludDogdGhpcy5wcm92aWRlTGludGluZy5iaW5kKHRoaXMpXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJvdmlkZUxpbnRpbmcoZWRpdG9yOiBhdG9tJFRleHRFZGl0b3IpOiA/QXJyYXk8bGludGVyJE1lc3NhZ2U+IHwgUHJvbWlzZTw/QXJyYXk8bGludGVyJE1lc3NhZ2U+PiB7XHJcbiAgICByZXR1cm4gdGhpcy5fc2VydmVyICYmIHRoaXMuX3NlcnZlci5saW50ZXIgPyB0aGlzLl9zZXJ2ZXIubGludGVyLnByb3ZpZGVEaWFnbm9zdGljcygpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcclxuICB9XHJcblxyXG4gIHByb3ZpZGVBdXRvY29tcGxldGUoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZWxlY3RvcjogJy5zb3VyY2UnLFxyXG4gICAgICBleGNsdWRlTG93ZXJQcmlvcml0eTogZmFsc2UsXHJcbiAgICAgIGdldFN1Z2dlc3Rpb25zOiB0aGlzLnByb3ZpZGVTdWdnZXN0aW9ucy5iaW5kKHRoaXMpLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByb3ZpZGVTdWdnZXN0aW9ucyhyZXF1ZXN0OiBhbnkpOiBQcm9taXNlPEFycmF5PGF0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbj4+IHtcclxuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXIgJiYgdGhpcy5fc2VydmVyLmF1dG9Db21wbGV0ZSA/IHRoaXMuX3NlcnZlci5hdXRvQ29tcGxldGUucHJvdmlkZVN1Z2dlc3Rpb25zKHJlcXVlc3QpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcclxuICB9XHJcblxyXG4gIF9nZXRJbml0aWFsaXplUGFyYW1zKCk6IGxzLkluaXRpYWxpemVQYXJhbXMge1xyXG4gICAgY29uc3Qgcm9vdERpcnM6IEFycmF5PGFueT4gPSBhdG9tLnByb2plY3QuZ2V0RGlyZWN0b3JpZXMoKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBwcm9jZXNzSWQ6IHByb2Nlc3MucGlkLFxyXG4gICAgICBjYXBhYmlsaXRpZXM6IHsgfSxcclxuICAgICAgcm9vdFBhdGg6IHJvb3REaXJzLmxlbmd0aCA+IDAgPyByb290RGlyc1swXS5wYXRoIDogbnVsbFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgX2xvZyhtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKGAke3RoaXMubmFtZX0gJHttZXNzYWdlfWApO1xyXG4gIH1cclxuXHJcbiAgX2NvbmZpZ01hcCA9IHtcclxuICAgICd3aW4zMic6ICd3aW4nLFxyXG4gICAgJ2Rhcndpbic6ICdtYWMnLFxyXG4gICAgJ2xpbnV4JzogJ2xpbnV4J1xyXG4gIH1cclxuXHJcbiAgX2dldExhdW5jaGVyUGF0aChzZXJ2ZXJIb21lOiBzdHJpbmcpOiA/c3RyaW5nIHtcclxuICAgIGNvbnN0IGdsb2JQYXRoOiBzdHJpbmcgPSAnKiovcGx1Z2lucy9vcmcuZWNsaXBzZS5lcXVpbm94LmxhdW5jaGVyXyouamFyJztcclxuXHQgIGNvbnN0IGxhdW5jaGVyczogQXJyYXk8c3RyaW5nPiA9IGdsb2Iuc3luYyhnbG9iUGF0aCwgeyBjd2Q6IHNlcnZlckhvbWUgfSk7XHJcbiAgICBpZiAobGF1bmNoZXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHRoaXMuX2xvZyhgY291bGQgbm90IGZpbmQgbGFuZ3VhZ2Ugc2VydmVyIGVudHJ5IHBvaW50IHdpdGggJHtnbG9iUGF0aH1gKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIGlmIChsYXVuY2hlcnMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIHRoaXMuX2xvZyhgZm91bmQgbXVsdGlwbGUgbGFuZ3VhZ2Ugc2VydmVyIGVudHJ5IHBvaW50cyB3aXRoICR7Z2xvYlBhdGh9YCk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGF1bmNoZXJzWzBdO1xyXG4gIH1cclxufVxyXG4iXX0=