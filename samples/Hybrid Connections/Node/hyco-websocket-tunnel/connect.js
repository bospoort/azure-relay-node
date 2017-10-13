var https = require('https');
var tunnel = require('./lib/tunnel');
var WebSocket = require('hyco-websocket');
var config = require('./config.json');

const ns = config.ns;
const path = config.path;
const keyrule = config.keyrule;
const key = config.key;

var relayServerURI = WebSocket.createRelaySendUri(ns, path);
var relayToken = WebSocket.createRelayToken('http://' + ns, keyrule, key);

var credentials = null, tunnels = [];

var shell = global.shell = require('./lib/shell');

shell.on('command', function (cmd, args) {
    if (cmd == 'help') {
        shell.echo('Commands:');
        shell.echo('tunnel [localhost:]port [remotehost:]port');
        shell.echo('close [tunnel-id]');
        shell.echo('exit');
        shell.prompt();
    } else
        if (cmd == 'tunnel') {
            tunnel.createTunnel(relayServerURI, relayToken, credentials, args[0], args[1], function (err, server) {
                if (err) {
                    shell.echo(String(err));
                } else {
                    var id = tunnels.push(server);
                    shell.echo('Tunnel created with id: ' + id);
                }
                shell.prompt();
            });
        } else
            if (cmd == 'close') {
                var id = parseInt(args[0], 10) - 1;
                if (tunnels[id]) {
                    tunnels[id].close();
                    tunnels[id] = null;
                    shell.echo('Tunnel ' + (id + 1) + ' closed.');
                } else {
                    shell.echo('Invalid tunnel id.');
                }
                shell.prompt();
            } else
                if (cmd == 'exit') {
                    shell.exit();
                } else {
                    shell.echo('Invalid command. Type `help` for more information.');
                    shell.prompt();
                }
});

shell.echo('WebSocket Tunnel Console v0.1');
shell.echo('Remote Host: ' + ns);

//authenticate(function () {
    shell.prompt();
//});

//function authenticate(callback) {
//    shell.prompt('Username: ', function (user) {
//        shell.prompt('Password: ', function (pw) {
//            credentials = user + ':' + pw;
//            callback();
//        }, { passwordMode: true });
//    });
//}
