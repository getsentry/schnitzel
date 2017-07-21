const BroadlinkRN = require('broadlinkjs-rm');
const slack = require('slack');
const {fetchLunch} = require('./lunch');

const DEVICE_ADDR = process.env.DEVICE_ADDR;
const BOT_TOKEN = process.env.BOT_TOKEN;
const IR_COMMANDS = {
  off: '2600480000012d8e1411160e111216331113150f1533160e150f150f150f14341632150f160e14101434170d150f1510160d150f150f170d160e1113160e14101212160f150e121213000d05',
  on: '2600480000012b921211131114101434141113111235141112121310141113351334131213111311121114101410133514111113131113341411131113111312121014101411131113000d05',
  temp_16: '2600480000012b901412121111131335111314111235141112121211141113341434131213111310131213111311133414101410131114341313121113101313121113111213121113000d05',
  temp_17: '26004800000129921312121112131235121213121235141112121211131213341237121211131212121211131311123613111212111413341137131111131311131113111311131113000d05',
  temp_18: '26004800000129921312121112131236111213121235131212121113121213351236121211131311121211131311123613111311111412351114123512121311131112121312121113000d05',
  temp_19: '26004800000129921412121014111334141113121235131212121211121214341236131111131410131111131410143414101411101314341137143414111310141112121310141112000d05',
  temp_20: '2600480000012a911411131110141334111314111334141113111310131213341236141012131311131111131311133513111311111313351113131113351113141012121113141013000d05',
  temp_21: '26004800000129921213121113111137121212131235121312121113111312361137121211131311121211131212123613111212121213351137131112361311121211131311131111000d05',
  vent_1: '26004800000128931213131113111137131111131335111313111336131014101137141011131311141012121113143411141112141012361410121313111310121312121310121213000d05',
  vent_2: '26004800000128931312121113111236131112131235121312121211123712121137121212121212121211141013133511131311121211371311111412111311111412111311111313000d05',
  vent_3: '26004800000127941311131112121137131111141235111412111311121312351237121112121213121211121213123611131212121211371212111313111212111313111212111412000d05'
};

const bot = slack.rtm.client();
let device = null;
let userInfo = null;
let mentionRegex = null;

function parseIrCommand(text) {
  var match = text.match(/turn\s+ac\s+(on|off)/i);
  if (match) {
    return match[1] === 'on' ? IR_COMMANDS.on : IR_COMMANDS.off;
  }
  var match = text.match(/set\s+ac\s+to\s+(\d+)/i);
  if (match) {
    return IR_COMMANDS['temp_' + match[1]];
  }
  var match = text.match(/set\s+ac\s+vent(?:ilator)?\s+to\s+(\d)/i);
  if (match) {
    return IR_COMMANDS['vent_' + match[1]];
  }
}

const broadlink = new BroadlinkRN();
broadlink.on('deviceReady', function(dev) {
  if (dev.mac.toString('hex') === DEVICE_ADDR) {
    console.log('found device at ' + dev.host.address);
    device = dev;
  }
});
broadlink.discover();

bot.hello(function(payload) {
  console.log('bot is connected');
  slack.auth.test({token: BOT_TOKEN}, function(err, data) {
    console.log('got user info', data.user);
    userInfo = data;
    mentionRegex = new RegExp('^\\s*(<@' + data.user_id + '>|\\b' + data.user + '\\b)(?:[:,\\s]+)(.*)$');
  });
});

function sendMessage(channel, msg) {
  console.log('sending message', msg);
  slack.chat.postMessage({token: BOT_TOKEN, channel: channel, text: msg, as_user: true}, function(err) {
    if (err) {
      console.log(err);
    }
  });
}

bot.message(function(msg) {
  if (userInfo == null) {
    console.log('did not get user info yet, ignoring');
    return;
  }
  var match = msg.text.match(mentionRegex);
  if (!match) {
    return;
  }
  let text = match[2];

  if (text.match(/food|lunch/)) {
    fetchLunch().then((food) => {
      if (!food) {
        sendMessage(msg.channel, 'today no food at brotzeit :(');
      } else {
        sendMessage(msg.channel, 'today at brotzeit: ' + food);
      }
    });
    return;
  }

  var cmd = parseIrCommand(text);
  if (cmd) {
    if (!device) {
      sendMessage(msg.channel, 'the AC is not ready yet :(');
    } else {
      device.sendData(new Buffer(cmd, 'hex'));
      sendMessage(msg.channel, 'aye!');
    }
  }

  console.log('message to bot:', match[2]);
});

bot.listen({token: BOT_TOKEN});
