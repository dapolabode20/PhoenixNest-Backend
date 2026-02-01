import * as assert from 'node:assert';

export class Result<T> {
  err?: Error;
  value?: T;

  protected constructor({ err, value }: { err?: Error; value?: T }) {
    assert.ok(value && !err || !value && err, 'Invalid result');
    if (err) this.err = err;
    else if (value) this.value = value;
  }

  static error<T>(err: Error) {
    const res = new Result<T>({ err });
    return res;
  }

  static value<T>(value: T) {
    const res = new Result<T>({ value });
    return res;
  }
}