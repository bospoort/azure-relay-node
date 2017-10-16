var net = require('net');
var urlParse = require('url').parse;
var WebSocket = require('hyco-websocket');
var WebSocketServer = require('hyco-websocket').relayedServer;
var config = require('./config.json');

//hybrid relay config
const ns = config.ns;
const path = config.path;
const keyrule = config.keyrule;
const key = config.key;

console.log("Starting 'server' side of relay.")
console.log("Connecting to: " + ns + "/" + path);

var wsServer = new WebSocketServer({
    server: WebSocket.createRelayListenUri(ns, path),
    token: function () {
        return WebSocket.createRelayToken('http://' + ns, keyrule, key);
    }
});

wsServer.on('request', function (request) {
    var url = urlParse(request.resource, true);
    var params = url.query;
    if (params['sb-hc-action'] === 'accept') {
        createTunnel(request, params.port, params.host);
        console.log('Connecting to '+ params.host + ": " + params.port);
    } else {
        console.log('Unexpected sb-hc-action');
        request.reject(404);
    }
});

function createTunnel(request, destinationPort, destinationHost) {
    request.accept(null, null, null, function (webSock) {
        console.log(webSock.remoteAddress + ' connected - Protocol Version ' + webSock.webSocketVersion);

        var tcpSock = new net.Socket();

        tcpSock.on('error', function (err) {
            webSock.send(JSON.stringify({ status: 'error', details: 'Upstream socket error; ' + err }));
        });

        tcpSock.on('data', function (data) {
            webSock.send(data);
        });

        tcpSock.on('close', function () {
            webSock.close();
        });

        tcpSock.connect(destinationPort, destinationHost || '127.0.0.1', function () {
            webSock.on('message', function (msg) {
                if (msg.type === 'utf8') {
                    console.log('received utf message: ' + msg.utf8Data);
                } else {
                    console.log('received binary message of length ' + msg.binaryData.length);
                    tcpSock.write(msg.binaryData);
                }
            });
            webSock.send(JSON.stringify({ status: 'ready', details: 'Upstream socket connected' }));
        });
        webSock.on('close', function () {
            tcpSock.destroy();
            console.log(webSock.remoteAddress + ' disconnected');
        });
    });
}
