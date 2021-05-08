import WebSocket, { EventEmitter } from "ws";
import { getTurtleManager } from "./TurtleManager";
import { randomBytes } from 'crypto';

export enum BlockDirection { FORWARD, UP, DOWN }
export enum Direction { NORTH, EAST, SOUTH, WEST }
export enum Side { LEFT, RIGHT }

const MAX_AWAIT_TIMEOUT = 1000 * 5;

interface Slot {
    count: number;
    name: string;
    damage: number;
}

export enum TurtleReadyState {
    BOOTSTRAPPING = 'BOOTSTRAPPING',
    READY = 'READY',
    WORKING = 'WORKING',
    PREEMPTED = 'PREEMPTED',
    DEAD = 'DEAD'
}

export type TurtleState = {
    id: string;
    readyState: TurtleReadyState.BOOTSTRAPPING
    name?: undefined;
} | {
    id: string;
    readyState: TurtleReadyState.READY | TurtleReadyState.PREEMPTED | TurtleReadyState.WORKING;
    name: string;
    selectedSlot?: number;
    inventory?: (Slot | null)[];
    fuel: Number;
    x?: Number;
    y?: Number;
    z?: Number;
    dir?: Direction;
} | {
    id: string;
    readyState: TurtleReadyState.DEAD;
    name?: undefined;
    lastKnownName: string;
}

type NamingMessageTo = {
    type: "naming",
    name: string
}
type RequestStateMessageTo = {
    type: "requestState"

}
type PreemptCheckYesMessageTo = {
    type: "preempt-yes"
}
type PreemptCheckNoMessageTo = {
    type: "preempt-no"
}
export type MessageTo = NamingMessageTo | RequestStateMessageTo | PreemptCheckYesMessageTo | PreemptCheckNoMessageTo

type WhoAmIMessageFrom = {
    type: "whoami",
    name: string | null;
}
type BootstrapMessageFrom = {
    type: "bootstrap",
    name: string,
    fuel: number,
}
type SetReadyStateMessageFrom = {
    type: "setReadyState",
    state: TurtleReadyState,
}
export type MessageFrom = WhoAmIMessageFrom | BootstrapMessageFrom | SetReadyStateMessageFrom;

/**
 * Turtle bootstrap protocol:
 * 
 * Turtle -> Server [whoami]: "My last name was ____ but who am I"
 * Server -> Turtle [naming]: "you are ____"
 * Turtle -> Server [bootstrap]: "hello here is my whole state"
 */

export class Turtle extends EventEmitter {
    socket: WebSocket;
    state: TurtleState;
    nonceHandlers: Map<string, (msg: MessageFrom) => void>

    handlerMap: Record<TurtleReadyState | "default", Record<string, (msg: MessageFrom) => void>> = {
        [TurtleReadyState.BOOTSTRAPPING]: {
            'whoami': message => {
                const payload = message as WhoAmIMessageFrom;
                const lastKnownName = payload.name;
                const name = getTurtleManager().getTurtleName(lastKnownName);

                this.sendSocketMessage({ type: 'naming', name })
                this.infoLog(`Offering name ${name}`)
            },
            'bootstrap': message => {
                const payload = message as BootstrapMessageFrom;
                this.state = {
                    id: this.state.id,
                    readyState: TurtleReadyState.READY,
                    name: payload.name,
                    fuel: payload.fuel,
                }
                this.emit("bootstrapped")
                this.infoLog('Bootstrap complete')
            }
        },
        [TurtleReadyState.READY]: {},
        [TurtleReadyState.WORKING]: {},
        [TurtleReadyState.PREEMPTED]: {},
        [TurtleReadyState.DEAD]: {},
        default: {
            "preempt-check": () => {
                this.infoLog('Asked if it was preempted')
                if (this.state.readyState === TurtleReadyState.PREEMPTED) {
                    this.sendSocketMessage({ type: "preempt-yes" })
                    this.state.readyState = TurtleReadyState.READY;
                } else {
                    this.sendSocketMessage({ type: "preempt-no" })
                }
            },
            "setReadyState": (message) => {
                const payload = message as SetReadyStateMessageFrom;
                this.infoLog('Setting ready state to ' + payload.state)
                this.state.readyState = payload.state
            }
        }
    }


    constructor(id: string, socket: WebSocket) {
        super();
        this.nonceHandlers = new Map();
        console.info(`New turtle created - ${id}`)
        this.state = {
            id: id,
            readyState: TurtleReadyState.BOOTSTRAPPING
        }
        this.socket = socket;
        socket.on('message', (json) => {
            const data = JSON.parse(json.toString())

            if (data.nonce) {
                if (this.nonceHandlers.has(data.nonce)) {
                    this.nonceHandlers.get(data.nonce)(data);
                } else {
                    this.warnLog('Recieved callback for nonce with no handlers')
                }
            } else {
                this.processSocketMessage(data)
            }
        })
        socket.on('close', () => {
            this.warnLog('Turtle lost')
            this.emit('turtleLost')

            this.state = {
                id: this.state.id,
                readyState: TurtleReadyState.DEAD,
                lastKnownName: this.state.name,
                name: undefined,
            }
        })
        this.sendSocketMessage({
            type: "requestState"
        })
    }

    sendSocketMessage(message: MessageTo) {
        this.socket.send(JSON.stringify(message))
    }

    generateNonce(): string {
        let nonce = '';
        while (nonce === '' || this.nonceHandlers.has(nonce)) {
            nonce = randomBytes(4).toString('hex');
        }
        return nonce;
    }

    sendAndAwaitResponse(message: MessageTo): Promise<any> {
        return new Promise((resolve, reject) => {
            const nonce = this.generateNonce();
            this.nonceHandlers.set(nonce, (...args) => {
                this.nonceHandlers.delete(nonce);
                resolve(...args);
            })
            setTimeout(() => {
                this.nonceHandlers.delete(nonce);
                reject("timeout")
            }, MAX_AWAIT_TIMEOUT)

            this.socket.send(JSON.stringify({ nonce, ...message }))
        })
    }

    preempt() {
        if (this.state.readyState === TurtleReadyState.WORKING) {
            this.infoLog('Set to preempted')
            this.state.readyState = TurtleReadyState.PREEMPTED
        } else {
            this.warnLog('Attempted to preempt, but was not WORKING')
        }
    }

    processSocketMessage(message: MessageFrom) {
        if (this.state?.readyState === undefined) {
            console.warn(`Turtle not ready, cannot process ${message.type}`)
            return;
        }
        const handler = this.handlerMap[this.state.readyState][message.type] || this.handlerMap.default[message.type]

        if (handler) {
            handler(message);
        } else {
            this.warnLog(`recieved message that cannot be handled - ${JSON.stringify(message)}`)
        }
    }

    getId() {
        return this.state.id
    }

    isStateNormal() {
        return [TurtleReadyState.PREEMPTED, TurtleReadyState.READY, TurtleReadyState.WORKING].includes(this.state.readyState)
    }

    infoLog(message: string) {
        if (this.isStateNormal()) {
            console.info(`[${this.state.name}/${this.state.id}](${this.state.readyState}) - ${message}`)
        } else {
            console.info(`[${this.state.id}](${this.state.readyState}) - ${message}`)
        }
    }

    warnLog(message: string) {
        if (this.isStateNormal()) {
            console.warn(`[${this.state.name}/${this.state.id}](${this.state.readyState}) - ${message}`)
        } else {
            console.warn(`[${this.state.id}](${this.state.readyState}) - ${message}`)
        }
    }
}