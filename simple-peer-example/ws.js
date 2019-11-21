var WebSocketServer = require("ws").Server;
var wss = new WebSocketServer({ port: 3000 });
wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

// 연결이 수립되면 클라이언트에 메시지를 전송하고 클라이언트로부터의 메시지를 수신한다
var wsArr = [];
wss.on("connection", function(ws) {
    ws.id = wss.getUniqueID();
    wsArr.push(ws);
    console.log(ws.id);
    // ws.send("Hello! I am a server.");
    ws.on("message", function(message) {
        var cnt = 0;
        for(var i=0; i<wsArr.length; i++) {
            if (ws.id != wsArr[i].id) {
                cnt++;
                wsArr[i].send(message);
            } 
        }
        console.log(cnt, "/", wsArr.length);
        console.log("Received: %s", message);
    });
});
