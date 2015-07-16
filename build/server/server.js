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
    finish_amount = 100;
    online = 0;
    online_registered = 0;
    state = 'start';
    readyState = 'wait';
}
gameStart();

var gameSend = function(connection, type, obj, noState) {
    obj.type = type;
    if(!noState) obj.state = state;
    if(connection) 
        { connection.sendUTF(JSON.stringify(obj)); } else
        { gameLog('No connection to send information!'); }
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

var sendNotInGame = function(type, obj) {
    for(var index in connections) { 
        if (connections.hasOwnProperty(index)) {
            if(!connections[index].ingame) {
                gameSend(connections[index], type, obj);
            }
        }
    }
}

var gameLog = function(str) {
    console.log(new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds() + ' ' + str);
}

var responses = {
    start: function(data, connection) {
        if((state == 'start' || state == 'ready') && online_registered <= 5) {
            connection.id = connectionId++;
            connections[connection.id] = connection;
            online++;
            gameLog('online: ' + online + ', in game: ' + online_registered + '. new id: ' + connection.id);
            gameSend(connection, 'start', {}, true);
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
                shake: 0,
                conf: 1,
                readyState: readyState
            };
            gameSend(connection, 'init', {myConnection: scons[connection.id]});
            gameSend(displayConnect, 'init', {
                connections: scons,
                online_registered: online_registered
            });
            gameLog('id ' + connection.id + ' in game. User type: ' + data.sex + '|' + sex_id);
            gameLog('online: ' + online + ', in game: ' + online_registered);
            /*if(online_registered > 1) {
                gameSend(displayConnect, 'countdown', {});
                gameLog('Countdown started...');
            }*/
        }
    },
    shakeTest: function(data) {
        //gameLog(data.shake);
    },
    shake: function(data, connection) {
        if(displayConnect && state == 'game' && typeof(scons[connection.id]) !== 'undefined') {
            /*var maxLeft = 0;
            for(var index in scons) { 
                if (scons.hasOwnProperty(index)) {
                    if(scons[index].shake > maxLeft) {
                        maxLeft = scons[index].shake;
                    }
                }
            }*/
            var percents = data.shake/(finish_amount/100);
            if(scons[connection.id].shake < 100) {
                scons[connection.id].shake = scons[connection.id].shake + percents;
                gameSend(displayConnect, 'shake', {
                    connection: scons[connection.id]
                });
                //gameLog(connection.id + ': ' + scons[connection.id].shake);
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
        if(state != 'start') {
            gameStart();
        }
        gameSend(displayConnect, 'init', {
            connections: scons
        });
    },
    startGame: function() {
        state = 'game';
        sendNotInGame('gameWithOutYou',{});
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
        readyState = 'ready';
        sendAllConnected('phoneGetReady', {});
    },
    phonePlayGame: function() {
        readyState = 'game';
        sendAllConnected('phonePlayGame', {});
    },
    phoneWaitPlayers: function() {
        readyState = 'wait';
        sendAllConnected('phoneWaitPlayers', {});
    },
    onePlayer: function(data) {
        sendAllConnected('winner', {
            id: data.id
        });
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
            if(displayConnect) {
                displayConnect.sendUTF(json_str);
            }
            gameLog('disconnected id ' + connection.id);
            gameLog('online: ' + online + ', in game: ' + online_registered);
        }
    });
});

var os = require('os');
var ifaces = os.networkInterfaces();
var actual_ip = '0.0.0.0';

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
      gameLog(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      gameLog(ifname, iface.address);
      actual_ip = iface.address;
      var fs = require('fs');
      fs.writeFile("./ipadress", JSON.stringify({ip: actual_ip}), function(err) {
          if(err) {
              return gameLog(err);
          }
          gameLog("IP was saved!");
      }); 
    }
  });
});