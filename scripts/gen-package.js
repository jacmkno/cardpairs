const fs = require('fs');

const srcs = {
    'pwa/icons': fs.readdirSync("./pwa/icons"),
    'OS.windows': fs.readdirSync("./fonts").map(f=>'fonts/'+f),
    cards: fs.readdirSync("./cards"),
    audios: fs.readdirSync("./audios"),

};

fs.writeFileSync( 'package.json', JSON.stringify(srcs, null, 2) );