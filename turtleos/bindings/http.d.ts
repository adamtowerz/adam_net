/** @noSelfInFile */

interface HttpResponseHandle {
    close: () => void;
    readLine: () => string;
    readAll: () => string;
}

interface WebSocket {
    receive: (this: void) => any;
    send: (this: void, msg: string) => void;
    close: () => void;
}

declare namespace http {
    function get(url: string): HttpResponseHandle;

    /**
     * @tupleReturn
     */
    function websocket(url: string): [WebSocket, string | undefined]
}