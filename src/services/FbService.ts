import fetch from 'node-fetch';
import * as http from 'http';
import * as url from 'url';

import express from 'express'
import bodyParser from 'body-parser'

// Sets server port and logs message on success
var instance = null

class FbService{
	PORT = 9876
	fbServer
	constructor(){
 		// this.fbServer = express().use(bodyParser.json())
 		// this.fbServer.listen(this.PORT, () => console.log('webhook is listening'));

 		// this.fbServer.post('/webhook', (req, res) => {  
 		//   let body = req.body;

 		//   // Checks this is an event from a page subscription
 		//   if (body.object === 'page') {

 		//     // Iterates over each entry - there may be multiple if batched
 		//     body.entry.forEach(function(entry) {

 		//       // Gets the message. entry.messaging is an array, but 
 		//       // will only ever contain one message, so we get index 0
 		//       let webhook_event = entry.messaging[0];
 		//       console.log(webhook_event);
 		//     });

 		//     // Returns a '200 OK' response to all requests
 		//     res.status(200).send('EVENT_RECEIVED');
 		//   } else {
 		//     // Returns a '404 Not Found' if event is not from a page subscription
 		//     res.sendStatus(404);
 		//   }

 		// })

 		// // Adds support for GET requests to our webhook
 		// this.fbServer.get('/webhook', (req, res) => {

 		//   // Your verify token. Should be a random string.
 		//   let VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN
 		    
 		//   // Parse the query params
 		//   let mode = req.query['hub.mode'];
 		//   let token = req.query['hub.verify_token'];
 		//   let challenge = req.query['hub.challenge'];
 		    
 		//   // Checks if a token and mode is in the query string of the request
 		//   if (mode && token) {
 		  
 		//     // Checks the mode and token sent is correct
 		//     if (mode === 'subscribe' && token === VERIFY_TOKEN) {
 		      
 		//       // Responds with the challenge token from the request
 		//       console.log('WEBHOOK_VERIFIED');
 		//       res.status(200).send(challenge);
 		    
 		//     } else {
 		//       // Responds with '403 Forbidden' if verify tokens do not match
 		//       res.sendStatus(403);      
 		//     }
 		//   }
 		// });

	}

	// localhost:1337/webhook?hub.verify_token=${process.env.FB_VERIFY_TOKEN}&hub.challenge=CHALLENGE_ACCEPTED&hub.mode=subscribe
	// alhost:1337/webhook" -d '{"object": "page", "entry": [{"messaging": [{"message": "TEST_MESSAGE"}]}]}
	async test() {
		let fbtest = await fetch(`http://localhost:${this.PORT}/webhook?hub.verify_token=${process.env.FB_VERIFY_TOKEN}&hub.challenge=CHALLENGE_ACCEPTED&hub.mode=subscribe`, {
		  headers: {
		  },
			method: 'GET',
		}).then(res => {
			console.log("fbtest ")
			console.log(res)
		})

		console.log("fbtest ", fbtest)
	}	
	static get(){
		if(instance == null)
			instance =  new FbService()
		return instance
	}
}

export default instance ? instance : instance = FbService.get()
