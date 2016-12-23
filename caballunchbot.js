var https = require('https');
var Botkit = require('botkit');
var token = require('./token');

var controller = Botkit.slackbot({
  debug: false
});

var users;

controller.spawn({
  token: token
}).startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error(err);
  }

  users = payload.users;
  //console.log(users);

});




/* -------------------------------------


	    GENERAL BOT CONVERSATION


--------------------------------------- */

controller.hears(['hello','hi', 'hey'],'direct_message',function(bot,message) {
	bot.reply(message,"Hi there, I'm a lunchbot for The Cabal :simple_smile:. (If you need help interacting with me, just say `help` :wink:)");
});
controller.hears(['hello','hi', 'hey'],'direct_mention,mention',function(bot,message) {
	bot.reply(message,"Hi there, I'm a lunchbot for The Cabal :simple_smile:. (If you need help interacting with me, just send me a DM saying `help` :wink:)");
});

controller.hears(['thanks','thank you'],'direct_message,direct_mention,mention',function(bot,message) {
	bot.reply(message,"You're welcome :simple_smile:");
});

controller.hears(['how are you'],'direct_message,direct_mention,mention',function(bot,message) {
	bot.reply(message,"I'm fine thank you. How are you?");
});

controller.hears(['help'],'direct_message',function(bot,message) {
	bot.reply(message,"Hello! Looks like you need some help. Here are some of the commands you can use with me right now: \n \n `order lunch` - Get everyone's lunch order.  \n `list lunch orders` - List all the lunch orders that have been placed. \n `clear lunch orders` - Reset the lunch orders. \n `lunch ordered` - Tell everyone that you have ordered lunch.");
});









/* -------------------------------------
      _         _        _
     | |       | |      | \
     | |   _   | |      |  \
     | |  | |  | |		 |   \
     | |__| |__| |	 	|    |
	  |	          |		 |    |
	  |           |		|    |
	  |_       _|		 |   /
	    |_   _|			|  /
		  | |			   | |
		  | |			   | |
		  | |			  | |
		  | |			  | |
		  |_|			  |_|


	 ORDER FOOD WITH CABALBOT

--------------------------------------- */



// VARIABLES

var ordererID = ""; // Person making the order

var initiatorID = ""; // Person initiating the lunch order

var eaters = []; // People to collect orders from

var lunchOrders = [];

var restaurant = "";




// GENERAL FUNCTIONS

