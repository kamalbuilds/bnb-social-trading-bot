require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios')
const TelegramBot = require('node-telegram-bot-api')


const app = express();

const port = "8080";

// Parse the request body as JSON
app.use(bodyParser.json());
// Modify the API_ID BOT_TOKEN and X_API_KEY in .env file
const API_ID = process.env.API_ID // Zettablock API ID
const BOT_TOKEN = process.env.BOT_TOKEN // Your Telegram Bot Token
const X_API_KEY = process.env.X_API_KEY // Your Zettablock API Key

const bot = new TelegramBot(BOT_TOKEN, { polling: true }) // Create a bot that uses 'polling' to fetch new updates

// Get token data from Zettablock API
async function queryToken(symbol) {
	var result
	const options = {
		method: 'POST',
		url: `https://api.zettablock.com/api/v1/dataset/${API_ID}/graphql`, // Zettablock API endpoint
		headers: {
			accept: 'application/json',
			'X-API-KEY': X_API_KEY, // Your ZettaBlock API Key
			'content-type': 'application/json',
		},
		data: {
			// GraphQL query starts here, token symbol is passed as a variable
			query: `
				{
					records(symbol: "${symbol}", limit: 1 )
					{
						name
						symbol
						address
						supply
						type
						token_authority
					}
				}
			`,
			// GraphQL query ends here
		},
	}

	await axios
		.request(options) // Send the request to Zettablock API
		.then(function (response) {
			// If the request is successful, return the data
			// console.log(response.data.data.records)
			result = response.data.data.records
		})
		.catch(function (error) {
			// If the request is failed, return the error
			console.error(error)
		})
	// return the result array
	return result
}

// listen for start command
bot.onText(/\/start/, (msg) => {
	bot.sendMessage(
	  msg.chat.id,
	  `Welcome to Binance TG Trading Bot
	  
	  To use this bot, enter the command: [ /token TokenName ] 
	  e.g. /token TPS
	  
	  `
	);
  });



// Listen for '/token' command
bot.onText(/\/token/, async (msg) => {
	const chatId = msg.chat.id // Get the chat ID from the message
	const symbol = msg.text.split(' ')[1] // Get the token symbol from the message

	// Query the token data
	var data = await queryToken(symbol)

	// data[0] is the first element of the array, which is the latest record
	// data.length == 0 means the token is not found
	if (data.length == 0) {
		// If the token is not found, send a message
		bot.sendMessage(chatId, 'Token not found, Please check the symbol again')
		return
	} else {
		data = data[0]
	}

	// send token data
	const replyMsg = `
    🪙 BSC Token Data:
    - Binance Mainnet Token Address: ${data.address}
	- Name: ${data.name}
    - Token: ${data.symbol}
    - Supply: ${data.supply}
	- Type: ${data.type}
	- Token Authority: ${data.token_authority}
		
`
	bot.sendMessage(chatId, replyMsg) // Send the message to the chat
})


  // Register handler for Alchemy Notify webhook events on the bsc chain
  app.post("/notify", (req, res) => {
    const webhookEvent = req.body;
    const logs = webhookEvent.event.data.block.logs;
    if (logs.length === 0) {
      console.log("Empty logs array received, skipping");
    } else {
      for (let i = 0; i < logs.length; i++) {
        const topic1 = "0x" + logs[i].topics[1].slice(26); // Remove '0x'
        const topic2 = "0x" + logs[i].topics[2].slice(26); // Remove '0x'
        const amount = parseInt(logs[i].data, 16) / 1e18; // Convert hexadecimal string to decimal number
        const message = `${topic1} sent ${amount} DAI to ${topic2}`;
         
        if (chatId) {
          bot.sendMessage(chatId, message); // Send message to Telegram
        } else {
          console.log(message); // Print message to terminal
        }
      }
    }
    res.sendStatus(200);
  });

  // Listen to Alchemy Notify webhook events
  app.listen(port, () => {
    console.log(`Example Alchemy Notify app listening at ${port}`);
  });