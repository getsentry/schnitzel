const request = require('request');
const html2text = require('html-to-text');

const URL = 'http://www.brotzeit.at/diegourmetkantine/index.php/menueplan-brotzeit-die-gourmetkantine';


function getGermanWeekDay() {
  return [null, 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'
    ][(new Date()).getDay()] || null;
}

function fetchLunch() {
  return new Promise((resolve, reject) => {
    let date = getGermanWeekDay();
    if (!date) {
      reject(null);
      return;
    }

    request(URL, (error, response, body) => {
      let matches = /<p align="center">(.*?)<\/p>/g;
      let inSection = false;
      let newBody = '';
      body.match(matches).forEach((line) => {
        let header = line.match(/<strong>(.*?)<\/strong>/);
        if (header) {
          if (header[1].trim() === date) {
            inSection = true;
          } else if (inSection) {
            inSection = false;
          }
        } else if (inSection) {
          newBody += line;
        }
      });
      resolve(html2text.fromString(newBody).trim().replace(/\n+/g, '; '));
    });
  });
}

module.exports = {
  fetchLunch: fetchLunch
};