var getUserChannelID = function(userID, callback) {
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



/* **********************

	STEP 1
	Initiate Order Lunch

********************** */
var orderLunch_initiateOrder = function(convo, message, bot) {
	convo.ask("I see you're hungry! Me too. Should we order lunch now? Say `yes` or `no`",function(response,convo) {


		if ( response.text === 'no' | response.text === 'No' ) {

			bot.say({
			    text: "I guess you're not that hungry then. :expressionless: ",
			    channel: response.channel
	   		});

			convo.stop();

		} else if ( response.text === 'yes' | response.text === 'Yes' ) {

			eaters = [];
			initiatorID = message.user;
			convo.next();

		} else {

			bot.say({
			    text: "Sorry I didn't get that. Please either say `yes` or `no`.",
			    channel: response.channel
	   		});
		}

	});
}



/* **********************

	STEP 2
	Set Restaurant

********************** */
var orderLunch_getRestaurant = function(convo) {
	convo.ask("Great! First, what restaurant are we eating at today?",function(response,convo) {

		restaurant = response.text;

		convo.sayFirst("I :heart: "+restaurant+"!");
		convo.next();

	});
}



/* **********************

	STEP 3
	Get Who to Get Lunch Orders

********************** */
var orderLunch_getEatersToRequest = function(convo, bot) {

	convo.ask("Next, who should I collect orders from? Say `everyone` or just list the `@` usernames of the people I should collect from (in one message please)",function(response,convo) {


		if ( response.text === 'everyone' ) {

			eaters = "everyone";
			convo.next();

		} else if ( response.text.indexOf('@') > -1 ) {

			var rawUsernames = response.text.split(" ");

			var usernames = [];

			rawUsernames.forEach(function(username) {

				username = username.split("<@")[1];
				username = username.split(">")[0];

				usernames.push(username);

			})

			eaters = usernames;
			convo.next();

		} else {

			bot.say({
			    text: "Sorry I didn't get that. Who's orders should I collect? Say `everyone` or just list the `@` usernames of the people I should collect from",
			    channel: response.channel
	   		});
		}




	});



}



/* **********************

	STEP 4
	Set the Orderer

********************** */
var orderLunch_getOrderer = function(convo, bot) {

	convo.ask("Great. Finally, who should I send everyone's orders to? (You can say `me` if I should send the orders to you, or `@` someone else)",function(response,convo) {


		var eatersPlaceholder;

		if ( eaters === "everyone" | eaters === "Everyone" ) {
			eatersPlaceholder = "*everyone's*";
		} else {
			eatersPlaceholder = "*those people's*";
		}


		if ( response.text === 'me' | response.text === 'Me' ) {
			ordererID = response.user;

			convo.sayFirst("Cool, I will collect "+eatersPlaceholder+" orders and send them to you. _scurries away_ :runner::skin-tone-5:");

		} else {
			ordererID = response.text.split('@')[1],
			ordererID = ordererID.split(">")[0];

			convo.sayFirst("Cool, I will collect "+eatersPlaceholder+" orders and send them to <@"+ordererID+">. _scurries away_ :runner::skin-tone-5:");

			orderLunch_informOrderer(bot);
		}


		// GET EVERYONE'S ORDERS
		orderLunch_getEveryonesOrder(bot);

		convo.next();

	});

}


var ordererKeysToSuccess = "As the orderer for today, here are some major :key: :key: to success: \n - At any time, you can see the list of everyone's orders by saying `list lunch orders` here. \n - When you have ordered the food, don't forget to say `lunch ordered` to let everyone know. \n - Finally, you can clear everyone's orders and reset the process by saying `clear lunch orders`.";


// INFORM THE PERSON DOING THE ORDER IS THEY ARE NOMINATED BY SOMEONE ELSE

var orderLunch_informOrderer = function(bot) {

	getUserChannelID(ordererID, function(dmID) {
		bot.say({
		    text: "<@"+initiatorID+"> has nominated you to collect lunch! I will be sending you everyone's orders as they come in. \n \n "+ordererKeysToSuccess,
		    channel: dmID
   		});
	})

}



/* **********************

	STEP 5
	Initiate Conversation with Everyone to Collect Orders From

********************** */
var orderLunch_getEveryonesOrder = function(bot) {


	var initiateConv = function(userID) {
		var message;

		if ( userID === initiatorID ) {

			message = "\n "+ordererKeysToSuccess;

		} else {

			message = "<@"+initiatorID+"> is hungry! We are having lunch at *"+restaurant+"* today. Would you like me to order? Say `give me food` if you want me to take your order, or `not hungry` to pass.";

		}

		getUserChannelID(userID, function(dmID) {
			bot.say({
			    text: message,
			    channel: dmID
	   		});
		})
	}





	if ( eaters === "everyone" ) {
		users.forEach(function(user) {
			if ( user.id != ordererID ) {
				initiateConv(user.id);
			}
		});
	} else {
		eaters.forEach(function(eaterID) {
			initiateConv(eaterID);
		})
	}


}


/* **********************

	STEP 6
	Report Order to Orderer

********************** */
var orderLunch_reportOrder = function(bot, ordererID, order, eaterID) {

	var d = new Date(),
		d = d.toString(),
		d = d.split('GMT')[0];

	lunchOrders.push({
		eaterID: eaterID,
		order: order,
		date: d
	})

	var message = ":fork_and_knife: ORDER IN! *<@"+eaterID+">* ordered *"+order+"* for lunch at "+restaurant+" today.";

	getUserChannelID(ordererID, function(dmID) {
		bot.say({
		    text: message,
		    channel: dmID
   		});
	})
}










/* **********************

	CONTROLLER LISTENERS

********************** */


controller.hears(['order lunch'],'direct_message,direct_mention,mention', function(bot,message) {


  	bot.startConversation(message,function(err,convo) {

  		if ( ordererID != "" ) {

  			bot.say({
			    text: "Looks like <@"+ordererID+"> is already collecting lunch. You can reset this lunch by saying `clear lunch orders` (but maybe check with them first).",
			    channel: message.channel
	   		});

  			convo.stop();

  		} else {

	  		orderLunch_initiateOrder(convo, message, bot);

	  		orderLunch_getRestaurant(convo);

	  		orderLunch_getEatersToRequest(convo, bot);

	  		orderLunch_getOrderer(convo, bot);

  		}

	})

});




controller.hears(['give me food'],'direct_message', function(bot,message) {


	if ( initiatorID != "" && ordererID != "" ) {


		bot.startConversation(message,function(err,convo) {

	  		convo.ask("Great! What do you want to have?",function(response,convo) {

		    	convo.sayFirst("Okay, you ordered: *'" + response.text + "'*. I will pass that on to *<@"+ ordererID + ">* now. Enjoy your lunch! :fork_and_knife:");

		    	orderLunch_reportOrder(bot, ordererID, response.text, message.user);

		    	convo.next();

		    });

		})


	} else {

		bot.reply(message, "It doesn't look like anyone has started the lunch order. To start taking everyone's orders, just say `order lunch`");

	}


});


controller.hears(["not hungry"],'direct_message', function(bot,message) {


	if ( initiatorID != "" && ordererID != "" ) {

		bot.reply(message,"Oshey fitfam! :muscle: I'll let <@"+ ordererID + "> know you're not having lunch today.");

		getUserChannelID(ordererID, function(dmID) {
			bot.say({
			    text: "<@"+ message.user + "> will not be having lunch today.",
			    channel: dmID
	   		});
		})

	} else {

		bot.reply(message, "It doesn't look like anyone has started the lunch order. To start taking everyone's orders, just say `order lunch`");

	}

});





controller.hears('list lunch orders','direct_message,direct_mention,mention', function(bot,message) {

	if ( lunchOrders.length > 0 ) {

		bot.reply(message, "The Cabal is hungry! :fork_and_knife: Here are everyone's orders:")

		lunchOrders.forEach(function(order) {
			bot.reply(message, '- <@' + order.eaterID+ '> ordered for: *'+order.order +'* ('+order.date+')')
		});

		bot.reply(message, "That's it!")

	} else {

		bot.reply(message, "The Cabal is full! No orders have been placed.")

	}

});


controller.hears('clear lunch orders','direct_message,direct_mention,mention', function(bot,message) {


	ordererID = "";
	initiatorID = "";
	restaurant = "";
	lunchOrders = [];
	eaters = [];

	bot.reply(message, "Lunch orders have been cleared. To start collecting lunch, say `order lunch`");

});


controller.hears('lunch ordered','direct_message', function(bot,message) {

	if ( lunchOrders.length > 0 ) {

		bot.reply(message, "Okay! I will let everyone know that their lunch has been ordered. \n Don't forget to clear the list of lunch orders! Just say `clear lunch orders`");

		lunchOrders.forEach(function(order) {
			getUserChannelID(order.eaterID, function(dmID) {
				bot.say({
				    text: "<@"+message.user+"> has put in your order for *'"+order.order+"'*! _dougie_",
				    channel: dmID
		   		});
			})
		})


	} else {

		bot.reply(message, "It doesn't look like there are any lunch orders submitted. Try saying `list lunch orders` to double-check.");

	}


});
