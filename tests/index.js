const test = require('ava');
const net = require('net');
const stream = require('stream');
const fs = require('fs');
const MailDev = require('maildev');
const {SMTPClient} = require('../src');

// let server = new MailDev({
//   autoRelayRules: [{ "allow": "*" }]
// });
//

const PORT = 1025;

function createSocketServer() {
  let server = net.createServer();
  server.start = (port) => new Promise((resolve) => server.listen(PORT, resolve));
  server.stop = () => new Promise((resolve) => server.close(resolve));
  return server;
}

test.serial('`parseEnhancedReplyCode` should parse ESMTP reply code', async (t) => {
  let c = new SMTPClient();
  c._extensions = ['ENHANCEDSTATUSCODES'];

  t.is(c.parseEnhancedReplyCode('555 5.5.5 Error'), '5.5.5');
});

test.serial('`parseReplyText` should parse SMTP and ESMTP reply message', async (t) => {
  let c = new SMTPClient();

  t.is(c.parseReplyText('555 5.5.5 Error'), '5.5.5 Error');
  c._extensions = ['ENHANCEDSTATUSCODES'];
  t.is(c.parseReplyText('555 5.5.5 Error'), 'Error');
});

test.serial('`connect` should connect to the SMTP server', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  t.is(await c.connect(), '220');

  await c.close();
  await s.stop();
});

test.serial('`connect` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('300 mx.test.com ESMTP\r\n');
  });
  await s.start();

  let c = new SMTPClient({port: PORT});

  t.throws(c.connect());

  await s.stop();
});

test.serial('`helo` should send the HELO command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = 'HELO foo\r\n';
      let code = isValid ? '220' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.helo({hostname: 'foo'}), '220');

  await c.close();
  await s.stop();
});

test.serial('`helo` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.helo({hostname: 'foo'})
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`ehlo` should send the EHLO command and retrieve supported extensions', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = data.toString() === 'EHLO foo\r\n';
      if (isValid) {
        socket.write('250-foo\r\n');
        socket.write('250-8BITMIME\r\n');
        socket.write('250 STARTTLS\r\n');
      }
      else {
        socket.write('500 foo\r\n');
      }
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(c.hasExtension('8BITMIME'), false);
  t.is(c.hasExtension('STARTTLS'), false);
  t.is(await c.ehlo({hostname: 'foo'}), '250');
  t.is(c.hasExtension('8BITMIME'), true);
  t.is(c.hasExtension('STARTTLS'), true);

  await c.close();
  await s.stop();
});

test.serial('`ehlo` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.ehlo({hostname: 'foo'})
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`greet` should send the EHLO command and retrieve supported extensions', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = data.toString() === 'EHLO foo\r\n';
      if (isValid) {
        socket.write('250-foo\r\n');
        socket.write('250-8BITMIME\r\n');
        socket.write('250 STARTTLS\r\n');
      }
      else {
        socket.write('500 foo\r\n');
      }
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(c.hasExtension('8BITMIME'), false);
  t.is(c.hasExtension('STARTTLS'), false);
  t.is(await c.greet({hostname: 'foo'}), '250');
  t.is(c.hasExtension('8BITMIME'), true);
  t.is(c.hasExtension('STARTTLS'), true);

  await c.close();
  await s.stop();
});

test.serial('`greet` should fall back to HELO when EHLO is not supported', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = data.toString() === 'HELO foo\r\n';
      let code = isValid ? '500' : '220';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(c.hasExtension('8BITMIME'), false);
  t.is(c.hasExtension('STARTTLS'), false);
  t.is(await c.greet(), '220');
  t.is(c.hasExtension('8BITMIME'), false);
  t.is(c.hasExtension('STARTTLS'), false);

  await c.close();
  await s.stop();
});

test.serial('`greet` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.greet({hostname: 'foo'})
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`mail` should send the MAIL command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let parts = data.toString().split(/:<|>/);
      let isValid = (
        parts[0] === 'MAIL FROM'
        && parts[1] === 'foo@bar.com'
        && parts[2] === '\r\n'
      );
      let code = isValid ? '250' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.mail({from: 'foo@bar.com'}), '250');

  await c.close();
  await s.stop();
});

test.serial('`mail` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.mail({from: 'foo'})
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`rcpt` should send the RCPT command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let parts = data.toString().split(/:<|>/);
      let isValid = (
        parts[0] === 'RCPT TO'
        && parts[1] === 'foo@bar.com'
        && parts[2] === '\r\n'
      );
      let code = isValid ? '250' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.rcpt({to: 'foo@bar.com'}), '250');

  await c.close();
  await s.stop();
});

test.serial('`rcpt` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.rcpt({to: 'foo'})
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`noop` should send the NOOP command (ping)', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = data.toString() === 'NOOP\r\n';
      let code = isValid ? '250' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.noop(), '250');

  await c.close();
  await s.stop();
});

test.serial('`noop` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.noop()
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`rset` should send the RSET command (reset/flush)', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = data.toString() === 'RSET\r\n';
      let code = isValid ? '250' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.rset(), '250');

  await c.close();
  await s.stop();
});

test.serial('`rset` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.rset()
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`quit` should send the QUIT command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let isValid = data.toString() === 'QUIT\r\n';
      let code = isValid ? '221' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.quit(), '221');

  await c.close();
  await s.stop();
});

test.serial('`quit` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500-foo    bar\r\n`);
      socket.write(`500 fin\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.quit()
  }
  catch(e) {
    t.is(e.message, 'foo bar fin');
  }

  await c.close();
  await s.stop();
});

test.serial('`data` should send the DATA command with the appended "." at the end', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let str = data.toString();
      if (str === 'DATA\r\n') {
        socket.write(`354 foo\r\n`);
      }
      else {
        let [line, dot] = str.split('\r\n');
        let isValid = (
          line === 'bar'
          && dot === '.'
        );
        let code = isValid ? '250' : '500';
        socket.write(`${code} foo\r\n`);
      }
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.data('bar'), '250');

  await c.close();
  await s.stop();
});

test.serial('`data` throws an error if the response code is not 2xx/3xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  try {
    await c.data()
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});

test.serial('`data` throws an error if the source size exceeds the allowable limit', async (t) => {
  let c = new SMTPClient({port: PORT});
  c._extensions = ['SIZE 10'];

  try {
    await c.data(null, {sourceSize: 100});
  }
  catch(e) {
    t.is(e.message, 'Message size exceeds the allowable limit (10 bytes)');
  }
});
