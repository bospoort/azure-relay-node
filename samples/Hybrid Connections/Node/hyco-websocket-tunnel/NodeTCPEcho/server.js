var net = require('net');

var server = net.createServer(function(socket) {
        console.log('Incoming...');
        socket.on('data', function(data) {
            console.log('Received: ' + data);
            socket.write('Echo server\r\n');
            socket.pipe(socket);
            });
    },
    function(err){
        console.log(err);
});

server.listen(12346, '127.0.0.1');

console.log('done');

