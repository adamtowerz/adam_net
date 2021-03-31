import { Server } from 'ws';
import { Turtle, TurtleReadyState } from './Turtle';
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
}

let singleton: TurtleManager | null = null
export function getTurtleManager() {
    if (!singleton) {
        singleton = new TurtleManager();
    }
    return singleton
}
