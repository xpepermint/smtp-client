/*
* General error.
*/

exports.GeneralError = class extends Error {

  /*
  * Class constructor.
  */

  constructor(message) {
    super(message);

    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      enumerable: true // do not expose as object key
    });

    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true // do not expose as object key
    });

    this.code = 500;
  }
}

/*
* SMTP response error.
*/

exports.SMTPResponseError = class extends exports.GeneralError {

  /*
  * Class constructor.
  */

  constructor(message, code='500', enhancedCode=null) {
    super(message);

    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      enumerable: true // do not expose as object key
    });

    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true // do not expose as object key
    });

    this.code = code;
    this.enhancedCode = enhancedCode;
  }
}
