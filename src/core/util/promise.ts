/**
 * shim for Promise.withResolvers
 * @returns {Promise<T>} A promise that can be resolved or rejected from outside
 */
export function withResolvers<T>() {
    let resolve: (value: T) => void = () => {};
    let reject: (value?: any) => void = () => {};
    const waiting = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return { resolve, reject, promise: waiting };
}
