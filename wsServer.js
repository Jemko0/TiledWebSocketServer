const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 17777 });
let lastID = 0;

let connections = new Map();

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
        connections.delete(id);
    });

    

    player.on('message', (data) =>
    {
        let packet = JSON.parse(data);
        Log('player with id ' + packet.data.id + ' wants to spawn');
        if(packet.type === 'spawn')
        {
            let spawnPacket =
            {
                type: 'spawn',
                data:
                {
                    id: packet.data.id,
                    x: packet.data.x,
                    y: packet.data.y
                }
            };

            MulticastPacket(spawnPacket, -1);
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

Log('WebSocket server is running on ws://localhost:17777');