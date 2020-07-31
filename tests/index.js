const test = require('ava');
const net = require('net');
const tls = require('tls');
const stream = require('stream');
const fs = require('fs');
const {LineBuffer} = require('line-buffer');
const {SMTPClient} = require('../src');

const buffer = new LineBuffer();
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

test.serial('`getDataSizeLimit` should return email size limit', async (t) => {
  let c = new SMTPClient();
  c._extensions = ['SIZE 100'];

  t.is(c.getDataSizeLimit(), 100);
});

test.serial('`getAuthMechanisms` should return a list of available authentication mechanisms', async (t) => {
  let c = new SMTPClient();
  c._extensions = ['AUTH login PLAIN'];

  t.deepEqual(c.getAuthMechanisms(), ['LOGIN', 'PLAIN']);
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

  t.throws(c.connect);

  await s.stop();
});

test.serial('`helo` should send the HELO command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'HELO foo';
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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'EHLO foo';
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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'EHLO foo';
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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'HELO foo';
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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let parts = line.split(/:<|>/);
      let isValid = (
        parts[0] === 'MAIL FROM'
        && parts[1] === 'foo'
        && parts[2] === ''
      );
      let code = isValid ? '250' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.mail({from: 'foo'}), '250');

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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let parts = line.split(/:<|>/);
      let isValid = (
        parts[0] === 'RCPT TO'
        && parts[1] === 'foo'
        && parts[2] === ''
      );
      let code = isValid ? '250' : '500';
      socket.write(`${code} foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  await c.connect();

  t.is(await c.rcpt({to: 'foo'}), '250');

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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'NOOP';
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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'RSET';
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
      let line = buffer.feed(data)[0];
      if (!line) return;

      let isValid = line === 'QUIT';
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
      let lines = buffer.feed(data);
      if (lines === 0) return;

      if (lines[0] === 'DATA') {
        socket.write(`354 foo\r\n`);
      }
      else if (lines.indexOf('.') !== -1){
        socket.write(`250 foo\r\n`);
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

test.serial('`authPlain` should send the AUTH PLAIN command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let line = buffer.feed(data)[0];
      if (!line) return;

      if (line === 'AUTH PLAIN AGZvbwBiYXI=') {
        socket.write(`235 Accepted\r\n`);
      }
      else {
        socket.write(`500 Error\r\n`);
      }
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  c._extensions = ['AUTH PLAIN'];
  await c.connect();

  t.is(await c.authPlain({username: 'foo', password: 'bar'}), '235');

  await c.close();
  await s.stop();
});

test.serial('`authPlain` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo    bar\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  c._extensions = ['AUTH PLAIN'];
  await c.connect();

  try {
    await c.authPlain();
  }
  catch(e) {
    t.is(e.message, 'foo bar');
  }

  await c.close();
  await s.stop();
});

test.serial('`authLogin` should send the AUTH LOGIN command', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      let line = buffer.feed(data)[0];
      if (!line) return;

      if (line === 'AUTH LOGIN') {
        socket.write(`334 VXNlcm5hbWU6\r\n`);
      }
      else if (line === 'Zm9v') {
        socket.write(`334 UGFzc3dvcmQ6\r\n`);
      }
      else if (line === 'YmFy') {
        socket.write(`235 Accepted\r\n`);
      }
      else {
        socket.write(`500 Error\r\n`);
      }
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  c._extensions = ['AUTH LOGIN'];
  await c.connect();

  t.is(await c.authLogin({username: 'foo', password: 'bar'}), '235');

  await c.close();
  await s.stop();
});

test.serial('`authLogin` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo    bar\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  c._extensions = ['AUTH LOGIN'];
  await c.connect();

  try {
    await c.authLogin();
  }
  catch(e) {
    t.is(e.message, 'foo bar');
  }

  await c.close();
  await s.stop();
});

// test.serial('`secure` should upgrade the client to TLS', async (t) => {
//   let s = createSocketServer();
//   s.on('connection', (socket) => {
//     socket.write('220 mx.test.com ESMTP\r\n');
//     socket.on('data', (data) => {
//       let line = buffer.feed(data)[0];
//       if (!line) return;
//
//       if (line === 'STARTTLS') {
//         socket.write(`220 foo\r\n`);
//
//         let starttls = require('starttls');
//         starttls({
//           socket,
//           isServer: true,
//           server: s,
//           rejectUnauthorized: false
//         });
//       }
//       else {
//         socket.write(`250 foo\r\n`);
//       }
//     });
//   });
//   await s.start();
//
//   let c = new SMTPClient({port: PORT});
//   c._extensions = ['STARTTLS'];
//   await c.connect();
//
//   t.is(c.isSecure(), false);
//   t.is(await c.secure(), '220');
//   t.is(c.isSecure(), true);
//
//   await c.close();
//   await s.stop();
// });

test.serial('`secure` throws an error if the response code is not 2xx', async (t) => {
  let s = createSocketServer();
  s.on('connection', (socket) => {
    socket.write('220 mx.test.com ESMTP\r\n');
    socket.on('data', (data) => {
      socket.write(`500 foo\r\n`);
    });
  });
  await s.start();

  let c = new SMTPClient({port: PORT});
  c._extensions = ['STARTTLS'];
  await c.connect();

  try {
    await c.secure()
  }
  catch(e) {
    t.is(e.message, 'foo');
  }

  await c.close();
  await s.stop();
});
