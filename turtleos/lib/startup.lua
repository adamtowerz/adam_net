--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
print("hello world!")
local json = require("json")
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
local ws, err = http.websocket(("ws://" .. CONTROLLER_HOST) .. ":5757")
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
    local f = {
        loadstring(src)
    }
    return pcall(f)
end
while true do
    local message = ws.receive()
    if message == nil then
        break
    end
    local obj = json.decode(message)
    if obj.type == "naming" then
        print(
            "recieved name: " .. tostring(obj.name)
        )
        os.setComputerLabel(obj.name)
        ws.send(
            json.encode(
                {
                    type = "bootstrap",
                    name = os.getComputerLabel(),
                    fuel = turtle.getFuelLevel()
                }
            )
        )
    elseif obj.type == "ping" then
        print("ping pong")
        ws.send(
            json.encode({type = "pong"})
        )
    elseif obj.type == "script" then
        print("Running script from the cloud")
        runUntrustedSource(nil, obj.script)
    end
end
if ws then
    ws:close()
end
print("shutting down...")
return ____exports
