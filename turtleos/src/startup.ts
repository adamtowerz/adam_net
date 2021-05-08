import type { json as jsonType } from "../bindings/json";
print('hello world!')
const json: jsonType = require('json')
const FIRMWARE_VERSION = 1;
const CONTROLLER_HOST = '104.196.254.210';
const FIRMWARE_ENDPOINT = '/firmware';
const FIRMWARE_LIB_ENDPOINT = '/firmwareLib'
const FIRMWARE_JSON_ENDPOINT = '/firmwareJson'
const FIRMWARE_VERSION_ENDPOINT = '/firmwareVersion';

function upgradeFirmware() {
    try {
        const fres = http.get(`http://${CONTROLLER_HOST}${FIRMWARE_ENDPOINT}`);
        const firmware = fres.readAll();
        fs.delete("startup.lua");
        const ffile = fs.open("startup.lua", "w");
        ffile.write(firmware);
        ffile.close();

        const fjsonres = http.get(`http://${CONTROLLER_HOST}${FIRMWARE_JSON_ENDPOINT}`);
        const firmwarejson = fjsonres.readAll();
        fs.delete("json.lua");
        const jsonfile = fs.open("json.lua", "w");
        jsonfile.write(firmwarejson);
        jsonfile.close();

        const flibres = http.get(`http://${CONTROLLER_HOST}${FIRMWARE_LIB_ENDPOINT}`);
        const firmwareLib = flibres.readAll();
        fs.delete("lualib_bundle.lua");
        const libfile = fs.open("lualib_bundle.lua", "w");
        libfile.write(firmwareLib);
        libfile.close();

        os.reboot();
    } catch (e) {
        print(e)
        error('Failed to download new firmware')
    }
}

// conduct the firmware version check
try {
    const res = http.get(`http://${CONTROLLER_HOST}${FIRMWARE_VERSION_ENDPOINT}`);
    const version = json.decode(res.readAll()).version;

    if (version !== FIRMWARE_VERSION) {
        upgradeFirmware();
    }
} catch (e) {
    print(e)
    error('Failed to verify firmare version')
}

print('Firmware check completed, initializing WS handshake')
const [ws, err] = http.websocket(`ws://${CONTROLLER_HOST}:5757`)

if (err) {
    error('Failed to connect to socket');
}

ws.send(json.encode({ type: "whoami", name: os.getComputerLabel() }))
// end of bootstrap
// beginning of firmware utilities

function runUntrustedSource(src: string) {
    const [f, err] = loadstring(src);
    if (f === null) {
        return [false, err]
    }

    let env = getfenv()
    env.mineXbyX = mineXbyX;
    env.preemptCheck = preemptCheck;
    setfenv(f as unknown as (() => void), env);
    return pcall(f as unknown as (() => void));
}

function preemptCheck() {
    ws.send(json.encode({ type: "preempt-check" }))

    while (true) {
        const data = ws.receive();
        const message = json.decode(data);

        if (message.type === 'preempt-yes') {
            return true;
        } else if (message.type === 'preempt-no') {
            return false;
        } else {
            messageQueue.push(message);
        }
    }
}

function mineXbyX(this: void, x: number, y: number = x, z: number = x) {
    print('beginning space clear XxX protocol: ' + x)
    ws.send(json.encode({ type: 'setReadyState', state: "WORKING" }))
    try {
        function dig2HighForXForward(this: void, x: number) {
            turtle.digDown()
            for (let tf = 0; tf < x; tf++) {
                turtle.dig()
                turtle.forward()
                turtle.digDown()
            }
            if (preemptCheck()) {
                throw new Error('preempted');
            }
        }

        for (let td = 0; td < z; td += 2) {
            if (td !== 0) {
                turtle.down()
                turtle.digDown()
                turtle.down()
                turtle.turnRight()
            }

            for (let tl = 0; tl < y; tl++) {
                if (tl !== 0) {
                    if (tl % 2 == 0) {
                        turtle.turnLeft()
                        dig2HighForXForward(1)
                        turtle.turnLeft()
                    } else {
                        turtle.turnRight()
                        dig2HighForXForward(1)
                        turtle.turnRight()
                    }
                }
                dig2HighForXForward(x - 1);
            }
        }

        ws.send(json.encode({ type: 'setReadyState', state: "READY" }))
    } catch {
        print('Was preempted')
    }
}

// end of firmware utilities
// run loop
let messageQueue: any[] = [];
let activeNonce: string | undefined = undefined;
while (true) {
    let message: any;
    if (messageQueue.length > 0) {
        message = messageQueue.pop();
    } else {
        const data = ws.receive();
        message = json.decode(data);
    }

    if (message === null) {
        break;
    }

    activeNonce = message.nonce;

    if (message.type === 'naming') {
        print('recieved name: ' + message.name)
        os.setComputerLabel(message.name)

        ws.send(json.encode({
            type: "bootstrap",
            name: os.getComputerLabel(),
            fuel: turtle.getFuelLevel()
        }))
    } else if (message.type === 'ping') {
        print('ping pong')
        ws.send(json.encode({ type: "pong" }))
    } else if (message.type === 'rsrc') {
        const [res, err] = runUntrustedSource(message.src)
        if (!res) {
            print('src failed:', err)
            ws.send(json.encode({ type: "rsrc-err", err: err, nonce: activeNonce }))
        } else {
            ws.send(json.encode({ type: "rsrc-res", res: res, nonce: activeNonce }))
        }
    } else {
        print('Unknown message of type ', message.type)
    }

    activeNonce = undefined;
}

if (ws) {
    ws.close();
}

print('shutting down...')
