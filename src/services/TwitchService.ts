import {shell, app, ipcMain} from 'electron';
import path from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs';
import moment from 'moment';
// import * as _ from 'lodash';
import UtilService from './UtilService'
import express from 'express'
import bodyParser from 'body-parser'


var _ = require('lodash');

var instance = null

const DOMAIN = "https://api.twitch.tv"
const TOP_CLIPS_PATH = "kraken/clips/top"
const HELIX_PATH = "helix/clips"
const MIX_PATH = "mix"
const CLEAN_DIRS = true

// TODO: center text and font
class TwitchService{
	server
	constructor(){}

	async getTopClips(params){

		let paramsStr = 
			`?channel=${params.channel}&period=${params.period}&trending=${params.trending}&limit=${params.limit}`
		
		let res = await fetch(`${DOMAIN}/${TOP_CLIPS_PATH}${paramsStr}`, {
		  headers: {
		    "Accept": "application/vnd.twitchtv.v5+json",
		    "client-id": process.env.TWITCH_CLIENT_ID,
		    "Authorization": `Bearer ${process.env.TWITCH_OAUTH}`, 
		  },
			method: 'GET',
		}).then(res => {
	 	 return res.json()
		}).catch(res=>{
			console.log("getTopClips err")
			console.log(res)
		})

		return res.clips
	}

	downloadClip(clip,dir){
		console.log("downloadClip..", clip)
		let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
		let downloadUrl =  ""
		try{
			downloadUrl = clip.thumbnail_url.substring(0, clip.thumbnail_url.indexOf('-preview-')) + ".mp4"
		}catch(err){
			downloadUrl = clip.thumbnails['small'].substring(0, clip.thumbnails['small'].indexOf('-preview-')) + ".mp4"
		}

		let filePath = `${dir}\\${fileName}`

		console.log("downloading.. ", {
			url:downloadUrl,
			filePath:filePath
		})

		return new Promise(async(resolve, reject) => {
			 await fetch(`${downloadUrl}`, {
			  headers: {
			    "client-id": process.env.TWITCH_CLIENT_ID,
			    "Authorization": `Bearer ${process.env.TWITCH_OAUTH}`, 
			  },
				method: 'GET',
			}).then(res => {
				const fileStream = fs.createWriteStream(filePath)
			     res.body.pipe(fileStream);
			     res.body.on("error", reject);
			     fileStream.on("finish", ()=>{
						console.log("download success!.. ", filePath)
			     	resolve(filePath)
			     });
			})
	   });

	}

	openWebhookServer(){
		// return new Promise((resolve,reject)=>{
		// 	resolve()
		// 	reject()
		// })
		// http://localhost:9876/oauth2callback
		this.server = express().use(bodyParser.json())
		this.server.listen(process.env.PORT, () => console.log('Twitch Webhook server is listening'));
		// setTimeout(()=>{
		//   try{
		//     this.server.close()
		//   }catch(err){
		//     // console.log(err)
		//   }
		//   reject(false)
		// },30000)

		this.server.get('/webhook/twitch', async(req, res) => { 
		try{
			console.log("twitch webhook..",res)
		  // let code = req.query.code
		  // var {tokens} = await this.oAuth2Client.getToken(code)

		  // fs.writeFile(this.TOKEN_PATH, JSON.stringify(tokens), (err) => {
		  //   if (err) return console.error(err);
		  // });

		  // this.oAuth2Client.setCredentials(tokens);
		  // EventService.pub('auth:success', this.oAuth2Client)
		  // resolve(true)

		  res.sendStatus(200)
		  // this.server.close()
		}catch(err){
		  console.log(err)
		  // reject(false)
		} 


		})
	}

	async


  async getLiveChannels(params){
		console.log("getLiveChannels", params.channels)
		let paramsStr = "?1=1"
		for(let channel of params.channels){
			paramsStr += `&user_login=${channel}`
		}
  	// let res = await fetch(`https://api.twitch.tv/kraken/streams${paramsStr}`, {
		let res = await fetch(`https://api.twitch.tv/helix/streams${paramsStr}`, {
		  headers: {
		    "Accept": "application/vnd.twitchtv.v5+json",
		    "client-id": process.env.TWITCH_CLIENT_ID,
		    "Authorization": `Bearer ${process.env.TWITCH_OAUTH}`, 
		  },
			method: 'GET',
		}).then(res => {
			let json = res.json()
	 	 return json
		})

		console.log("followChannel res", res)
	
		let channels = []
		let streams = []

		for(let stream of res.data){
			console.log("stream", stream)
			if(stream.type == 'live'){
				for(let c of params.channels){
					if(c.toLowerCase() == stream.user_login.toLowerCase()){
						channels.push(c)
						streams.push(stream)
					}
				}
			}
		}

		return {
			channels:channels,
			streams:streams
		}
	}



	static get(){
		if(instance == null)
			instance =  new TwitchService()
		return instance
	}
}

export default instance ? instance : instance = TwitchService.get()



// 		let paramsStr = 
// 			`?user_id=kkatamina`
// 		let res = await fetch(
// `https://api.twitch.tv/helix/webhooks/hub?hub.callback=http://localhost:9876/twitch/webhook&hub.mode=subscribe`+
// `&hub.topic=https://api.twitch.tv/helix/streams?user_id=kkatamina&hub.lease_seconds=600`, {
// 		  headers: {
// 		    "Accept": "application/vnd.twitchtv.v5+json",
// 		    "client-id": process.env.TWITCH_CLIENT_ID,
// 		    "Authorization": `Bearer ${process.env.TWITCH_OAUTH}`, 
// 		  },
// 			method: 'POST',
// 		}).then(res => {
// 	 	 return res.json()
// 		}).catch(res=>{
// 			console.log("getTopClips err")
// 			console.log(res)
// 		})
// 			console.log("getTopClips res", res)