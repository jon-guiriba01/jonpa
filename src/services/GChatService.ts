const {shell} = require('electron');
const fetch = require('node-fetch');


var instance = null

class GChatService{

	constructor(){}

	publishToWebhook(webhookUrl, text) {
		const data = JSON.stringify({
		  'text': text,
		});

		fetch(webhookUrl, {
		  method: 'POST',
		  headers: {
		    'Content-Type': 'application/json; charset=UTF-8',
		  },
		  body: data,
		}).then((response) => {
		  // console.log(response);
		});
	}	

	static get(){
		if(instance == null)
			instance =  new GChatService()
		return instance
	}
}

// module.exports.GChatService = GChatService.get()

export default instance ? instance : instance = GChatService.get()