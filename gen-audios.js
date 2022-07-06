const {AUDIOS, audioFileName} = require('./cards.js');
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

Object.entries(AUDIOS).forEach(([text, fileName]) => {
    const filePath = audioPath + '/' + fileName;
    if(fs.existsSync(filePath)){
        fs.unlinkSync(filePath);
    }
    const file = fs.createWriteStream(filePath);
    http.get('http://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + encodeURIComponent(text), function(response) {
       response.pipe(file);    
       file.on("finish", () => {
           file.close();
           console.log("Downloaded: " + text);
       });
    });
});
