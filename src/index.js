const os = require('os');
const {SMTPChannel} = require('smtp-channel');
const promiseWithTimeout = require('promised-timeout').timeout;
const {SMTPResponseError} = require('./errors');

exports.SMTPClient = class extends SMTPChannel {

  /*
  * Class constructor.
  */

  constructor(config={}) {
    super(config);

    this._extensions = []; // SMTP server extensions
  }

  /*
  * Returns a Promise which connects to the SMTP server and starts socket
  * I/O activity. We can abort the operating after a certain number of
  * milliseconds by passing the optional `timeout` parameter.
  */

  connect({timeout=0}={}) {
    let lines = [];
    let handler = (line) => lines.push(line)

    return super.connect({timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the HELO command to the server. We can abort
  * the operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  helo({hostname=null, timeout=0}={}) {
    if (!hostname) hostname = this._getHostname();

    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `HELO ${hostname}\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the EHLO command to the server and collects
  * information about available SMTP server extensions. We can abort the
  * operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  ehlo({hostname=null, timeout=0}={}) {
    if (!hostname) hostname = this._getHostname();

    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `EHLO ${hostname}\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        this._extensions = lines.slice(1).map(l => this.parseReplyText(l));
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the EHLO command to the server or HELO command
  * if the EHLO isn't successful. We can abort the operating after a certain
  * number of milliseconds by passing the optional `timeout` parameter.
  */

  greet({hostname=null, timeout=0}={}) {
    return this.ehlo({hostname}).catch((e) => this.helo({hostname}));
  }

  /*
  * Returns `true` if the provided extension name is supporter by the remote
  * SMTP server.
  */

  hasExtension(extension) {
    return !!this._extensions.find(e => e.split(' ')[0] === extension);
  }

  /*
  * Returns an email size limit in bytes.
  */

  getDataSizeLimit() {
    let extension = this._extensions.find((e) => e.split(' ')[0] === 'SIZE');
    if (extension) {
      return parseInt(extension.split(' ')[1]);
    }
    else {
      return 0;
    }
  }

  /*
  * Returns a list of supported authentication mechanisms.
  */

  getAuthMechanisms() {
    let extension = this._extensions.find((e) => e.split(' ')[0] === 'AUTH');
    if (extension) {
      return extension.split(' ').filter((e) => !!e).map((e) => e.trim().toUpperCase()).slice(1);
    }
    else {
      return [];
    }
  }

  /*
  * Returns the enhanced reply code of the provided reply line.
  *
  * NOTES: According to the rfc2034 specification, the text part of all 2xx,
  * 4xx, and 5xx SMTP responses other than the initial greeting and any response
  * to HELO or EHLO are prefaced with a status code as defined in RFC 1893. This
  * status code is always followed by one or more spaces.
  */

  parseEnhancedReplyCode(line) {
    let isSupported = this.hasExtension('ENHANCEDSTATUSCODES');
    return isSupported ? line.substr(4).split(' ', 2)[0] : null;
  }

  /*
  * Returns the text part of a reply line.
  */

  parseReplyText(line) {
    let isSupported = this.hasExtension('ENHANCEDSTATUSCODES');
    if (isSupported) {
      return line.substr(4).split(/[\s](.+)?/, 2)[1];
    }
    else {
      return line.substr(4);
    }
  }

  /*
  * Returns a Promise which sends the MAIL command to the server. We can abort
  * the operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  mail({from=null, timeout=0, utf8=false}={}) {
    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `MAIL FROM:<${from}>\r\n`;
    if(utf8){
      if(!this.hasExtension("SMTPUTF8")){
        throw new Error("Server does not support UTF8 mailboxes");
      }
      command = `MAIL FROM:<${from}> SMTPUTF8\r\n`;
    }

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the RCPT command to the server. We can abort
  * the operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  rcpt({to=null, timeout=0}={}) {
    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `RCPT TO:<${to}>\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the NOOP command to the server. We can abort
  * the operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  noop({timeout=0}={}) {
    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `NOOP\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the RSET command to the server. We can abort
  * the operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  rset({timeout=0}={}) {
    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `RSET\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the QUIT command to the server. We can abort
  * the operating after a certain number of milliseconds by passing the optional
  * `timeout` parameter.
  */

  quit({timeout=0}={}) {
    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `QUIT\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the DATA command to the server, streams the
  * `source` to the server and finalize the process with the final `.` which
  * enqueue the email. We can abort the operating after a certain number of
  * milliseconds by passing the optional `timeout` parameter.
  */

  data(source, {sourceSize=0, timeout=0}={}) {
    let sizeLimit = this.getDataSizeLimit();
    if (sourceSize > sizeLimit) {
      throw new Error(`Message size exceeds the allowable limit (${sizeLimit} bytes)`);
    }

    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `DATA\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) !== '3') {
        throw this._createSMTPResponseError(lines);
      }
      else {
        lines = [];
        return this.write(`${source.replace(/^\./m,'..')}\r\n.\r\n`, {timeout, handler});
      }
    }).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the STARTTLS command to the server and
  * upgrades the connection to TLS. We can abort the operating after a certain
  * number of milliseconds by passing the optional `timeout` parameter.
  */

  secure({timeout=0}={}) {
    let isPossible = this.hasExtension('STARTTLS');
    if (!isPossible) {
      throw new Error(`SMTP server does not support TLS`);
    }

    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `STARTTLS\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) !== '2') {
        throw this._createSMTPResponseError(lines);
      }
      else {
        return this.negotiateTLS({timeout});
      }
    }).then(() => {
      this._extensions = [];
    });
  }

  /*
  * Returns a Promise which sends the AUTH PLAIN commands to the server. We can
  * abort the operating after a certain number of milliseconds by passing the
  * optional `timeout` parameter.
  *
  * NOTES: The PLAIN authentication mechanism is explaind in rfc4954 and rfc4616.
  */

  authPlain({username=null, password=null, timeout=0}={}) {
    let mechanisms = this.getAuthMechanisms();
    if (mechanisms.indexOf('PLAIN') === -1) {
      throw new Error(`SMTP server does not support the PLAIN authentication mechanism`);
    }

    let lines = [];
    let handler = (line) => lines.push(line);
    let token = new Buffer(`\u0000${username}\u0000${password}`, 'utf-8').toString('base64');
    let command = `AUTH PLAIN ${token}\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a Promise which sends the AUTH LOGIN commands to the server. We can
  * abort the operating after a certain number of milliseconds by passing the
  * optional `timeout` parameter.
  *
  * NOTES: The LOGIN authentication mechanism is not covered by rfc documents.
  */

  authLogin({username=null, password=null, timeout=0}={}) {
    let mechanisms = this.getAuthMechanisms();
    if (mechanisms.indexOf('LOGIN') === -1) {
      throw new Error(`SMTP server does not support the LOGIN authentication mechanism`);
    }

    let lines = [];
    let handler = (line) => lines.push(line);
    let command = `AUTH LOGIN\r\n`;

    return this.write(command, {timeout, handler}).then((code) => {
      if (lines[0] !== '334 VXNlcm5hbWU6') {
        throw this._createSMTPResponseError(lines);
      }
      else {
        lines = [];
        let token = new Buffer(username, 'utf-8').toString('base64');
        return this.write(`${token}\r\n`, {timeout, handler})
      }
    }).then((code) => {
      if (lines[0] !== '334 UGFzc3dvcmQ6') {
        throw this._createSMTPResponseError(lines);
      }
      else {
        lines = [];
        let token = new Buffer(password, 'utf-8').toString('base64');
        return this.write(`${token}\r\n`, {timeout, handler})
      }
    }).then((code) => {
      if (code.charAt(0) === '2') {
        return code;
      }
      else {
        throw this._createSMTPResponseError(lines);
      }
    });
  }

  /*
  * Returns a new SMTPResponseError instance populated with information from the
  * provided reply lines.
  */

  _createSMTPResponseError(lines) {
    let line = lines[lines.length-1];
    let code = this.parseReplyCode(line);
    let enhancedCode = this.parseEnhancedReplyCode(line);
    let message = lines.map(l => this.parseReplyText(l)).join(' ').replace(/\s\s+/g, ' ');

    return new SMTPResponseError(message, code, enhancedCode);
  }

  /*
  * Returns a hostname of a client machine.
  *
  * NOTES: According to rfc2821, the domain name given in the EHLO command must
  * be either a primary host name (a domain name that resolves to an A RR) or,
  * if the host has no name, an address IPv4/IPv6 literal enclosed by brackets
  * (e.g. [192.168.1.1]).
  */

  _getHostname() {
    let host = os.hostname() || '';

    if (host.indexOf('.') < 0) { // ignore if not FQDN
      host = '[127.0.0.1]';
    }
    else if (host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) { // IP mut be enclosed in []
      host = `[${host}]`;
    }

    return host;
  }

}
