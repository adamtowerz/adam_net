--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
require("lualib_bundle");
local ____exports = {}
local json, ws, err, preemptCheck, mineXbyX, messageQueue
function preemptCheck(self)
    ws.send(
        json.encode({type = "preempt-check"})
    )
    while true do
        local data = ws.receive()
        local message = json.decode(data)
        if message.type == "preempt-yes" then
            return true
        elseif message.type == "preempt-no" then
            return false
        else
            __TS__ArrayPush(messageQueue, message)
        end
    end
end
function mineXbyX(x, y, z)
    if y == nil then
        y = x
    end
    if z == nil then
        z = x
    end
    print(
        "beginning space clear XxX protocol: " .. tostring(x)
    )
    ws.send(
        json.encode({type = "setReadyState", state = "WORKING"})
    )
    do
        local ____try = pcall(
            function()
                local function dig2HighForXForward(x)
                    turtle.digDown()
                    do
                        local tf = 0
                        while tf < x do
                            turtle.dig()
                            turtle.forward()
                            turtle.digDown()
                            tf = tf + 1
                        end
                    end
                    if preemptCheck(nil) then
                        error(
                            __TS__New(Error, "preempted"),
                            0
                        )
                    end
                end
                do
                    local td = 0
                    while td < z do
                        if td ~= 0 then
                            turtle.down()
                            turtle.digDown()
                            turtle.down()
                            turtle.turnRight()
                        end
                        do
                            local tl = 0
                            while tl < y do
                                if tl ~= 0 then
                                    if (tl % 2) == 0 then
                                        turtle.turnLeft()
                                        dig2HighForXForward(1)
                                        turtle.turnLeft()
                                    else
                                        turtle.turnRight()
                                        dig2HighForXForward(1)
                                        turtle.turnRight()
                                    end
                                end
                                dig2HighForXForward(x - 1)
                                tl = tl + 1
                            end
                        end
                        td = td + 2
                    end
                end
                ws.send(
                    json.encode({type = "setReadyState", state = "READY"})
                )
            end
        )
        if not ____try then
            print("Was preempted")
        end
    end
end
print("hello world!")
json = require("json")
local FIRMWARE_VERSION = 1
local CONTROLLER_HOST = "104.196.254.210"
local FIRMWARE_ENDPOINT = "/firmware"
local FIRMWARE_LIB_ENDPOINT = "/firmwareLib"
local FIRMWARE_JSON_ENDPOINT = "/firmwareJson"
local FIRMWARE_VERSION_ENDPOINT = "/firmwareVersion"
local function upgradeFirmware(self)
    do
        local ____try, e = pcall(
            function()
                local fres = http.get(("http://" .. CONTROLLER_HOST) .. FIRMWARE_ENDPOINT)
                local firmware = fres:readAll()
                fs.delete("startup.lua")
                local ffile = fs.open("startup.lua", "w")
                ffile.write(firmware)
                ffile.close()
                local fjsonres = http.get(("http://" .. CONTROLLER_HOST) .. FIRMWARE_JSON_ENDPOINT)
                local firmwarejson = fjsonres:readAll()
                fs.delete("json.lua")
                local jsonfile = fs.open("json.lua", "w")
                jsonfile.write(firmwarejson)
                jsonfile.close()
                local flibres = http.get(("http://" .. CONTROLLER_HOST) .. FIRMWARE_LIB_ENDPOINT)
                local firmwareLib = flibres:readAll()
                fs.delete("lualib_bundle.lua")
                local libfile = fs.open("lualib_bundle.lua", "w")
                libfile.write(firmwareLib)
                libfile.close()
                os.reboot()
            end
        )
        if not ____try then
            print(e)
            error("Failed to download new firmware")
        end
    end
end
do
    local ____try, e = pcall(
        function()
            local res = http.get(("http://" .. CONTROLLER_HOST) .. FIRMWARE_VERSION_ENDPOINT)
            local version = json.decode(
                res:readAll()
            ).version
            if version ~= FIRMWARE_VERSION then
                upgradeFirmware(nil)
            end
        end
    )
    if not ____try then
        print(e)
        error("Failed to verify firmare version")
    end
end
print("Firmware check completed, initializing WS handshake")
ws, err = http.websocket(("ws://" .. CONTROLLER_HOST) .. ":5757")
if err then
    error("Failed to connect to socket")
end
ws.send(
    json.encode(
        {
            type = "whoami",
            name = os.getComputerLabel()
        }
    )
)
local function runUntrustedSource(self, src)
    local f, err = loadstring(src)
    if f == nil then
        return {false, err}
    end
    local env = getfenv()
    env.mineXbyX = mineXbyX
    env.preemptCheck = preemptCheck
    setfenv(f, env)
    return {
        pcall(f)
    }
end
messageQueue = {}
local activeNonce = nil
while true do
    local message
    if #messageQueue > 0 then
        message = table.remove(messageQueue)
    else
        local data = ws.receive()
        message = json.decode(data)
    end
    if message == nil then
        break
    end
    activeNonce = message.nonce
    if message.type == "naming" then
        print(
            "recieved name: " .. tostring(message.name)
        )
        os.setComputerLabel(message.name)
        ws.send(
            json.encode(
                {
                    type = "bootstrap",
                    name = os.getComputerLabel(),
                    fuel = turtle.getFuelLevel()
                }
            )
        )
    elseif message.type == "ping" then
        print("ping pong")
        ws.send(
            json.encode({type = "pong"})
        )
    elseif message.type == "rsrc" then
        local res, err = unpack(
            runUntrustedSource(nil, message.src)
        )
        if not res then
            print("src failed:", err)
            ws.send(
                json.encode({type = "rsrc-err", err = err, nonce = activeNonce})
            )
        else
            ws.send(
                json.encode({type = "rsrc-res", res = res, nonce = activeNonce})
            )
        end
    else
        print("Unknown message of type ", message.type)
    end
    activeNonce = nil
end
if ws then
    ws:close()
end
print("shutting down...")
return ____exports
