import * as assert from 'node:assert';

export class Result<T> {
  err?: Error;
  value?: T;

  protected constructor({ err, value, hasValue }: { err?: Error; value?: T; hasValue?: boolean }) {
    assert.ok(hasValue && !err || !hasValue && err, 'Invalid result');
    if (err) this.err = err;
    else if (hasValue) this.value = value as T;
  }

  static error<T>(err: Error) {
    const res = new Result<T>({ err });
    return res;
  }

  static value<T>(value: T) {
    const res = new Result<T>({ value, hasValue: true });
    return res;
  }
}