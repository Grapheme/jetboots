var server = require('websocket').server,
    http = require('http');
var socket = new server({
    httpServer: http.createServer().listen(1337)
});
var displaySocket = new server({
    httpServer: http.createServer().listen(1338)
});

var scons,
    connections,
    connectionId,
    displayConnect,
    finish_amount,
    online,
    online_registered,
    state, // start, ready, game, finish
    user_types = {};
var setSex = {
    male: function() {
        user_types.male = [0,1,2,3,4,5];
    },
    female: function() {
        user_types.female = [0,1,2];
    }
}
var gameStart = function() {
    setSex.male();
    setSex.female();
    scons = {};
    connections = {};
    connectionId = 1;
    displayConnect;
    finish_amount = 10000;
    online = 0;
    online_registered = 0;
    state = 'start';
}
gameStart();

var gameSend = function(connection, type, obj) {
    obj.type = type;
    obj.state = state;
    connection.sendUTF(JSON.stringify(obj));
}

var sendAllConnected = function(type, obj) {
    for(var index in connections) { 
        if (connections.hasOwnProperty(index)) {
            if(connections[index].ingame) {
                gameSend(connections[index], type, obj);
            }
        }
    }
}

var responses = {
    start: function(data, connection) {
        if(state == 'start' || state == 'ready') {
            state = 'start';
            connection.id = connectionId++;
            connections[connection.id] = connection;
            online++;
            console.log('--- --- --- --- ---');
            console.log('new device connected, id: ' + connection.id);
            console.log(online + ' devices online');
            gameSend(connection, 'start', {});
        } else {
            gameSend(connection, 'gameStarted', {});
        }
    },
    register: function(data, connection) {
        if(state == 'ready' || state == 'start') {
            state = 'ready';
            online_registered++;
            connections[connection.id].ingame = true;
            if(user_types[data.sex].length == 0) {
                setSex[data.sex]();
            }
            var sex_index = Math.floor(Math.random()*user_types[data.sex].length);
            var sex_id = user_types[data.sex][sex_index];
            user_types[data.sex].splice(sex_index, 1);
            scons[connection.id] = {
                id: connection.id,
                sex: data.sex,
                sex_id: sex_id,
                shake: 0
            };
            gameSend(connection, 'init', {myConnection: scons[connection.id]});
            gameSend(displayConnect, 'init', {
                connections: scons,
                online_registered: online_registered
            });
            console.log('--- --- --- --- ---');
            console.log('id ' + connection.id + ' in game. User type: ' + data.sex + '|' + sex_id);
            console.log(online + ' devices online, ' + online_registered + ' devices in game');
            /*if(online_registered > 1) {
                gameSend(displayConnect, 'countdown', {});
                console.log('Countdown started...');
            }*/
        }
    },
    shakeTest: function(data) {
        console.log(data.shake);
    },
    shake: function(data, connection) {
        if(displayConnect && state == 'game' && typeof(scons[connection.id]) !== 'undefined') {
            var percents = data.shake/(finish_amount/100);
            if(scons[connection.id].shake < 100) {
                scons[connection.id].shake = scons[connection.id].shake + percents;
                gameSend(displayConnect, 'shake', {
                    connection: scons[connection.id]
                });
                //console.log(connection.id + ': ' + scons[connection.id].shake);
            } else {
                state = 'finish';
                gameSend(displayConnect, 'winner', {
                    id: connection.id,
                    connection: scons[connection.id]
                });
                for(var index in connections) { 
                   if (connections.hasOwnProperty(index)) {
                       gameSend(connections[index], 'winner', {
                            id: connection.id
                       });
                   }
                }
            }
        }
    }
};

var displayResponses = {
    start: function() {
        gameSend(displayConnect, 'init', {
            connections: scons
        });
    },
    startGame: function() {
        state = 'game';
        gameSend(displayConnect, 'game', {});
        return false;
    },
    restart: function() {
        for(var index in connections) { 
           if (connections.hasOwnProperty(index)) {
               gameSend(connections[index], 'disconnect', {});
           }
        }
        gameStart();
    },
    phoneGetReady: function() {
        sendAllConnected('phoneGetReady', {});
    },
    phonePlayGame: function() {
        sendAllConnected('phonePlayGame', {});
    },
    phoneWaitPlayers: function() {
        sendAllConnected('phoneWaitPlayers', {});
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
        if(typeof(connections[connection.id]) !== 'undefined') {
            online--;
            if(connections[connection.id].ingame) {
                connections[connection.id].ingame = false;
                online_registered--;
            }
            delete connections[connection.id];
            delete scons[connection.id];
            var deleteObj = {
                type: 'remove',
                id: connection.id,
                online_registered: online_registered
            };
            var json_str = JSON.stringify(deleteObj);
            displayConnect.sendUTF(json_str);
            console.log('--- --- --- --- ---');
            console.log('disconnected device with id ' + connection.id);
            console.log(online + ' devices online');
            console.log(online_registered + ' devices in game');
        }
    });
});

var os = require('os');
var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0
    ;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log(ifname, iface.address);
    }
  });
});