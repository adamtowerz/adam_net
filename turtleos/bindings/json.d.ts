export interface json {
    encode(this: void, obj: any): string;
    decode(this: void, str: string): any;
}