const express = require('express');
const http = require('http');
const os = require('os');
const app = express();
const server = http.createServer(app);
const {query, downloadLink, getTorrentId} = require('../utils');
const config = require(`${os.homedir()}/.bib_config.js`);

app.get('/search/:query', (req, res) => {
  query(req.params.query)
    .then(opts=>res.send(opts))
    .catch(res.send);
});

app.get('/fetch/torrents/:id', (req, res) => {
  downloadLink(`/torrents/${req.params.id}`)
    .then(at=>at())
    .then(pt=>pt(getTorrentId(), 3000))
    .then((td) => console.log('polltransmission resolved')|| td[0](td[1]))
    .then(meta => console.log('sending meta: ', meta) || res.send(encodeURIComponent(meta)));
});
app.get('/download/:id', (req, res) => {
  res.sendFile(`${config.localSettings.absDest}/${req.params.id.trim()}`);
});
server.listen('8080');
