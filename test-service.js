const express = require('express');
const os = require('os');
const http = require('http');
const { networkInterfaces } = require('os');
const dns = require('dns');
const { promisify } = require('util');

const app = express();
const port = process.env.TEST_SERVICE_PORT || 8080;

const startTime = new Date();

app.use(express.raw({ type: '*/*' }));

app.get('/', doHostname);
app.get('/echo', doEcho);
app.post('/echo', doEchoPost);
app.get('/echoheaders', doEchoheaders);
app.get('/hostname', doHostname);
app.get('/fqdn', doFqdn);
app.get('/ip', doIp);
app.get('/env', doEnv);
app.get('/healthz', doHealthz);
app.get('/healthz-fail', doFailHealthz);
app.get('/exit/:exitCode', doExit);

const dnsLookup = promisify(dns.lookup);

function doEcho(req, res) {
    req.pipe(res);
}

function doEchoPost(req, res) {
    if (req.body.length > 0) {
        res.send(req.body.toString());
    }
}

function doEchoheaders(req, res) {
    const headers = req.headers;
    for (const key in headers) {
        res.write(`${key}=${headers[key]}\n`);
    }
    res.end();
}

function doHostname(req, res) {
    const hostname = os.hostname();
    res.send(`${hostname}\n`);
}

function doEnv(req, res) {
    for (const envVar in process.env) {
        res.write(`${envVar}=${process.env[envVar]}\n`);
    }
    res.end();
}

async function doIp(req, res) {
    const ifaces = networkInterfaces();
    for (const ifaceName in ifaces) {
        const addrs = ifaces[ifaceName];
        for (const addr of addrs) {
            if (addr.family === 'IPv4') {
                res.write(`${addr.address}\n`);
            }
        }
    }
    res.end();
}

async function doFqdn(req, res) {
    try {
        const hostname = os.hostname();
        const { address } = await dnsLookup(hostname);
        const hosts = await promisify(dns.reverse)(address);
        if (hosts.length > 0) {
            const fqdn = hosts[0];
            res.send(`${fqdn.replace(/\.$/, '')}\n`);
        } else {
            res.send(`${hostname}\n`);
        }
    } catch (err) {
        res.send(`${os.hostname()}\n`);
    }
}

function doExit(req, res) {
    const exitCode = parseInt(req.params.exitCode);
    process.exit(exitCode);
}

function doHealthz(req, res) {
    res.status(200).send(`Uptime ${new Date() - startTime}ms\nOK\n`);
}

function doFailHealthz(req, res) {
    const failAt = 10 * 1000; // 10 seconds in milliseconds
    const uptime = new Date() - startTime;
    if (uptime < failAt) {
        res.status(200).send(`still OK, ${((failAt - uptime) / 1000).toFixed(1)} seconds before failing\nUptime ${uptime / 1000}\n`);
    } else {
        res.status(500).send(`failed since ${((uptime - failAt) / 1000).toFixed(1)} seconds\nUptime ${uptime / 1000}\n`);
    }
}

const server = http.createServer(app);
server.listen(port, () => {
    console.log(`Serving on port ${port}`);
});
