![Build Status](https://travis-ci.org/xpepermint/smtp-client.svg?branch=master)&nbsp;[![NPM Version](https://badge.fury.io/js/smtp-client.svg)](https://badge.fury.io/js/smtp-client)&nbsp;[![Dependency Status](https://gemnasium.com/xpepermint/smtp-client.svg)](https://gemnasium.com/xpepermint/smtp-client)

# smtp-client

> Simple, promisified, protocol-based SMTP client for Node.js.

This is an open source [npm](http://npmjs.com) package from [Node.js](http://nodejs.org). The source code is available on [GitHub](https://github.com/xpepermint/smtp-client) where you can also find our [issue tracker](https://github.com/xpepermint/smtp-client/issues).

## Related Projects

* [smtp-channel](https://github.com/xpepermint/smtp-channel): Low level SMTP communication layer.
* [smtp-connection](https://github.com/nodemailer/smtp-connection): SMTP client for node.js.

## Install

```
$ npm install --save smtp-client
```

## Example

```js
import {SMTPClient} from 'smtp-client';

let s = new SMTPClient({
  host: 'mx.domain.com',
  port: 25
});

(async function() {
  await s.connect();
  await s.greet({hostname: 'mx.domain.com'}); // runs EHLO command or HELO as a fallback
  await s.authPlain({username: 'john', password: 'secret'}); // authenticates a user
  await s.mail({from: 'from@sender.com'}); // runs MAIL FROM command
  await s.rcpt({to: 'to@recipient.com'}); // runs RCPT TO command (run this multiple times to add more recii)
  await s.data('mail source'); // runs DATA command and streams email source
  await s.quit(); // runs QUIT command
})().catch(console.error);
```

## API

**SMTPClient(options)**

> The core SMTP client class. This class extends the [SMTPChannel](https://github.com/xpepermint/smtp-channel). The options are sent directly to the  [net.connect](https://nodejs.org/api/net.html#net_net_connect_options_connectlistener) or  [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) method. Custom available options are listed below.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| secure | Boolean | No | false | When `true` the channel will connect to a SMTP server using TLS.
| timeout | Integer | No | 0 | A time in milliseconds after the client automatically disconnects (`0` disables the timeout).

Note that all instance methods throw an error when something goes wrong or when a remote SMTP server does not reply with a success code.

**SMTPClient.prototype.authLogin({username, password})**:Promise;

> Sends AUTH LOGIN command to the server and authenticates.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| username | String | No | - | Authentication username.
| password | String | No | - | Authentication password.

**SMTPClient.prototype.authPlain({username, password})**:Promise;

> Sends AUTH PLAIN command to the server and authenticates.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| username | String | No | - | Authentication username.
| password | String | No | - | Authentication password.

**SMTPClient.prototype.close({timeout})**:Promise;

> Destroys the client and ensures that no more I/O activity happens on this socket. When possible, use the `quit` method instead.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.connect({timeout})**:Promise;

> Connects to the SMTP server and starts socket I/O activity.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.data(source, {sourceSize, timeout})**:Promise;

> Sends the DATA command to the server which uploads the `source` of an email and finalize the process with the `.` (automatically appended to the source).

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| source | String,Buffer,Stream | Yes | - | Email content.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).
| sourceSize | Integer | No | 0 | `source` size in bytes. If the size exceeds the allowable limit then the method throws an error before even contacting the server.

**SMTPClient.prototype.ehlo({hostname, timeout})**:Promise;

> Sends the EHLO command to the server and retrieves information about the available SMTP server extensions.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| hostname | String | No | machine's hostname | Sender's FQDN.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.getAuthMechanisms()**:Array;

> Returns a list of supported authentication mechanisms. The value is retrieved from the SMTP server extensions when the `ehlo` command is executed.

**SMTPClient.prototype.getDataSizeLimit()**:Integer;

> Returns email size limit in bytes. The value is retrieved from the SMTP server extensions when the `ehlo` command is executed.

**SMTPClient.prototype.greet({hostname, timeout})**:Promise;

> Sends the EHLO command to the server and retrieves information about the available SMTP server extensions or HELO command if the EHLO isn't successful.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| hostname | String | No | machine's hostname | Sender's FQDN.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.hasExtension(name)**:Boolean;

> Returns `true` if the provided extension `name` is supported by the SMTP server. Make sure that you run the EHLO command before executing this method.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| name | String | Yes | - | SMTP server extension name.

**SMTPClient.prototype.helo({hostname, timeout})**:Promise;

> Sends the HELO command to the server.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| hostname | String | No | machine's hostname | Sender's FQDN.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.isLastReply(line)**:String;

> A helper method which parses the provided SMTP server reply line and returns `true` if the provided `line` represents the last reply from the SMTP server.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| line | String | Yes | - | SMTP server reply string.

**SMTPClient.prototype.isSecure()**:Boolean;

> Returns `true` if the connection is secured over TLS.

**SMTPClient.prototype.mail({from})**:Promise;

> Sends the MAIL command to the server which identifies the sender of the message (envelope).

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| from | String | Yes | - | Sender's email address.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.noop()**:Promise;

> Sends the NOOP command to the server which asks the SMTP server to send a valid reply but specifies no other action.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.parseEnhancedReplyCode(line)**:String;

> A helper method which parses and returns the enhanced reply code from the provided SMTP server reply.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| line | String | Yes | - | SMTP server reply string.

**SMTPClient.prototype.parseReplyCode(line)**:String;

> A helper method which parses and returns the reply code from the provided SMTP server reply.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| line | String | Yes | - | SMTP server reply string.

**SMTPClient.prototype.parseReplyText(line)**:String;

> A helper method which parses and returns the message part of the provided SMTP server reply.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| line | String | Yes | - | SMTP server reply string.

**SMTPClient.prototype.rcpt({from, timeout})**:String;

> Sends the RCPT command to the server which identifies the message recipient (envelope). Execute this method multiple times for each recipient if you have many recipients.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| to | String | Yes | - | Recipient's email address.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.rset({timeout})**:Promise;

> Sends the RSET command to the server which ends the current e-mail transaction.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.secure({timeout})**:Promise;

> Sends the STARTTLS command to the server and upgrades the connection to TLS.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.quit({timeout})**:Promise;

> Sends the QUIT command to the server which closes the socket and disconnects from the server.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPClient.prototype.write(data, {handler, timeout})**:Promise;

> Streams raw `data` to the SMTP server.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| data | String,Stream,Buffer | Yes | - | Data to be sent to the SMTP server. Make sure that you apply to the SMTP rules and complete lines with `\r\n`. When sending email data stream, make sure you include the `.` as the last line.
| handler | Function,Promise | No | - | A method for handling SMTP server replies.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**Event: close**: () => {}

> Emitted once the socket is fully closed.

**Event: command**: (line) => {}

> Emitted when a line of data is sent to the SMTP server.

| Argument | Type | Description
|----------|------|------------
| line | String | Client command string.

**Event: connect**: () => {}

> Emitted when a socket connection is successfully established.

**Event: end**: () => {}

> Emitted when the other end of the socket sends a FIN packet. This means that the socket is about to close.

**Event: error**: (error) => {}

> Emitted when an error occurs. The 'close' event will be called directly following this event.

| Argument | Type | Description
|----------|------|------------
| error | Error | Error object.

**Event: receive**: (chunk) => {}

> Emitted when a chunk of data is received from the SMTP server.

| Argument | Type | Description
|----------|------|------------
| chunk | Buffer,String | A chunk of data.

**Event: reply**: (line) => {}

> Emitted when a new reply from the server is received.

| Argument | Type | Description
|----------|------|------------
| line | String | SMTP server reply string.

**Event: send**: (chunk) => {}

> Emitted when a chunk of data is sent to the SMTP server.

| Argument | Type | Description
|----------|------|------------
| chunk | Buffer,String | A chunk of data.

**Event: timeout**: () => {}

> Emitted if the socket times out from inactivity. The timeout event automatically sends the `QUIT` SMTP command.

## License (MIT)

```
Copyright (c) 2016 Kristijan Sedlak <xpepermint@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
