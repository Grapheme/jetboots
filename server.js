var server = require('websocket').server,
    http = require('http');
var socket = new server({
    httpServer: http.createServer().listen(1337)
});
var displaySocket = new server({
    httpServer: http.createServer().listen(1338)
});

var scons = {};
var connections = {};
var connectionId = 1;
var displayConnect;
var finish = 20000;

var responses = {
    start: function(data, connection) {
        var thisObj = {};
        connection.id = connectionId ++;
        connections[connection.id] = connection;
        scons[connection.id] = {
            id: connection.id,
            shake: 0
        };
        thisObj.type = 'init';
        thisObj.myId = connection.id;
        connection.sendUTF(JSON.stringify(thisObj));
        if(displayConnect) {
            var displayObj = {};
            displayObj.type = 'init';
            displayObj.connections = scons;
            displayConnect.sendUTF(JSON.stringify(displayObj));
        }
    },
    shake: function(data, connection) {
        if(displayConnect) {
            var percents = data.shake/(finish/100)
            scons[connection.id].shake = scons[connection.id].shake + percents;
            displayConnect.sendUTF(JSON.stringify({
                type: 'shake',
                connection: scons[connection.id]
            }));
        }
    }
};

var displayResponses = {
    start: function() {
        var displayObj = {};
        displayObj.type = 'init';
        displayObj.connections = scons;
        displayConnect.sendUTF(JSON.stringify(displayObj));
    }
}

displaySocket.on('request', function(request) {
    displayConnect = request.accept(null, request.origin);

    displayConnect.on('message', function(message) {
        var json = JSON.parse(message.utf8Data);
        displayResponses[json.type](json, displayConnect);
    });

    displayConnect.on('close', function() {
    });
});

socket.on('request', function(request) {
    var connection = request.accept(null, request.origin);

    connection.on('message', function(message) {
        var json = JSON.parse(message.utf8Data);
        responses[json.type](json, connection);
    });

    connection.on('close', function() {
        delete connections[connection.id];
        delete scons[connection.id];
        var deleteObj = {
            type: 'remove',
            id: connection.id
        };
        var json_str = JSON.stringify(deleteObj);
        displayConnect.sendUTF(json_str);
    });
});