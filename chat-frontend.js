// chat-frontend.js

$(function () {
	"use strict";

	// for better performance - to avoid searching in DOM
	var content = $('#content');
	var input = $('#input');
	var status = $('#status');

	// my color assigned by the server
	var myColor = false;
	// my name sent to the server
	var myName = false;

	// if user is running mozilla then use it's built-in websocket
	window.WebSocket = window.WebSocket || window.MozWebSocket;

	// if browser doesn't support WebSocket, notify and exit
	if (!window.Websocket) {
		content.html($('<p>', { text: 'Sorry, but your browser doesn\'t ' + 'support WebSockets.'} ));
		input.hide();
		$('span').hide();
		return;
	}

	// open connection
	var connection = new WebSocket('ws://127.0.0.1:1337');

	connection.onopen = function () {
		// users enter names first
		input.removeAttr('disabled');
		status.text('Choose name:');
	};

	connection.onerror = function (error) {
		// in case there are problems with connection
		content.html($('<p>', { text: 'Sorry, but there\'s some problem with your ' + 'connection or the server is down. </p>' } ));
	};

	// most important part - incoming messages
	connection.onmessage = function (message) {
		// try to parse JSON message
		// server always returns JSON, but we need to make sure
		// message is not damaged/chunked
		try {
			var json = JSON.parse(message.data);
		}
		catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}

		if (json.type === 'color') { // first response userColor
			myColor = json.data;
			status.text(myName + ': ').css('color', myColor);
			input.removeAttr('disabled').focus();
			// from now user can start sending messages
		}
		else if (json.type === 'history') {
			// insert every single message into chat window
			for (var i = 0; i < json.data.length; i++) {
				addMessage(json.data[i].author, json.data[i].text, json.data[i].color, new Date(json.data[i].time));
			}
		}
		else if (json.type === 'message') { // single message
			input.removeAttr('disabled');
			addMessage(json.data.author, json.data.text, json.data.color, new Date(json.data.time));
		}
		else {
			console.log('Hmm..., I\'ve never seen JSON like this: ', json);
		}
	};

	/**
	 * Key action for return => Send
	 */
	input.keydown(function(e) {
		if (e.keyCode === 13) {
			var msg = $(this).val();
			if (!msg) {
				return;
			}
			// send the message as ordinary text
			connection.send(msg);
			$(this).val('');
			// disable the input field to make the user wait
			// for the server to send a response
			input.attr('disabled', 'disabled');

			if (myName === false) {
				myName = msg;
			}
		}
	});

	/**
	 * Gives server 5 seconds to respond before showing an
	 * error message
	 */
	 setInterval(function() {
	 	if (connection.readyState != 1) {
	 		status.text('Error');
	 		input.attr('disabled', 'disabled').val('Unable to communicate with the WebSocket server');
	 	}
	}, 5000);

	/**
	 * Add message to the chat window
	 */
	function addMessage(author, message, color, dt) {
		content.append('<p><span style="color:' + color + '">' + author + '</span> @ ' + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes()) + ': ' + message + '</p>');
	}
});