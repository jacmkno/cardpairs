const {AUDIOS, audioFileName, GENERATORS} = require('./cards.js');
const fs = require('fs');
const http = require('http');
const audioPath = './audios';

if (!fs.existsSync(audioPath)) {
    fs.mkdirSync(audioPath);
}

fs.readdirSync("./").filter(file => file.match(/.json$/ig)).forEach(file => {
    const data = fs.readFileSync(file, 'utf8');
    const texts = JSON.parse(data);
    if(!Array.isArray(texts)) return;
    texts.forEach(([code, name]) => {
        AUDIOS[name] = audioFileName(name);
    });
});

Object.values(GENERATORS).forEach(g => {
    if(g.genAudios) g().forEach(c => {
        while(c.length) {
            const tuple = c.splice(0, 2);
            if(tuple[1]) AUDIOS[tuple[1]] = audioFileName(tuple[1]);
        }
    });
});

Object.entries(AUDIOS).forEach(([text, fileName]) => {
    const filePath = audioPath + '/' + fileName;
    if(fs.existsSync(filePath)){
        return;
        fs.unlinkSync(filePath);
    }
    http.get('http://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + encodeURIComponent(text), function(response) {
        const file = fs.createWriteStream(filePath);
        response.pipe(file);    
        file.on("finish", () => {
           file.close();
           console.log("Downloaded: " + text);
        });
    });
});
