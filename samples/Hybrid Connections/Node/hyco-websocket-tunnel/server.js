var fs = require('fs');
var net = require('net');
var urlParse = require('url').parse;
var WebSocket = require('hyco-websocket');
var WebSocketServer = require('hyco-websocket').relayedServer;
var config = require('./config.json')

/* config.json needs to contain azure relay details, like such
{
  "ns": "{relayname}.servicebus.windows.net",
  "path": "{connectionname}",
  "keyrule": "RootManageSharedAccessKey",
  "key":  "{key for Shared Access}"
}*/

const ns = config.ns;
const path = config.path;
const keyrule = config.keyrule;
const key = config.key;

var users = loadUsers();

var wsServer = new WebSocketServer({
  server: WebSocket.createRelayListenUri(ns, path),
  token: function() {
    return WebSocket.createRelayToken('http://' + ns, keyrule, key);
  }
});

wsServer.on('request', function(request) {
  var url = urlParse(request.resource, true);
  var params = url.query;
  if (params['sb-hc-action'] === 'accept') {
    createTunnel(request, params.port, params.host);
  } else {
    request.reject(404);
  }
});

function authenticate(request) {
  var encoded = request.headers['authorization'] || '', credentials;
  encoded = encoded.replace(/Basic /i, '');
  try {
    credentials = new Buffer(encoded, 'base64').toString('utf8').split(':');
  } catch (e) {
    credentials = [];
  }
  var user = credentials[0], pwd =credentials[1];
  return (users[user] == pwd);
}

function createTunnel(request, port, host) {
  if (!authenticate(request.httpRequest)) {
    request.reject(403);
    return;
  }
  request.accept(null, null, null, function(webSock) {
    console.log(webSock.remoteAddress + ' connected - Protocol Version ' + webSock.webSocketVersion);

    var tcpSock = new net.Socket();

    tcpSock.on('error', function(err) {
      webSock.send(JSON.stringify({ status: 'error', details: 'Upstream socket error; ' + err }));
    });

    tcpSock.on('data', function(data) {
      webSock.send(data);
    });

    tcpSock.on('close', function() {
      webSock.close();
    });

    tcpSock.connect(port, host || '127.0.0.1', function() {
      webSock.on('message', function(msg) {
        if (msg.type === 'utf8') {
          //console.log('received utf message: ' + msg.utf8Data);
        } else {
          //console.log('received binary message of length ' + msg.binaryData.length);
          tcpSock.write(msg.binaryData);
        }
      });
      webSock.send(JSON.stringify({ status: 'ready', details: 'Upstream socket connected' }));
    });

    webSock.on('close', function() {
      tcpSock.destroy();
      console.log(webSock.remoteAddress + ' disconnected');
    });
  });
}

function loadUsers() {
  var lines = fs.readFileSync('./users.txt', 'utf8');
  var users = {};
  lines.split(/[\r\n]+/g).forEach(function(line) {
    var parts = line.split(':');
    if (parts.length == 2) {
      users[parts[0]] = parts[1];
    }
  });
  return users;
}
