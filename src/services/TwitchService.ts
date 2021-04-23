import {shell, app, ipcMain} from 'electron';
import path from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs';
import moment from 'moment';
// import * as _ from 'lodash';
import { titleCase } from "title-case";

var _ = require('lodash');

var instance = null

const DOMAIN = "https://api.twitch.tv"
const TOP_CLIPS_PATH = "kraken/clips/top"
const HELIX_PATH = "helix/clips"
const MIX_PATH = "mix"
const CLEAN_DIRS = true
import YoutubeService from './YoutubeService'
import DescriptionBuilder from '../classes/Youtube/DescriptionBuilder'
import VideoService from './VideoService'
import SeleniumService from './SeleniumService'
import UtilService from './UtilService'


// TODO: BETTER CONVERTER, CUTOFF FILTER FOR CLIPS
class TwitchService{
	path = app.isPackaged 

	constructor(){}


	async postMixCompilation(params){
		try{
		console.log("preparing dirs... ")
		await this.prepareDirs(params.channels, CLEAN_DIRS)

		let channelData = {}

		console.log("getting clips... ")
		for(let channel of params.channels){
			channelData[channel] = {}

			channelData[channel]['clips'] = await this.getTopClips({
				channel:channel,
				period:'day',
				trending:false,
				limit:30
			})
				
		}
		// console.log("channelData", channelData)

		let randomizedClips:Array<any> = this.makeRandomizedCompilationData(channelData, params.maxVideoLength)
		params.thumb = {}
		for(let i = 0; i < randomizedClips.length; i++){
			let clip = randomizedClips[i]
			let channel = clip.broadcaster.display_name
			console.log("processing clip", channel + " " + clip.views)
			let clipOut = await this.downloadClip(clip.filePath, clip.slug)

			params.backdrop = await this.getBgFromVid(clipOut) //ddddddddddddddddddddddddddddddddd
			break

			if(i == 1){
				params.thumb.primary = `${UtilService.getPath()}\\assets\\imgs\\thumbs\\primary\\${channel.toLowerCase()}-primary-${UtilService.getRandomInt(1,1)}.png`
			}
			if(i == 3){
				params.thumb.secondary = `${UtilService.getPath()}\\assets\\imgs\\thumbs\\secondary\\${channel.toLowerCase()}-secondary-${UtilService.getRandomInt(1,1)}.png`
			}
			if(i == 3){
				params.backdrop = await this.getBgFromVid(clipOut)
			}

		}

		return // ddddddddddddddddddddddddddddddddddd

		let outDir = `${UtilService.getPath()}\\twitch\\${MIX_PATH}`
		this.generateCompilation(randomizedClips, outDir).then((outPath)=>{

			let uploadData = this.makeYTMeta(randomizedClips, params)
			console.log("compiling randomized clips ", uploadData)

			if(params.upload)
				YoutubeService.upload({
					filePath:outPath,
					...uploadData
				})

		}).catch((err)=>{
			console.log("err", err)
		})

		}catch(err){
			console.log(err)
		}

	}

	makeYTMeta(compilationClips, opts = null){

		let title = ""
		let timestamps = []
		let credits = []
		let hashtags = ""
		let playlist = null
		let notify = false
		let channels = []
		let totalDuration = 0

		notify = opts.notify
		//intro
		timestamps.push(
			`${moment().date("2015-01-01").minutes(totalDuration / 60).seconds(totalDuration % 60).format("mm:ss")} Intro\n`
		)
		totalDuration += 6

		for(let clip of compilationClips){
		  let fileDir = `src/twitch/${clip.broadcaster.name}`

			if(!title.includes(clip.title)){
				let source = titleCase(clip.broadcaster.display_name) + " "

				if(clip.title.includes(clip.broadcaster.display_name) || clip.title.toLowerCase().includes('xqc')){
					source = ""
				}

				title += source + clip.title + " | "
			}

		  timestamps.push(
		  	`${moment().date("2015-01-01").minutes(totalDuration / 60).seconds(totalDuration % 60).format("mm:ss")} ${clip.title.toUpperCase()}\n`
		  )
		  totalDuration += clip.duration

		  if(!channels.includes(clip.broadcaster.display_name)){
		  	channels.push(clip.broadcaster.display_name)
			  credits.push(`${clip.broadcaster.channel_url}\n`)
		 		hashtags += `#${clip.broadcaster.display_name} `
		  }

		}

		title = title.substring(0,title.length - 3)

		if(channels.length == 1){
			title = channels[0] + " Special | " + title
			playlist = channels[0]
		}

		if(title.length > 100)
			title = title.substring(0,100)

		let description = new DescriptionBuilder(timestamps, credits, hashtags).build()

		if(channels.length == 1){
			playlist = channels[0]
		}

		// if(channels.length > 1){
		// 	notify = true
		// }


		return {
			title: title,
			description: description,
			playlist:playlist,
			notify:notify
		}


	}

