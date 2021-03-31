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
    const f = loadstring(src) as unknown as (() => void);
    return pcall(f);
}

// end of firmware utilities
// run loop
while (true) {
    const message = ws.receive();
    if (message === null) {
        break;
    }

    const obj = json.decode(message);

    if (obj.type === 'naming') {
        print('recieved name: ' + obj.name)
        os.setComputerLabel(obj.name)

        ws.send(json.encode({
            type: "bootstrap",
            name: os.getComputerLabel(),
            fuel: turtle.getFuelLevel()
        }))
    } else if (obj.type === 'ping') {
        print('ping pong')
        ws.send(json.encode({ type: "pong" }))
    } else if (obj.type === 'script') {
        print('Running script from the cloud')
        runUntrustedSource(obj.script)
    }
}

if (ws) {
    ws.close();
}

print('shutting down...')
