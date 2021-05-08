import { Server } from 'ws';
import { Turtle, TurtleReadyState, TurtleState, MessageTo } from './Turtle';
import { randomBytes } from 'crypto';

const NAME_POOL = ['000', '001', '002', '003', '004', '005', '006', '007', '008', '009', '010']

class TurtleManager {
    turtles: Turtle[] = [];
    constructor() {
        const wss = new Server({ port: 5757 });
        console.info('Created new WSS turtle server on 5757')

        wss.on('connection', async (socket) => {
            const turtle = new Turtle(this.getTurtleID(), socket);
            this.manageTurtle(turtle)
            console.info(`Managing new turtle - ${turtle.getId()}`)

            turtle.on('bootstrapped', () => {
                // remove dead turtles from the list if they come back to life with a new id
                this.turtles = this.turtles.filter(t => {
                    if (t.state.readyState === TurtleReadyState.DEAD) {
                        if (t.state.lastKnownName === turtle.state.name) {
                            return false;
                        }
                    }
                    return true;
                })
            })

            turtle.on('turtleLost', () => {
                // will be in ready state until end of cb
                if (turtle.state.readyState === TurtleReadyState.READY) {
                    NAME_POOL.push(turtle.state.name)
                }
            })
        })
    }

    manageTurtle(turtle: Turtle) {
        const id = turtle.getId();
        if (this.turtles.find(turtle => turtle.getId() === id)) {
            return; // we already manage this turtle
        }

        this.turtles.push(turtle);
    }

    getTurtleID() {
        let id = '';
        while (id === '' || this.turtles.find(turtle => turtle.getId() === id)) {
            id = randomBytes(4).toString('hex');
        }
        return id;
    }

    getTurtleName(lastKnownName: string) {
        if (NAME_POOL.includes(lastKnownName)) {
            NAME_POOL.splice(NAME_POOL.indexOf(lastKnownName), 1);
            return lastKnownName;
        } else {
            return NAME_POOL.pop();
        }
    }

    getFleetStatus() {
        return this.turtles.reduce<Record<string, TurtleState>>((agg, turtle) => {
            agg[turtle.getId()] = turtle.state;
            return agg;
        }, {})
    }

    sendMessageToTurtle(id: string, message: MessageTo) {
        const turtle = this.turtles.find(t => t.state.id === id)

        if (!turtle) {
            console.warn(`Attempted to send message to turtle that did not exist (id: ${id}, message: ${JSON.stringify(message)})`)
            return false;
        } else {
            turtle.sendSocketMessage(message);
            return true;
        }
    }

    preemptTurtle(id: string) {
        const turtle = this.turtles.find(t => t.state.id === id)

        if (!turtle) {
            console.warn(`Attempted to preempt turtle that did not exist (id: ${id})`)
            return false;
        } else {
            turtle.preempt();
            return true;
        }
    }
}

let singleton: TurtleManager | null = null
export function getTurtleManager() {
    if (!singleton) {
        singleton = new TurtleManager();
    }
    return singleton
}
