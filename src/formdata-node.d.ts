declare module 'formdata-node' {
  export class FormData {
    append(name: string, value: any): void;
    has(name: string): boolean;
    get(name: string): any;
    [Symbol.iterator](): Iterator<[string, any]>;
  }
}
