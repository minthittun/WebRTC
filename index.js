var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(express.static('public'))

var roomName = "";


app.get('/', function(req, res){

	roomName = req.query.meetingRoom;
	
	if(roomName != null && roomName != "")
	{
		res.sendFile(__dirname + '/index.html');
	}
	else
	{
		res.sendFile(__dirname + '/nomeeting.html');
	}

  
});
var numClients = {};

io.on('connection', function(socket){

	socket.join(roomName)
	
	
	if (numClients[roomName] == undefined) {
		numClients[roomName] = [];
		numClients[roomName].push(socket.id)
    } else {
        numClients[roomName].push(socket.id)
	}

	const clientCount = numClients[roomName].length
	const clientSockets = numClients[roomName];
	
    io.in(roomName).emit("user-joined", socket.id, clientCount, clientSockets);

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message);
  	});

	socket.on('disconnect', function() {
		
		numClients[roomName].splice(numClients[roomName].indexOf(socket.id), 1)

		io.in(roomName).emit("user-left", socket.id, numClients[roomName].length);
		socket.leave(roomName)
	})

});

http.listen(port, function(){
  console.log('listening on *:' + port);
});