"strict mode";

const https = require('https');
const Botkit = require('botkit');

const token = process.env.SLACK_TOKEN || require('./token') || null;

let payload;

const controller = Botkit.slackbot({
  debug: false,
  interactive_replies: true,
  retry: Infinity
});


// Assume single team mode if we have a SLACK_TOKEN
if (token) {
  console.log('Starting in single-team mode')
  controller.spawn({
    token: token,
    retry: Infinity
  }).startRTM(function (err, bot, payload) {
    if (err) {
      throw new Error(err)
    }

    console.log('Connected to Slack RTM');
    payload = payload;
  })
// Otherwise assume multi-team mode - setup beep boop resourcer connection
} else {
  console.log('Starting in Beep Boop multi-team mode')
  require('beepboop-botkit').start(controller, { debug: true })
}



function getUserChannelID(userID, callback) {
	https.get("https://slack.com/api/im.open?token="+token+"&user="+userID+"&pretty=1", function(response) {

		var body = "";
	    response.on('data', function(d) {
	       	body += d;
	    });

	    response.on('end', function() {
	        var parsed = JSON.parse(body);

	        if ( parsed.ok == true ) {
	        	var channelID = parsed.channel.id;
		        callback(channelID);
	        }

	    });
	});
}



/////



function Order(bot, convo, initiator) {

  this.bot = bot;
  this.convo = convo;

  this.initiator = initiator;

  this.orderer = null;
  this.restaurant = null;

  this.eaters = [];

  this.orders = [];

  this.start();

}


Order.prototype.start = function() {

  this.confirmStart();
  this.getRestaurant();
  this.getEaters();
  this.getOrderer();

}


Order.prototype.confirmStart = function() {

  // this.convo.ask({
  //     attachments:[
  //         {
  //             title: "I see you're hungry! Me too. Should we order lunch now?",
  //             callback_id: 'order_confirm_start',
  //             attachment_type: 'default',
  //             actions: [
  //                 {
  //                     "name":"yes",
  //                     "text": "Yes",
  //                     "value": "yes",
  //                     "type": "button",
  //                 },
  //                 {
  //                     "name":"no",
  //                     "text": "No",
  //                     "value": "no",
  //                     "type": "button",
  //                 }
  //             ]
  //         }
  //     ]
  // },[
  //     {
  //         pattern: "yes",
  //         callback: function(reply, convo) {
  //             convo.next();
  //         }
  //     },
  //     {
  //         pattern: "no",
  //         callback: function(reply, convo) {
  //           this.bot.say({
  //             text: "I guess you're not that hungry then. :expressionless: ",
  //             channel: response.channel
  //           });
  //           convo.stop();
  //         }
  //     },
  //     {
  //         default: true,
  //         callback: function(reply, convo) {
  //             // do nothing
  //         }
  //     }
  // ]);

  const message = "I see you're hungry! Me too. Should we order lunch now? Say `yes` or `no`";

  this.convo.ask(message, (response, convo) => {

    switch(response.text.toLowerCase()) {
      case 'no':
        this.bot.say({
          text: "I guess you're not that hungry then. :expressionless: ",
          channel: response.channel
        });
        convo.stop();
        break;
      case 'yes':
        convo.next();
        break;
      default:
        this.bot.say({
         text: "Sorry I didn't get that. Please either say `yes` or `no`.",
         channel: response.channel
        });
        break;
    }

	});


}


Order.prototype.getRestaurant = function() {

  const message = "Great! First, what restaurant are we eating at today?"

  this.convo.ask(message, (response,convo) => {
		this.restaurant = response.text;
		convo.sayFirst("I :heart: "+this.restaurant+"!");
		convo.next();
	});
}


Order.prototype.getEaters = function() {

  const instruction = "Say `everyone` or just list the `@` usernames of the people I should collect from in one message (like this - `@user @user`)";
  const message = "Next, who should I collect orders from? " + instruction;

  this.convo.ask(message, (response,convo) => {

		if ( response.text.toLowerCase() === 'everyone' ) {

			this.eaters = "everyone";
			convo.next();

		}

    else if ( response.text.indexOf('@') > -1 ) {

			const rawUsernames = response.text.split(" ");
			const usernames = [];

			rawUsernames.forEach(function(username) {
				username = username.split("<@")[1] || null;
				username = username.split(">")[0] || null;
				if (username) usernames.push(username);
			})

			this.eaters = usernames;
			convo.next();

		}


    else {

      this.bot.say({
        text: "Sorry I didn't get that. Who's orders should I collect? " + instruction,
        channel: response.channel
      });
		}

	});
}



Order.prototype.getOrderer = function() {

  const message = "Great. Finally, who should I send everyone's orders to? (You can say `me` if I should send the orders to you, or `@` someone else)";

  this.convo.ask(message, (response,convo) => {

		if ( response.text.toLowerCase() === 'me' ) {
      this.orderer = response.user;
		} else {
      this.orderer = response.text.split('@')[1];
			this.orderer = this.orderer.split(">")[0];
		}

    console.log("this.orderer is", this.orderer);

    convo.stop();


    const finalMessage = `Great! Here are the details. We are ordering from *${this.restaurant}*. <@${this.orderer}> is placing the order so I will go collect orders from *${this.eaters}* and report back to them.`;


    this.bot.say({
      text: finalMessage,
      channel: response.channel
    });

    setTimeout(() => {
      this.informOrderer();
    }, 1000);


	});
}


//


Order.prototype.informOrderer = function() {

  let message = "As the orderer for today, here are some major :key: :key: to success: \n - At any time, you can see the list of everyone's orders by saying `list lunch orders` here. \n - When you have ordered the food, don't forget to say `lunch ordered` to let everyone know. \n - Finally, you can clear everyone's orders and reset the process by saying `clear lunch orders`.";

  if ( this.orderer != this.initiator ) {
    message = "<@"+this.initiator+"> has nominated you to collect lunch! I will be sending you everyone's orders as they come in. \n \n "+message;
  }

  getUserChannelID(this.orderer, (dmID) => {
    this.bot.say({
      text: message,
      channel: dmID
    });
  });

};



Order.prototype.collectOrders = function() {

}


Order.prototype.reportOrder = function() {

}



////////




controller.hears(['order lunch'],'direct_message,direct_mention,mention', function(bot,message) {

  bot.startConversation(message, function(err, convo) {
    new Order(bot, convo, message.user);
  })

});
