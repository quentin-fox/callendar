export type Ok<T> = { success: true; value: T };
export type Error<E> = { success: false; error: E };

export type Result<T, E> = Ok<T> | Error<E>;

export function ok<T>(value: T): Ok<T> {
  return { success: true, value };
}

export function error<E>(error: E): Error<E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success;
}

export function isError<T, E>(result: Result<T, E>): result is Error<E> {
  return !result.success;
}
