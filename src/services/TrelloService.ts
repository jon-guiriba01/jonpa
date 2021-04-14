// require('dotenv').config()
import fetch from 'node-fetch';

var instance = null

class TrelloService{
	
	constructor(){}

	async test(){
		return 'test'
	}

	async moveCardToList(boardName, cardId, toListName) {
		var keys = `key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`

		let boardsRes =  await fetch(`https://api.trello.com/1/members/me/boards?fields=name,url&${keys}`, {
		  headers: {
		    'Accept': 'application/json',
		  },
			method: 'GET',
		}).then(res => {
	 	 return res.json();
		})

		let board = boardsRes.find(e=>e.name == boardName)

		let listsRes =  await fetch(`https://api.trello.com/1/boards/${board.id}/lists?fields=name&${keys}`, {
		  headers: {
		    'Accept': 'application/json',
		  },
			method: 'GET',
		}).then(res => {
	 	 return res.json();
		})

		let list = listsRes.find(e=>e.name == toListName)

		let cardsRes =  await fetch(`https://api.trello.com/1/cards/${cardId}/?idList=${list.id}&${keys}`, {
		  headers: {
		    'Accept': 'application/json',
		  },
			method: 'PUT',
		}).then(res => {
	 	 return res.json();
		})
	}

	async getCardsOfList(boardName,listName) {
		let cards = ['test']
		var keys = `key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`

		let boardsRes = await fetch(`https://api.trello.com/1/members/me/boards?fields=name,url&${keys}`, {
		  headers: {
		    'Accept': 'application/json',
		  },
			method: 'GET',
		}).then(res => {
	 	 return res.json();
		})

		let board = boardsRes.find(e=>e.name == boardName)

		let listsRes =  await fetch(`https://api.trello.com/1/boards/${board.id}/lists?fields=name&${keys}`, {
		  headers: {
		    'Accept': 'application/json',
		  },
			method: 'GET',
		}).then(res => {
	 	 return res.json();
		})

		let list = listsRes.find(e=>e.name == listName)

		let cardsRes = await fetch(`https://api.trello.com/1/boards/5feafe599558f336804a7e32/cards?fields=name,idList&${keys}`, {
		  headers: {
		    'Accept': 'application/json',
		  },
			method: 'GET',
		}).then(res => {
	 	 return res.json();
		})

		cards = cardsRes.filter(e=>e.idList == list.id)

		return cards
	}	

	static get(){
		if(instance == null)
			instance =  new TrelloService()
		return instance
	}
}

export default instance ? instance : instance = TrelloService.get()