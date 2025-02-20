const WebSocket = require('ws');
const server = new WebSocket.Server({ 
    host: '192.168.0.28',  // Replace with your desired IP address
    port: 8888 
});

let lastID = 0;

let connections = new Map();
let playerPositions = [];
let tps = 5;
let worldSeed = 321;
let worldTime = 7.0;
let worldTimeSpeed = 0.002;
let maxTilesX = 256;
let maxTilesY = 256;

server.on('connection', (player) =>
{
    const id = GetPlayerID();
    connections.set(id, player);
    Log('Client connected: ' + id);
    
    let IDPacket =
    {
        type: 'player_id',
        data:
        {
            id: id
        }
    };
    
    SendPacket(player, IDPacket);
    
    player.on('close', () =>
    {
        Log('Client disconnected: ' + id);
        MulticastPacket({type: 'clientDisconnect', data: {id: id}});
        connections.delete(id);
    });

    
    //MESSAGES FROM CLIENT TO SERVER
    player.on('message', (data) =>
    {
        let packet = JSON.parse(data);

        if(packet.type === 'requestWorld')
        {
            let worldPacket =
            {
                type: 'world',
                data:
                {
                    tickrate: tps,
                    seed: worldSeed,
                    time: worldTime,
                    maxTilesX: maxTilesX,
                    maxTilesY: maxTilesY
                }
            };

            SendPacket(player, worldPacket);
        }

        if(packet.type === 'spawnNewClient')
        {
            Log('player with id ' + packet.data.id + ' wants to spawn');

            let spawnPacket =
            {
                type: 'spawnNewClient',
                data:
                {
                    id: packet.data.id,
                    x: packet.data.x,
                    y: packet.data.y
                }
            };

            MulticastPacket(spawnPacket, -1);
        }

        //test with other ppl
        if(packet.type === 'requestOthers')
        {
            Log('client with id ' + packet.data.id + ' requesting Other Clients');
            let others = [];

            connections.forEach((client, id) =>
            {
                if(id != packet.data.id)
                {
                    if(playerPositions[id] != undefined)
                    {
                        others.push({id: id, x: playerPositions[id].x, y: playerPositions[id].y});
                    }
                    else
                    {
                        others.push({id: id, x: 0, y: 0});
                    }
                }
            });
            player.send(JSON.stringify({type: 'spawnOthers', data: {objectArray: others}}));
        }

        if(packet.type === 'clientUpdate')
        {
            playerPositions[packet.data.id] = {x: packet.data.x, y: packet.data.y};
            
            console.log("CLIENT UPDATE ID: " + playerPositions[packet.data.id].x);

            otherPlayerPacket =
            {
                type: 'otherPlayerUpdate',
                data:
                {
                    id: packet.data.id,
                    x: packet.data.x,
                    y: packet.data.y,
                    velX: packet.data.velX,
                    velY: packet.data.velY
                }
            }
            MulticastPacket(otherPlayerPacket, packet.data.id);
        }
    });

});

function SendPacket(client, packet)
{
    Log('Sending packet: ' + JSON.stringify(packet));
    client.send(JSON.stringify(packet));
}

function MulticastPacket(packet, ignoreClientID = -1)
{    
    connections.forEach((client, id) =>
    {
        if(ignoreClientID != -1)
        {
            if(id === ignoreClientID)
            {
                return;
            }
        }
        Log('Multicasting packet to all connections');
        SendPacket(client, packet);
    });
}


function GetPlayerID() {
    lastID++;
    return lastID;
}

function Log(msg) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    console.log(`[${time}]: ${msg}`);
}

function UpdateWorld()
{
    worldTime += worldTimeSpeed;
    worldTime %= 24.0;
    MulticastPacket({type: 'worldTime', data: {x: worldTime, y: worldTimeSpeed}});
}

Log('WebSocket server is running on ws://' + server.options.host + ':' + server.options.port);
setInterval(UpdateWorld, 1.0/tps * 1000);