if(window.location.hash && window.location.hash != '') {
    var IP = window.location.hash.substr(1);
} else {
    var IP = '192.168.2.115';
}
var IMAGES_PATH = 'images/';
var CLOTHES_PATH = IMAGES_PATH + 'clothes/';
var state;
var userTypes = {
    male: {
        0: {
            image: 'male-1.svg'
        },
        1: {
            image: 'male-2.svg'
        },
        2: {
            image: 'male-3.svg'
        },
        3: {
            image: 'male-4.svg'
        },
        4: {
            image: 'male-5.svg'
        },
        5: {
            image: 'male-6.svg'
        }
    },
    female: {
        0: {
            image: 'female-1.svg'
        },
        1: {
            image: 'female-2.svg'
        },
        2: {
            image: 'female-3.svg'
        }
    }
}
var screens = {
    show: function(name, type) {
        $('[data-' + type + '="' + name + '"]').show()
            .siblings('[data-' + type + ']').hide();
    }
}
var display = function() {
    var settings = {
        min_users: 2,
        max_users: 5,
        countdown_time: 5
    };
    var socket = new WebSocket('ws://' + IP + ':1338');
    var connections = {};
    var gameStart = function() {
        socket.send(JSON.stringify({
            type: 'startGame' 
        }));
        countdown.stop();
        socket.send(JSON.stringify({
            type: 'phonePlayGame'
        }));
    }
    var countdown = {
        timeout: false,
        allow_count: false,
        started: false,
        start: function() {
            var self = this;
            if(self.allow_count == false) {
                self.allow_count = true;
                socket.send(JSON.stringify({
                    type: 'phoneGetReady'
                }));
                var countTime = function(time) {
                    if(time == 0) {
                        gameStart();
                        return;
                    }
                    //$('.js-countdown').text(time);
                    $('.js-countdown').text('Приготовьтесь');
                    self.timeout = setTimeout(function(){
                        if(self.allow_count) {
                            countTime(time-1);
                        }
                    }, 1000);
                }
                $('.js-game-step').hide();
                $('.js-countdown').show();
                countTime(settings.countdown_time);
            }
        },
        stop: function() {
            var self = this;
            self.allow_count = false;
            screens.show('ready', 'step');
            $('.js-countdown').hide();
            clearTimeout(self.timeout);
            socket.send(JSON.stringify({
                type: 'phoneWaitPlayers'
            }));
        }
    }
    var responses = {
        init: function(data) {
            connections = data.connections;
            $.each(data.connections, function(i, v){
                if(!$('[data-id="' + v.id + '"]').length) {
                    $('#clients').append('<li class="list__item js-user-item" data-id="' + v.id + '"><div class="user-bar"><div style="background-image: url(' + CLOTHES_PATH + userTypes[v.sex][v.sex_id].image + ')" class="bar__user js-user"><div class="user__id">' + v.id + '</div></div></div></li>');
                }
            });
            if(data.online_registered >= settings.min_users) {
                if(data.online_registered == settings.max_users) {
                    gameStart();
                } else {
                    countdown.start();
                }
            } else {
                socket.send(JSON.stringify({
                    type: 'phoneWaitPlayers',
                }));
            }
        },
        shake: function(data) {
            $('[data-id="' + data.connection.id + '"] .js-user').css({
                left: Math.floor(data.connection.shake) + '%'
            });
        },
        winner: function(data) {
            var wConnection = connections[data.id];
            screens.show('finish', 'screen');
            $('.js-winner-id').text(wConnection.id);
            $('.js-winner-image').attr('src', CLOTHES_PATH + userTypes[wConnection.sex][wConnection.sex_id].image);
            $('.js-user-item').remove();
            setTimeout(function(){
                screens.show('promo', 'screen');
                setTimeout(function(){
                    socket.send(JSON.stringify({
                        type: 'restart'
                    }));
                    screens.show('start', 'screen');
                }, 10000);
            }, 5000);
        },
        remove: function(data) {
            $('[data-id="' + data.id + '"]').remove();
            if(state == 'ready' || state == 'start') {
                if(data.online_registered < 2) {
                    state = 'ready';
                    $(document).trigger('state::change');
                    countdown.stop();
                }
                if(data.online_registered == 0) {
                    state = 'start';
                    $(document).trigger('state::change');
                    countdown.stop();
                }
            }
            if(state == 'game' && data.online_registered == 1) {
                var this_id;
                delete connections[data.id];
                $.each(connections, function(i, v){
                    this_id = v.id;
                });
                socket.send(JSON.stringify({
                    type: 'onePlayer',
                    id: this_id
                }));
                responses.winner({id: this_id});
            }
        },
        states: {
            start: function() {
                screens.show('start', 'screen');
            },
            ready: function() {
                screens.show('game', 'screen');
                screens.show('ready', 'step');
            },
            game: function() {
                screens.show('game', 'step');
            }
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
        if(json.state != state && json.state !== undefined) {
            state = json.state;
            $(document).trigger('state::change');
        }
        if(typeof(responses[json.type]) !== 'undefined') {
            responses[json.type](json);
        }
    };

    socket.onerror = function (error) {
        console.log('WebSocket error: ');
        console.log(error);
    };
    $(document).on('state::change', function(){
        console.log(state);
        if(typeof(responses.states[state]) !== 'undefined') {
            responses.states[state]();
        }
    });
}
var controller = function() {
    var socket = new WebSocket('ws://' + IP + ':1337');
    var User = {};
    var responses = {
        first: function(data) {
            screens.show('start', 'screen');
        },
        init: function(data) {
            User = data.myConnection;
            $('.js-your-id').text(User.id);
            $('.js-your-image').attr('src', CLOTHES_PATH + userTypes[User.sex][User.sex_id].image);
        },
        winner: function(data) {
            screens.show('finish', 'screen');
            if(data.id == User.id) {
                $('.js-win').show();
            } else {
                $('.js-fail').show();
            }
            setTimeout(function(){
                screens.show('promo', 'screen');
            }, 5000);
        },
        disconnect: function() {
            socket.close();
        },
        phoneWaitPlayers: function() {
            $('.js-game-states [data-state="wait"]').show()
                .siblings().hide();
        },
        phonePlayGame: function() {
            $('.js-game-states [data-state="game"]').show()
                .siblings().hide();
        },
        phoneGetReady: function() {
            $('.js-game-states [data-state="ready"]').show()
                .siblings().hide();
        },
        gameStarted: function() {
            screens.show('gameStarted', 'screen');
        },
        gameWithOutYou: function() {
            if($('[data-screen=""]'))
            screens.show('gameStarted', 'screen');
        },
        states: {
            start: function() {
                screens.show('start', 'screen');
            },
            ready: function() {
                screens.show('game', 'screen');
            }
        }
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
        if(json.state != state) {
            state = json.state;
            $(document).trigger('state::change');
        }
        if(typeof(responses[json.type]) !== 'undefined') {
            responses[json.type](json);
        }
    };

    socket.onclose = function() {
        if(!$('[data-screen="promo"]').is(':visible')) {
            screens.show('disconnect', 'screen');
        }
    }

    socket.onerror = function (error) {
        console.log('WebSocket error');
        console.log(error);
    };

    $(document).on('state::change', function(){
        if(typeof(responses.states[state]) !== 'undefined') {
            responses.states[state]();
        }
    });

    $('.js-choise').on('click', function(){
        var sex = $(this).attr('data-type');
        this_obj = {
            type: 'register',
            id: User.id,
            sex: sex
        }
        socket.send(JSON.stringify(this_obj));
    });

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
        socket.send(JSON.stringify({
            type: 'shakeTest',
            shake: Math.abs((stored.y - y) + (stored.x - x) + (stored.z - z))
        }));
    }

    var gn = new GyroNorm();
    gn.init().then(function(){
        gn.start(function(data){
            sendShake(data.dm.gx, data.dm.gy, data.dm.gz);
        });
    });
}

if(device_type == 'mobile') controller();
if(device_type == 'desktop') display();
