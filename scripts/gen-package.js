const fs = require('fs');

const srcs = {
    'pwa/icons': fs.readdirSync("./pwa/icons"),
    'OS.windows': fs.readdirSync("./fonts").map(f=>'fonts/'+f),
    app: fs.readdirSync("./app"),
    cards: fs.readdirSync("./cards"),
    audios: fs.readdirSync("./audios"),
    timestamp: new Date().getTime()
};

fs.writeFileSync( 'package.json', JSON.stringify(srcs, null, 2) );