	generateCompilation(clips, outDir){
		let videos = []
		let timestamps = []

		for(let clip of clips){

			videos.push(clip.filePath)
		}

		console.log("videos", videos)

		let videoConfig = {
		  // outPath:`${fileDir}/compilation.mp4`,
		  outDir: outDir,
		  outName:`compilation.mp4`,
		  videos:videos,
		  timestamps: this.getTimestamps(clips)
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

	makeCompilationData(channelData, channel, maxVideoLength){
		
		let totalDuration = 0
		let res = []
		let titlesMem = []

		for(let clip of channelData[channel]['clips']){

			let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
			clip.filePath = `${UtilService.getPath()}\\twitch\\${channel}\\${fileName}`
			clip.title = 
				clip.title.length > 50 ? 
				clip.title.substring(0,50) : 
				clip.title
			clip.title = clip.title.replace(/[^\x00-\x7F]|<|>/g, "")

			totalDuration += clip.duration


			if(!titlesMem.includes(clip.title)){
				console.log("adding " + clip.title + " | total duration: clips.duration")
				titlesMem.push(clip.title)
				res.push(clip)
			}


			if(totalDuration >= maxVideoLength)
				break
		}
		return res
	}

	makeRandomizedCompilationData(channelData, maxVideoLength){
		
		const randProperty = (obj)=> {
	    var keys = Object.keys(obj);
	    return keys[ keys.length * Math.random() << 0];
		}

		let totalDuration = 0
		let res = []
		let titlesMem = []
		//to prevent pop from obscuring the object
		let cdClone = _.cloneDeep(channelData)
		// let cdKeys = Object.keys(cdClone)
		// console.log("using clips from", cdKeys)

		let clips = []

		for(let channel in cdClone){
			for(let clip of cdClone[channel]['clips']){
				clips.push(clip)
			}
		}
		// console.log('trending..',clips)

		clips.sort(function(a, b){return b.views-a.views})

		let identical = 0
		let count = {}

		for(let i = 0; i < clips.length-1; i++){
		  let channel = clips[i].broadcaster.display_name

		  if(!count[channel])
		  	count[channel] = 0

		  count[channel]++

		  if(count[channel] == 5) continue

			if(channel == clips[i+1].broadcaster.display_name){
				identical++

				if(identical == 1){
					let t = clips[i]
					clips[i] = clips[i+1]
					clips[i+1] = t
					identical = 0
				}

			}else{
				identical = 0
			}
			
		}

		for(let c of clips){
			console.log(`${c.broadcaster.display_name} - ${c.views}`)
		}

		while(totalDuration <= maxVideoLength){

			for(let i = 0; i < clips.length; i++){
				try{
					let clip = clips[i]

					if(clip.views < 100) continue

					console.log("channel.. ", clip.broadcaster.display_name)
					// let clip = cdClone[cdKeys[i]]['clips'].shift()
					// console.log("clip = ", clip)
					let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
					clip.filePath = `${UtilService.getPath()}\\twitch\\${clip.broadcaster.display_name}\\${fileName}`
					clip.title = 
						clip.title.length > 50 ? 
						clip.title.substring(0,50) : 
						clip.title
					clip.title = clip.title.replace(/[^\x00-\x7F]|<|>/g, "")

					totalDuration += clip.duration


					if(!titlesMem.includes(clip.title)){
						console.log("adding " + clip.title + " | total duration: " + clip.duration)
						titlesMem.push(clip.title)
						res.push(clip)
					}

				}catch(err){
					console.log(err)
				}

				if(totalDuration >= maxVideoLength)
					break

			}

		}



		return res

	}

	async downloadClip(outPath,slug){
			
		if (await fs.existsSync(outPath)) return

		let clip = await this.getClipData(slug)
		console.log("clipData", clip)

		clip = clip.data[0]

		let downloadUrl =  clip.thumbnail_url.substring(0, clip.thumbnail_url.indexOf('-preview-')) + ".mp4"
		// let fileName = `${clip.id.substr(clip.id - 16)}.mp4`
		// let filePath = fileDir + "/" + fileName


		console.log(">> downloading.. ", downloadUrl)

		return await this.downloadFile(downloadUrl, outPath)

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
		     	resolve(filePath)
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
			instance =  new TwitchService()
		return instance
	}

	async prepareDirs(channels, clean=true){
		if(clean){
			if (await fs.existsSync(`${UtilService.getPath()}\\twitch`)) 
				await fs.rmdirSync(`${UtilService.getPath()}\\twitch`, { recursive: true })
			
			if (!await fs.existsSync(`${UtilService.getPath()}\\twitch`)) 
				await fs.mkdirSync(`${UtilService.getPath()}\\twitch`)
		}

		let mixDir = `${UtilService.getPath()}\\twitch\\${MIX_PATH}`
		if (! await fs.existsSync(mixDir)){
	    await fs.mkdirSync(mixDir)
		}

		for(let channel of channels){
			let channelDir = `${UtilService.getPath()}\\twitch\\${channel}`
			if (! await fs.existsSync(channelDir)){
		    await fs.mkdirSync(channelDir)
			}
		}

	}

	getTimestamps(compilationClips){

		let timestamps = []
		let totalDuration = 0

		timestamps.push({
			time: totalDuration,
			title: "Intro"
		})
		totalDuration += 8

		for(let clip of compilationClips){

			timestamps.push({
				time: totalDuration,
				title: clip.title
			})

			totalDuration += clip.duration
		}

		return timestamps

	}

	async makeTopClipsCompilation(params){

		// for(let channel of params.channels){

		// 	let clips = channelData[channel]['clips']

		// 	let compilationClips = this.makeCompilationData(channelData, channel, params.maxVideoLength)
		//   let fileDir = `src/twitch/${channel}`

		// 	let i = 0

		// 	for(let clip of compilationClips){
		// 		console.log("processing clip", clip)
		// 		i++
				
		// 		await this.downloadClip(fileDir, clip.slug)

		// 		let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
		// 		let filePath = `${this.path}\\${channel}\\${fileName}`

		// 		console.log("uploading clip with title", clip.title)

		// 		if(i <= 5 && params.uploadClips)
		// 			await YoutubeService.upload({
		// 				filePath: filePath,
		// 				title: clip.title,
		// 			})
		// 	}


		// 	let uploadData = this.makeYTMeta(compilationClips)
		// 	console.log("=================uploadData============\n")
		// 	console.log(uploadData)
			
		// 	// this.generateCompilation(fileDir, channel, clips).then((outPath)=>{
		// 	console.log("compiling clips for ", channel)
		// 	this.generateCompilation(compilationClips, `${this.path}\\${channel}`).then((outPath)=>{
		// 		console.log('uploading to youtube')
		// 		// YoutubeService.upload({
		// 		// 	filePath:outPath,
		// 		// 	...uploadData
		// 		// })
		// 	}).catch((err)=>{
		// 		console.log("err", err)
		// 	})

		// }
	}

	getBgFromVid(vid){
		let bg 
		return new Promise(async (resolve,reject)=>{
			let duration = await VideoService.getInformation(vid, 'duration')
			console.log("duration", duration)
			resolve(bg)
		})
	}

	testSelenium(){
		SeleniumService.test()
	}
}

export default instance ? instance : instance = TwitchService.get()
