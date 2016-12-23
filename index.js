const https = require('https');
const Botkit = require('botkit');

const token = require('./token');

const controller = Botkit.slackbot({ debug: false }); // Configure for single team

controller.spawn({
  token: token
}).startRTM(function(err,bot,payload) {
  if (err) throw new Error(err)
});





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

  const instruction = "Say `everyone` or just list the `@` usernames of the people I should collect from in one message (like this - `@user @user`)"
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

      bot.say({
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
			convo.sayFirst("Cool, I will collect the orders and send them to you. _scurries away_ :runner::skin-tone-5:");

		} else {

      this.orderer = response.text.split('@')[1];
			this.orderer = this.orderer.split(">")[0];

			convo.sayFirst("Cool, I will collect the orders and send them to <@"+this.orderer+">. _scurries away_ :runner::skin-tone-5:");

			//orderLunch_informOrderer(bot);
		}


		// GET EVERYONE'S ORDERS
		//orderLunch_getEveryonesOrder(bot);

    console.log(this.orderer)
    console.log(this.restaurant)
    console.log(this.initiator)
    console.log(this.eaters)


		convo.stop();

	});
}


//


Order.prototype.informOrderer = function() {

  let message = "As the orderer for today, here are some major :key: :key: to success: \n - At any time, you can see the list of everyone's orders by saying `list lunch orders` here. \n - When you have ordered the food, don't forget to say `lunch ordered` to let everyone know. \n - Finally, you can clear everyone's orders and reset the process by saying `clear lunch orders`.";

  if ( this.orderer != this.initiator ) {
    message = "<@"+this.initiator+"> has nominated you to collect lunch! I will be sending you everyone's orders as they come in. \n \n "+message;
  }

  getUserChannelID(this.orderer, function(dmID) {
    bot.say({
      text: message,
      channel: dmID
    });
  });


};



Order.prototype.getOrders = function() {

}


Order.prototype.reportOrders = function() {

}



////////




controller.hears(['order lunch'],'direct_message,direct_mention,mention', function(bot,message) {

  bot.startConversation(message, function(err, convo) {

    new Order(bot, convo, message.user);

  })

});
