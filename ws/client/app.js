window.WS_CLIENT = (() => {
    
    const handlers = [];
    const dataHistory = [];

    const ws = new WebSocket(`ws${
        (document.location.protocol === "https:") ? "s" : ""
    }://${
        document.location.hostname
    }:${
        document.location.port
    }`);

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        handlers.forEach((cb) => cb(data));

        dataHistory.push(data)
    };

    return {

        onMessage: (cb) => {
            handlers.push(cb);

            dataHistory.forEach(cb);    
        },

        push: (command, payload) => {
            ws.send(JSON.stringify({
                command, payload
            }));
        }
        
    }
})();