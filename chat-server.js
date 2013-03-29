// chat-server.js

// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

process.title = 'node-chat';

var webSocketServerPort = 1337;

// websocket and http servers
var WebSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// latest 100 messages
var history = [ ];
//list of currently connected clients (users)
var clients = [ ];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Array with some colors randomized
var colors = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
colors.sort(function(a,b) { return Math.random() > 0.5; });

/**
 * HTTP Server
 */
var server = http.createServer(function(request, response) {
	// not important for websocket server
});
server.listen(webSocketServerPort, function() {
	console.log((new Date()) + " Server is listening on port " + webSocketServerPort);
});


/**
 * WebSocket Server
 */
wsServer = new WebSocketServer({
	// WebSocket server is tied to a HTTP server.
	// WebSocket request is just an enhanced HTTP request.
	// For more info http://tools.ietf.org/html/rfc6455#page-6
	httpServer: server
});

// This function is called every time someone tries to connect
wsServer.on('request', function(request) {
	console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

	// accept connection - you should check
	var connection = request.accept(null, request.origin);

	// client index needed to remove them on 'close'
	var index = clients.push(connection) - 1;
	var userName = false;
	var userColor = false;

	console.log((new Date()) + ' Connection accepted.');

	// send back chat history
	if (history.length > 0) {
		connection.sendUTF(JSON.stringify({ type: 'history', data: history }));
	}

	// user sent some message
	connection.on('message', function(message) {
		if (message.type === 'utf-8') { // accept only text
			// process WebSocket message
			if (userName === false) {
				// remember user name
				userName = htmlEntities(message.utf8Data);
				// get random color and send it back to user
				userColor = colors.shift();
				connection.sendUTF(JSON.stringify({ type: 'color', data: userColor }));
				console.log((new Date()) + ' User is known as: ' + userName + ' with ' + userColor + ' color.');
			}
			else {
				console.log((new Date()) + ' Received Message from ' + userName + ': ' + message.utf8Data);

				// keep history of all sent messages
				var obj = {
					time: (new Date()).getTime(),
					text: htmlEntities(message.utf8Data),
					author: userName,
					color: userColor
				};
				history.push(obj);
				history = history.slice(-100);

				// broadcast message to all connected clients
				var json = JSON.stringify({ type: 'message', data: obj });
				for (var j = 0; j < clients.length; j++) {
					clients[j].sendUTF(json);
				}
			}
		}
	});

	// user disconnected
	connection.on('close', function(connection) {
		if (userName !== false && userColor !== false) {
			console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
			// remove user from the list of connected clients
			clients.splice(index, 1);
			colors.push(userColor);
		}
	});
});