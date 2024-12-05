import { join } from "path";
import { readFileSync, createReadStream, existsSync, statSync } from "fs";
import { createServer as createServerHTTP, IncomingMessage, ServerResponse } from "http";
import { createServer as createServerHTTPS } from "https";

import { WebSocketServer, WebSocket } from "ws";
import { lookup as lookupMime } from "mrmime";

const _config = {
    port: 6060,
    clientAppPath: join(__dirname, "../../../ui/dist/")
};


interface IDrawEntity {
    id: number;
    color: string;
    points: number[];
}


// If needed with secure connection
const TLS: {
    cert: string, key: string
}|null = null;   // { cert: <PATH>, key: <PATH> }?

let drawings: IDrawEntity[] = [];


// App server, also hosts WS
const httpServer = (
    TLS
    ? createServerHTTPS
    : createServerHTTP
)
    .bind(null)
    .call({
    ... TLS
        ? {
            cert: readFileSync(TLS.cert),
            key: readFileSync(TLS.key)
        }
        : {}
}, async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(`http${TLS ? "s" : ""}://${"127.0.0.1"}${req.url}`);

    switch(url.pathname) {
        case "/app":{
            res.setHeader("Content-Type", "text/javascript");

            streamFile(res, join(__dirname, "../../client/app.js"));
            
            return;
        }
        default:
            const clientAppFilePath: string = join(_config.clientAppPath, url.pathname);
            if(!existsSync(clientAppFilePath)
            || statSync(clientAppFilePath).isDirectory()) {
                res.statusCode = 404;
                res.end();
                return;
            }

            res.setHeader("Content-Type", lookupMime(clientAppFilePath));

            streamFile(res, clientAppFilePath);
    }
});

const wsServer = new WebSocketServer({
    server: httpServer
});

interface IWSClient extends WebSocket {
    id: number;
    color: string;
}

wsServer.on("connection", (ws: IWSClient, req: IncomingMessage) => {
    // Identify user by consistent hash ID
    ws.id = `${req.socket.remoteAddress}${req.headers["user-agent"] ?? ""}`
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0);;
    
    // Object for each user
    drawings.push({
        id: ws.id,
        color: `#${Math.round(
            ((16**6 - 1) / 2)
            + (
                ws.id**10
                % ((16**6 - 1) / 2)
            )
        ).toString(16)}`,
        points: []
    });
    
    unicast(ws, "sync", drawings);
    
    // Handle client connection
    // TODO: Also note ‘z’ coordinate per dot, in order of arrival
    ws.on("message", (message: Buffer) => {
        const data: {
            command: string;
            payload: unknown;
        } = JSON.parse(message.toString());
        
        if(data.command !== "sync") return;

        for(const drawing of drawings) {
            if(drawing.id !== ws.id) continue;

            drawing.points = data.payload as number[];

            break;
        }

        broadcast("sync", drawings/* , ws.id */);
    });
    ws.on("error", console.error);
    ws.on("close", () => {
        drawings.filter((drawing) => drawing.id !== ws.id);

        broadcast("sync", drawings);
    });
});

httpServer.listen(_config.port, () => {
    console.log(`Server listening on http${TLS ? "s" : ""}://localhost:${_config.port}/index.html)...`);
});


function streamFile(res: ServerResponse, path: string): void {
    createReadStream(path)
        .pipe(res, { end: true });
};


function unicast(client: IWSClient, command: string, data?: unknown) {
    client.send(JSON.stringify({
        command,
        payload: data
    }));
}

function broadcast(command: string, payload?: unknown, exceptClientId?: number) {
    const message = JSON.stringify({
        command, payload
    });

    Array.from(wsServer.clients)
        .forEach((client: IWSClient) => {
            if(client.id == exceptClientId) return;

            client.send(message);
        });
}