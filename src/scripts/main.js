var IMAGES_PATH = 'images/';
var CLOTHES_PATH = IMAGES_PATH + 'clothes/';
var state;
var userTypes = {
    male: {
        0: {
            image: 'male-1.svg',
            style: 'male-1'
        },
        1: {
            image: 'male-2.svg',
            style: 'male-2'
        },
        2: {
            image: 'male-3.svg',
            style: 'male-3'
        },
        3: {
            image: 'male-4.svg',
            style: 'male-4'
        },
        4: {
            image: 'male-5.svg',
            style: 'male-5'
        },
        5: {
            image: 'male-6.svg',
            style: 'male-6'
        }
    },
    female: {
        0: {
            image: 'female-1.svg',
            style: 'female-1'
        },
        1: {
            image: 'female-2.svg',
            style: 'female-2'
        },
        2: {
            image: 'female-3.svg',
            style: 'female-3'
        }
    }
}
var ShakeFunction = function() {
    function Shake(options) {
        //feature detect
        this.hasDeviceMotion = 'ondevicemotion' in window;

        this.options = {
            threshold: 15, //default velocity threshold for shake to register
            timeout: 1000 //default interval between events
        };

        if (typeof options === 'object') {
            for (var i in options) {
                if (options.hasOwnProperty(i)) {
                    this.options[i] = options[i];
                }
            }
        }

        //use date to prevent multiple shakes firing
        this.lastTime = new Date();

        //accelerometer values
        this.lastX = null;
        this.lastY = null;
        this.lastZ = null;

        //create custom event
        if (typeof document.CustomEvent === 'function') {
            this.event = new document.CustomEvent('shake', {
                bubbles: true,
                cancelable: true
            });
        } else if (typeof document.createEvent === 'function') {
            this.event = document.createEvent('Event');
            this.event.initEvent('shake', true, true);
        } else {
            return false;
        }
    }

    //reset timer values
    Shake.prototype.reset = function () {
        this.lastTime = new Date();
        this.lastX = null;
        this.lastY = null;
        this.lastZ = null;
    };

    //start listening for devicemotion
    Shake.prototype.start = function () {
        this.reset();
        if (this.hasDeviceMotion) { window.addEventListener('devicemotion', this, false); }
    };

    //stop listening for devicemotion
    Shake.prototype.stop = function () {

        if (this.hasDeviceMotion) { window.removeEventListener('devicemotion', this, false); }
        this.reset();
    };

    //calculates if shake did occur
    Shake.prototype.devicemotion = function (e) {

        var current = e.accelerationIncludingGravity,
            currentTime,
            timeDifference,
            deltaX = 0,
            deltaY = 0,
            deltaZ = 0;

        if ((this.lastX === null) && (this.lastY === null) && (this.lastZ === null)) {
            this.lastX = current.x;
            this.lastY = current.y;
            this.lastZ = current.z;
            return;
        }

        deltaX = Math.abs(this.lastX - current.x);
        deltaY = Math.abs(this.lastY - current.y);
        deltaZ = Math.abs(this.lastZ - current.z);

        if (((deltaX > this.options.threshold) && (deltaY > this.options.threshold)) || ((deltaX > this.options.threshold) && (deltaZ > this.options.threshold)) || ((deltaY > this.options.threshold) && (deltaZ > this.options.threshold))) {
            //calculate time in milliseconds since last shake registered
            currentTime = new Date();
            timeDifference = currentTime.getTime() - this.lastTime.getTime();

            if (timeDifference > this.options.timeout) {
                window.dispatchEvent(this.event);
                this.lastTime = new Date();
            }
        }

        this.lastX = current.x;
        this.lastY = current.y;
        this.lastZ = current.z;

    };

    //event handler
    Shake.prototype.handleEvent = function (e) {

        if (typeof (this[e.type]) === 'function') {
            return this[e.type](e);
        }
    };

    return Shake;
};
var Shake = ShakeFunction();
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
        countdown_time: 10
    };
    var socket = new WebSocket('ws://' + IP + ':1338');
    var connections = {};
    var gameStart = function() {
        socket.send(JSON.stringify({
            type: 'phoneGetReady'
        }));
        $('.js-game-step[data-step="getReady"]').addClass('active')
            .siblings().removeClass('active');
        setTimeout(function(){
            socket.send(JSON.stringify({
                type: 'startGame' 
            }));
            countdown.stop(true);
            socket.send(JSON.stringify({
                type: 'phonePlayGame'
            }));
        }, 3000);
    }
    var countdown = {
        timeout: false,
        allow_count: false,
        started: false,
        start: function() {
            var self = this;
            if(self.allow_count == false) {
                self.allow_count = true;
                var countTime = function(time) {
                    if(time == 0) {
                        gameStart();
                        return;
                    }
                    //$('.js-countdown').text(time);
                    self.timeout = setTimeout(function(){
                        if(self.allow_count) {
                            countTime(time-1);
                        }
                    }, 1000);
                }
                countTime(settings.countdown_time);
            }
        },
        stop: function(isend) {
            var self = this;
            self.allow_count = false;
            if(!isend) {
                $('.js-game-step[data-step="ready"]').addClass('active')
                    .siblings().removeClass('active');
            }
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
                    $('#clients').append('<li class="list__item js-user-item" data-id="' + v.id + '"><div class="user-bar"><div style="background-image: url(' + CLOTHES_PATH + userTypes[v.sex][v.sex_id].image + ')" class="bar__user js-user ' + userTypes[v.sex][v.sex_id].style +'"><div class="user__id">' + v.id + '</div></div></div></li>');
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
            if(!data.id) {
                socket.send(JSON.stringify({
                    type: 'restart'
                }));
                screens.show('start', 'screen');
            }
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
                $('.js-game-step[data-step="ready"]').addClass('active')
                    .siblings().removeClass('active');
            },
            game: function() {
                $('.js-game-step[data-step="game"]').addClass('active')
                    .siblings().removeClass('active');
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
        start: function() {
            screens.show('start', 'screen');
        },
        init: function(data) {
            User = data.myConnection;
            $('.js-your-id').text(User.id);
            $('.js-your-image').attr('src', CLOTHES_PATH + userTypes[User.sex][User.sex_id].image);
            $('.js-game-states [data-state="' + User.readyState + '"]').show()
                .siblings().hide();
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
            motion_allow = false;
            setTimeout(function(){
                socket.send(JSON.stringify(shakeObj));
                motion_allow = true;
            }, 100);
        }
    }
    var sendOneShake = function() {
        socket.send(JSON.stringify({
            type: 'shake',
            id: User.id,
            shake: 1
        }));
    }
    var shakeEvent = new Shake({
        threshold: 15,
        timeout: 200
    });
    shakeEvent.start();
    window.addEventListener('shake', function(){
        sendOneShake();
    }, false);

    /*gyro.frequency = 100;
    var startTracking = function() {
        var isGyroNull = false;
        gyro.startTracking(function(o) {
            if(!isGyroNull && o.x == null) {
                alert(o.x);
                isGyroNull = true;
                startTracking();
            } else {
                sendShake(o.x, o.y, o.z);
            }
        });
    }
    setTimeout(function(){
        startTracking();
    }, 500);*/
}

var gameInit = function() {
    if(device_type == 'mobile') controller();
    if(device_type == 'desktop') display();
}

var IP;
$(window).on('load', function(){
    if((window.location.host).substring(0,9) == 'localhost') {
        $.get('server/ipadress').done(function(data){
            IP = JSON.parse(data).ip;
            $('.js-ip-string').text(IP);
            gameInit();
        });
    } else {
        IP = window.location.hostname;
        $('.js-ip-string').text(IP);
        gameInit();
    }
});
