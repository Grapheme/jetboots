var display = function() {
    var socket = new WebSocket('ws://192.168.2.100:1338');
    var User = {};
    var responses = {
        init: function(data) {
            $.each(data.connections, function(i, v){
                if(!$('[data-id="' + v.id + '"]').length) {
                    $('#clients').append('<li class="list__item" data-id="' + v.id + '">' + v.id + ' <div class="user-bar"><div class="bar__user js-user"></div></div></li>');
                }
            })
        },
        shake: function(data) {
            $('[data-id="' + data.connection.id + '"] .js-user').css({
                left: Math.floor(data.connection.shake) + '%'
            });
            console.log($('[data-id="' + data.id + '"] .js-user'));
        },
        remove: function(data) {
            $('[data-id="' + data.id + '"]').remove();
        }
    };
    socket.onopen = function () {
        var messageObj = {
            'type': 'start',
        };
        socket.send(JSON.stringify(messageObj));
    };

    socket.onmessage = function (message) {
        var json = JSON.parse(message.data);
        //console.log(json);
        responses[json.type](json);
    };

    socket.onerror = function (error) {
        console.log('WebSocket error: ' + error);
    };
}
var controller = function() {
    var socket = new WebSocket('ws://192.168.2.100:1337');
    var User = {};
    var responses = {
        init: function(data) {
            User.id = data.myId;
            $('#your-id').text(data.myId);
        },
    };
    socket.onopen = function () {
        var messageObj = {
            'type': 'start',
            'device': 'mobile'
        };
        socket.send(JSON.stringify(messageObj));
    };

    socket.onmessage = function (message) {
        var json = JSON.parse(message.data);
        responses[json.type](json);
    };

    socket.onclose = function() {
        $('#your-id').text('Вы отключились от сервера');
    }

    socket.onerror = function (error) {
        console.log('WebSocket error: ' + error);
    };

    var gyroData = {};
    var stored = {};
    var motion_allow = true;

    var sendShake = function(x, y, z) {
        if(motion_allow) {
            motion_allow = false;
            var shake = 0;
            if(stored.x) {
                shake = Math.abs((stored.y - y) + (stored.x - x) + (stored.z - z));
            }
            stored.x = x;
            stored.y = y;
            stored.z = z;
            var shakeObj = {
                'type': 'shake',
                'id': User.id,
                'shake': shake
            };
            $('#x').text(x);
            $('#y').text(y);
            $('#z').text(z);
            setTimeout(function(){
                socket.send(JSON.stringify(shakeObj));
                motion_allow = true;
            }, 100);
        }
    }

    /*if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", function (e) {
            var x = e.beta;
            var y = e.gamma;
            var z = e.alpha;
            sendShake(x, y, z);
        }, true);
    } else */if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', function (e) {
            var OS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? -1 : 1 );
            var x = e.accelerationIncludingGravity.x * 2 * OS;
            var y = e.accelerationIncludingGravity.y * 2 * OS;
            var z = e.accelerationIncludingGravity.z * 2 * OS;
            sendShake(x, y, z);
        }, true);
    }/* else {
        window.addEventListener("MozOrientation", function () {
            var x = orientation.x * 50;
            var y = orientation.y * 50;
            var z = orientation.z * 50;
            sendShake(x, y, z);
        }, true);
    }*/
}

if(device_type == 'mobile') controller();
if(device_type == 'desktop') display();