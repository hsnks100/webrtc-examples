document.getElementById ("button1").addEventListener ("click", ksoo, false);
var ws = new WebSocket("ws://localhost:3000");

// 연결이 수립되면 서버에 메시지를 전송한다
ws.onopen = function(event) {
    // ws.send("Client message: Hi!");
}


// error event handler
ws.onerror = function(event) {
    console.log("Server error message: ", event.data);
}

var Peer = require('simple-peer')
var peer1 = null;
ws.onmessage = function(event) {
    console.log("Server message: ", event.data);
    var msg = JSON.parse(event.data); 
    if(msg.type === 'call') {
        peer1 = new Peer();
        // 서버로 부터 메시지를 수신한다
        peer1.on('signal', data => {
            // when peer1 has signaling data, give it to peer2 somehow
            ws.send(JSON.stringify({"type":"signal", "data":data}));
            // peer2.signal(data)
        })
        // peer2.on('signal', data => {
        //     // when peer2 has signaling data, give it to peer1 somehow
        //     peer1.signal(data)
        // })

        // peer1.on('connect', () => {
        //     // wait for 'connect' event before using the data channel
        //     peer1.send(JSON.stringify({"type":"msg", "data":"hey peer2, how is it going?"}));
        // })

        peer1.on('data', data => {
            // got a data channel message
            console.log('got a message from peer1: ' + data)
        })
    } else if(msg.type === 'signal') {
        peer1.signal(JSON.stringify(msg.data));
    } else if(msg.type === 'msg') {
    }


}




function ksoo() {
    // var peer2 = new Peer() 
    peer1 = new Peer({ initiator: true});
    ws.send(JSON.stringify({"type":"call"}));
    // 서버로 부터 메시지를 수신한다
    peer1.on('signal', data => {
        // when peer1 has signaling data, give it to peer2 somehow
        // ws.send(JSON.stringify(data));
        ws.send(JSON.stringify({"type":"signal", "data":data}));
        // peer2.signal(data)
    })
    // peer2.on('signal', data => {
    //     // when peer2 has signaling data, give it to peer1 somehow
    //     peer1.signal(data)
    // })

    peer1.on('connect', () => {
        // wait for 'connect' event before using the data channel
        peer1.send(JSON.stringify({"type":"msg", "data":"hey peer2, how is it going?"}));
        // peer1.send('hey peer2, how is it going?')
    })

    peer1.on('data', data => {
        // got a data channel message
        console.log('got a message from peer1: ' + data)
    })
}
