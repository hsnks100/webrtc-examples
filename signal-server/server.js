var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var protobuf = require("protobufjs");

var protoRoot = null;
var ToMessage = null;
var socketIds = [];
protobuf.load("rtcmsg.proto", function(err, root) {
  if(err) {
    throw err;
  }
  protoRoot = root;
  ToMessage = protoRoot.lookupType("ToMessage");
});

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('disconnect', function(socket){
  delete socketIds[socket.id];

});
io.on('connection', function(socket){
  console.log('a user connected: ' + socket.id);
  socketIds[socket.id] = socket;

  socket.on('offer', function(data){
    console.log('a user offer message');
    for(var sid in socketIds) {
      if(sid != socket.id) {
        socketIds[sid].emit("offer", data);
      }
      else {
        // socketIds[sid].emit("offer", data);
      }
    }
  });
  socket.on('answer', function(data){
    console.log('a user answer message');
    for(var sid in socketIds) {
      if(sid != socket.id) {
        socketIds[sid].emit("answer", data);
      }
      else {
        // socketIds[sid].emit("answer", data);
      }
    }
  });
});


http.listen(3001, function(){
  console.log('listening on *:3001');
});
