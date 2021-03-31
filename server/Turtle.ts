import WebSocket, { EventEmitter } from "ws";
import { getTurtleManager } from "./TurtleManager";

export enum BlockDirection { FORWARD, UP, DOWN }
export enum Direction { NORTH, EAST, SOUTH, WEST }
export enum Side { LEFT, RIGHT }

interface Slot {
    count: number;
    name: string;
    damage: number;
}

export enum TurtleReadyState {
    BOOTSTRAPPING,
    READY,
    DEAD
}

export type TurtleState = {
    id: string;
    readyState: TurtleReadyState.BOOTSTRAPPING
    name?: undefined;
} | {
    id: string;
    readyState: TurtleReadyState.READY;
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

type MessageTo = {
    type: "naming",
    name: string
} | {
    type: "requestState"
}

type MessageFrom = {
    type: "whoami",
    name: string | null;
} | {
    type: "bootstrap",
    name: string,
    fuel: number,
}

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


    constructor(id: string, socket: WebSocket) {
        super();
        console.info(`New turtle created - ${id}`)
        this.state = {
            id: id,
            readyState: TurtleReadyState.BOOTSTRAPPING
        }
        this.socket = socket;
        socket.on('message', (data) => {
            this.processSocketMessage(JSON.parse(data.toString()))
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

    processSocketMessage(message: MessageFrom) {
        if (this.state?.readyState === undefined) {
            console.warn(`Turtle not ready, cannot process ${message.type}`)
            return;
        }
        if (this.state.readyState === TurtleReadyState.BOOTSTRAPPING) {
            if (message.type === 'whoami') {
                const lastKnownName = message.name;
                const name = getTurtleManager().getTurtleName(lastKnownName);

                this.sendSocketMessage({ type: 'naming', name })
                this.infoLog(`Offering name ${name}`)
            } else if (message.type === 'bootstrap') {
                this.state = {
                    id: this.state.id,
                    readyState: TurtleReadyState.READY,
                    name: message.name,
                    fuel: message.fuel,
                }
                this.infoLog('Bootstrap complete')
            } else {
                this.warnLog(`recieved message that cannot be handled - ${JSON.stringify(message)}`)
            }
        }
    }

    getId() {
        return this.state.id
    }

    infoLog(message: string) {
        if (this.state.readyState === TurtleReadyState.READY) {
            console.info(`[${this.state.name}/${this.state.id}](${this.state.readyState}) - ${message}`)
        } else {
            console.info(`[${this.state.id}](${this.state.readyState}) - ${message}`)
        }
    }

    warnLog(message: string) {
        if (this.state.readyState === TurtleReadyState.READY) {
            console.warn(`[${this.state.name}/${this.state.id}](${this.state.readyState}) - ${message}`)
        } else {
            console.warn(`[${this.state.id}](${this.state.readyState}) - ${message}`)
        }
    }
}