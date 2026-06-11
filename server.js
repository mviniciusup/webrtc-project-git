const express = require("express");
const https = require("https");
const WebSocket = require("ws");
const open = require("open").default;
const crypto = require("crypto");
const app = express();
const server = https.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static(__dirname));

const clients = new Map();

function broadcast(data, excludeId = null) {

    const message = JSON.stringify(data);

    clients.forEach((client, id) => {

        if (
            id !== excludeId &&
            client.readyState === WebSocket.OPEN
        ) {

            client.send(message);

        }

    });

}

wss.on("connection", (ws) => {

    const id = crypto.randomUUID();
    ws.id = crypto.randomBytes(5).toString("hex");

    clients.set(id, ws);

    //console.log("Novo peer:", id);
    console.log("--------------");
    console.log("NEW PEER REGISTERED on ID:", ws.id);
    console.log("\x1b[32mCONNECTED\x1b[0m");

    ws.send(JSON.stringify({
        type: "id",
        id
    }));

    broadcast({
        type: "new-peer",
        id
    }, id);

    ws.on("message", (message) => {

        const data = JSON.parse(message);

        const target = clients.get(data.target);

        if (target) {

            target.send(JSON.stringify({
                ...data,
                from: id
            }));

        }

    });

    ws.on("close", () => {

        clients.delete(id);

        broadcast({
            type: "peer-disconnected",
            id
        });

        console.log("----------------");
        console.log("\x1b[31mPEER DISCONNECTED\x1b[0m");

    });

});

server.listen(3000, async () => {

    console.log("Servidor rodando na porta 3000");

});
