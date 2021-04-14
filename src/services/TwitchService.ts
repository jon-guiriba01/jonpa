import {shell, app, ipcMain} from 'electron';
import path from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs';
import moment from 'moment';

var instance = null

const DOMAIN = "https://api.twitch.tv"
const TOP_CLIPS_PATH = "kraken/clips/top"
const HELIX_PATH = "helix/clips"
import YoutubeService from './YoutubeService'
import VideoService from './VideoService'
import SeleniumService from './SeleniumService'

class ScriptService{
	path = app.isPackaged 
		? path.join(process.resourcesPath, "\\src\\local\\") 
		: path.join(__dirname, '../twitch') 
	constructor(){}

	async postTopClips(params){

		for(let channel of params.channels){
			let topClips = await this.getTopClips({
				channel:channel,
				period:'month',
				trending:true,
				limit:30
			})
			let clips = this.filterClips(topClips, params.maxVideoLength)
			let trueFileDir = `${this.path}\\${channel}`
		  let fileDir = `src/twitch/${channel}`


			let i = 0

			for(let clip of clips){
				console.log("processing clip")
				console.log(clip)
				i++
				
				await this.downloadClip(fileDir, clip.slug)

				let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
				let trueFilePath = `${trueFileDir}\\${fileName}`
				let title = clip.title.length > 50 ? clip.title.substring(0,50) : clip.title
				title = title.replace(/[^\x00-\x7F]|<|>/g, "")

				console.log("uploading clip with title", title)

				// if(i <= 5)
				// 	await YoutubeService.upload({
				// 		filePath: trueFilePath,
				// 		title: title,
				// 	})
			}


			let uploadData = this.makeUploadData(clips)
			console.log("=================uploadData============\n")
			console.log(uploadData)
			
			// this.generateCompilation(fileDir, channel, clips).then((outPath)=>{
			this.generateCompilation(trueFileDir, channel, clips).then((outPath)=>{
				console.log('uploading to youtube')
				YoutubeService.upload({
					filePath:trueFileDir+"\\compilation.mp4",
					...uploadData
				})
			}).catch((err)=>{
				console.log("err", err)
			})

		}
	}


	makeUploadData(clips){

		let title = ""
		let timestamps = []
		let credits = []
		let hashtags = ""
		let playlist = null
		let notify = false
		let channels = []
		let totalDuration = 0
		for(let clip of clips){
		  let fileDir = `src/twitch/${clip.broadcaster.name}`
			let clipTitle = clip.title.length > 50 ? clip.title.substring(0,50) : clip.title
			clipTitle = clipTitle.replace(/[^\x00-\x7F]<>/g, "")

			if(!title.includes(clipTitle))
				title += clipTitle + " | "

			let min = totalDuration / 60
			let sec = totalDuration % 60

		  timestamps.push(
		  	`${moment().date("2015-01-01").minutes(min).seconds(sec).format("mm:ss")} ${clipTitle}\n`
		  )

		  totalDuration += clip.duration

		  if(!channels.includes(clip.broadcaster.display_name)){
		  	channels.push(clip.broadcaster.display_name)
			  credits.push(`${clip.broadcaster.channel_url}\n`)
		 		hashtags += `#${clip.broadcaster.display_name} `
		  }

		}
		title = title.substring(0,title.length - 3)
		
		if(title.length > 100)
			title = title.substring(0,100)

		let description = ""

		if(timestamps.length > 0)
			description += "Timestamps:\n\n"

		for(let t of timestamps){
			description += t
		}

		description += "Credits:\n\n"

		for(let c of credits){
			description += c
		}

		description += "\n" + hashtags

		if(channels.length == 1){
			playlist = channels[0]
		}

		return {
			title: title,
			description: description,
			playlist:playlist,
			notify:notify
		}


	}

	generateCompilation(fileDir, channel, clips){
		console.log("generateCompilation for " + channel)

		let videos = []

		for(let clip of clips){
			let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
			// let filePath = `${fileDir}/${fileName}`
			let filePath = `${fileDir}\\${fileName}`

			videos.push(filePath)
		}


		console.log("videos", videos)

		let videoConfig = {
		  // outPath:`${fileDir}/compilation.mp4`,
		  outPath:`${fileDir}`,
		  outName:`compilation.mp4`,
		  videos:videos,
		}

		return VideoService.compile(videoConfig)

	}

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
	 	 return res.json();
		})

		return res.clips
	}

	filterClips(clips, maxVideoLength){
		
		let totalDuration = 0
		let res = []

		for(let clip of clips){
			totalDuration += clip.duration

			try{
				console.log("adding " + clip.title + " | total duration: clips.duration")
			}catch(err){}

			res.push(clip)
			if(totalDuration >= maxVideoLength)
				break
		}
		return res
	}


	async downloadClip(fileDir,slug){
		
		let clip = await this.getClipData(slug)
		console.log(">>clip")
		console.log(clip)
		clip = clip.data[0]

		let downloadUrl =  clip.thumbnail_url.substring(0, clip.thumbnail_url.indexOf('-preview-')) + ".mp4"
		let fileName = `${clip.id.substr(clip.id - 16)}.mp4`
		let filePath = fileDir + "/" + fileName

		if (! await fs.existsSync(fileDir)){
	    await fs.mkdirSync(fileDir)
		}

		console.log("downloading.. ", downloadUrl)

		return await this.downloadFile(downloadUrl, filePath)

	}

	async downloadFile(downloadUrl, filePath){

		return await fetch(`${downloadUrl}`, {
		  headers: {
		    "client-id": process.env.TWITCH_CLIENT_ID,
		    "Authorization": `Bearer ${process.env.TWITCH_OAUTH}`, 
		  },
			method: 'GET',
		}).then(res => {
			const fileStream = fs.createWriteStream(filePath)
			return new Promise((resolve, reject) => {
		     res.body.pipe(fileStream);
		     res.body.on("error", reject);
		     fileStream.on("finish", ()=>{
					console.log("download success!")
		     	resolve(null)
		     });
		   });
		})

	}

	async getClipData(slug){
		let paramsStr = 
			`?id=${slug}`
		
		return await fetch(`${DOMAIN}/${HELIX_PATH}${paramsStr}`, {
		  headers: {
		    "Accept": "application/vnd.twitchtv.v5+json",
		    "client-id": process.env.TWITCH_CLIENT_ID,
		    "Authorization": `Bearer ${process.env.TWITCH_OAUTH}`, 
		  },
			method: 'GET',
		}).then(res => {
			return res.json()
		})

	}

	static get(){
		if(instance == null)
			instance =  new ScriptService()
		return instance
	}

	testSelenium(){
		SeleniumService.test()
	}
}

export default instance ? instance : instance = ScriptService.get()
