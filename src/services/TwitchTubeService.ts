import {shell, app, ipcMain} from 'electron';
import path from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs';
import moment from 'moment';
// import * as _ from 'lodash';
import { titleCase } from "title-case";
import YoutubeService from './YoutubeService'
import DescriptionBuilder from '../classes/Youtube/DescriptionBuilder'
import {ThumbnailBuilder} from '../classes/Youtube/ThumbnailBuilder'
import VideoService from './VideoService'
import TwitchService from './TwitchService'
import SeleniumService from './SeleniumService'
import UtilService from './UtilService'
import Storage from 'node-storage'

var _ = require('lodash');

var instance = null

const DOMAIN = "https://api.twitch.tv"
const TOP_CLIPS_PATH = "kraken/clips/top"
const HELIX_PATH = "helix/clips"
const MIX_PATH = "mix"
const CLEAN_DIRS = false

class TwitchTubeService{
	constructor(){}

	async makeShorts2(params){
		await this.prepareShortsDirs([params.channel])
		console.log("making shorts for.. " + params.channel)
		let clips = await TwitchService.getTopClips({
			channel:params.channel,
			period:'week',
			trending:false,
			limit:30
		})

		if(!clips){
			console.log("no clips found..")
			return
		}

		var store = await new Storage(`${UtilService.getPath()}/twitch-storage`)

		let prevTitlesEntry = `${params.channel}.shorts.prevTitles`
		let prevTitles = store.get(prevTitlesEntry) || []

		clips.map(e=>console.log(e.views + " " + e.title + " " + moment().diff(moment(e.created_at),'hours') +" hours since") )

		clips = clips.filter( e=>{
      return e.views > params.viewThreshold &&
      	moment().diff(moment(e.created_at),'hours') < 72 &&
      	prevTitles.map(e=>e.toLowerCase()).includes(e.title.toLowerCase()) 
    })

		clips.sort( (a,b)=>{
      return moment(b.created_at).diff(moment(a.created_at), 'seconds')
    })

		clips.map(e=>console.log(e.views + " " + e.title + " " + moment().diff(moment(e.created_at),'hours') +" hours since") )


		let lastUsedEntry = `${params.channel}.shorts.lastUsed`
		let lastUsed = store.get(lastUsedEntry)
		if(lastUsed && moment().diff(moment(lastUsed), 'minutes') < 30){
		  console.log("already did video for "+ params.channel + " skipping...")
		  return
		}


    let selectedClip = clips[0]

    if(!selectedClip) {
      console.log("no suitable clip for "+ params.channel + " skipping...")
    	return
    }


    selectedClip.title = 
      selectedClip.title.length > 50 ? 
      selectedClip.title.substring(0,50) : 
      selectedClip.title
    selectedClip.title = selectedClip.title.replace(/[^\x00-\x7F]|<|>/g, "")
    prevTitles.push(selectedClip.title)

    console.log('making video for ' + params.channel + " - " + selectedClip.views + " " + selectedClip.title)

    let downloadDir = `${UtilService.getPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}`
    
    let filePath = await TwitchService.downloadClip(selectedClip, downloadDir)
    console.log("downloaded..  ", filePath)

    store.put(lastUsedEntry, moment().format())
    store.put(prevTitlesEntry, prevTitles)

    let uploadData = await this.makeShortsYTMeta(selectedClip, {
      channel:params.channel,
      notify:params.notify
    })

    
    console.log("YT Metadata ", uploadData)

		if(params.upload){
    	console.log("uploading to youtube..")
			YoutubeService.upload({
				filePath:UtilService.getLocalRoot()+"\\"+filePath,
				...uploadData
			})
		}

	}
	async makeShorts(params){
		console.log("makeShorts.. ", params)
		await this.prepareShortsDirs(params.channels)
		let interval = params.interval
		let channels = await this.getChannelsData(params.channels, interval)

		var store = await new Storage(`${UtilService.getPath()}/twitch-storage`)
		let promises = []

		for(let streamer in channels){

		    try{
		      let stream = params.streams.find(e=>e.user_name.toLowerCase() == streamer.toLowerCase())
		      console.log("streamData", stream)

		      if(!channels[streamer]['clips']){
		      	return
		      }
		      console.log(`starting shorts for ${streamer}.. count:${channels[streamer]['clips'].length}` )
		      let sortedClips = channels[streamer]['clips'].sort( (a,b)=>{
		        return moment(b.created_at).diff(moment(a.created_at), 'seconds')
		      })
		      let lastUsedEntry = `${streamer}.shorts.lastUsed`
		      let prevTitlesEntry = `${streamer}.shorts.prevTitles`

		      let lastUsed = store.get(lastUsedEntry)
		      if(lastUsed && moment().diff(moment(lastUsed), 'minutes') < 30){
		        console.log("already did video for "+ streamer + " skipping...")
		        return
		      }

		      let prevTitles = store.get(prevTitlesEntry) || []
		      // console.log(`prevTitles - ${streamer} - ${prevTitles.join(',')}` )

		      let clip
		      for(let i=0; i < sortedClips.length; i++){
		      	let isStreamTitle = prevTitles.map(e=>e.toLowerCase()).includes(sortedClips[i].title.toLowerCase()) 
		      	let isUsedTitle = sortedClips[i].title.toLowerCase() == stream.title.toLowerCase() 
		      	let isLowViews = sortedClips[i].view < params.viewThreshold
		      	console.log("c " + sortedClips[i].title + `st:${isStreamTitle},ut:${isUsedTitle},lv:${isLowViews}`)
	          if(
	          	!isStreamTitle
	          	&& !isUsedTitle
	          	&& !isLowViews
	          ){
	        		clip = sortedClips[i]
	        		break
	          }
		      }
		      if(!clip) {
		        console.log("no suitable clip for "+ streamer + " skipping...")
		      	return
		      }


	        clip.title = 
	          clip.title.length > 50 ? 
	          clip.title.substring(0,50) : 
	          clip.title
	        clip.title = clip.title.replace(/[^\x00-\x7F]|<|>/g, "")

	        prevTitles.push(clip.title)

		      console.log('making video for ' + streamer + " - " + clip.views + " " + clip.title)

		      let downloadDir = `${UtilService.getPath()}\\twitch\\shorts\\${clip.broadcaster.display_name}`
		      
		      let filePath = await TwitchService.downloadClip(clip, downloadDir)
		      console.log("downloaded..  ", filePath)

		      store.put(lastUsedEntry, moment().format())
		      store.put(prevTitlesEntry, prevTitles)

		      let uploadData = await this.makeShortsYTMeta(clip, {
		        channel:streamer,
		        notify:params.notify
		      })

		      
		      console.log("YT Metadata ", uploadData)
		      console.log(clip.title.toLowerCase() + ' ' + stream.title.toLowerCase())

		      // if(params.upload){
		      console.log("uploading to youtube..")

					if(params.upload){
						YoutubeService.upload({
							filePath:UtilService.getLocalRoot()+"\\"+filePath,
							...uploadData
						})
					}
		    }catch(err){
		      console.log(err)
		    }
		}
	}

	async postMixCompilation(params){
		let processId = UtilService.getUqId()

		console.log("PROCESS ID", processId)
		console.log("preparing dirs... ")
		await this.prepareDirs(params.channels, CLEAN_DIRS)

		console.log("getting channel data... ")
		let channels = await this.getChannelsData(params.channels, params.interval)

		for(let streamer in channels){
			console.log(streamer + " - " + channels[streamer]['clips'].length)
		}

		console.log("filterCompilationClips..")
		let clips:Array<any> = this.filterCompilationClips(channels, {
			maxVideoLength:params.maxVideoLength, 
			minVideoLength:params.minVideoLength,
			viewThreshold:params.viewThreshold,
			channels:params.channels
		})

		console.log("download clips..")
		await this.downloadClips(clips)

		console.log("generate compilation..")
		let outDir = `${UtilService.getPath()}\\twitch\\${MIX_PATH}`
		let compilationPath = await this.generateCompilation(clips, outDir, processId)
		console.log("creating YT meta.. ")

		let thumb:any = await this.getCompilationThumbnailData(clips)
		let tBuilder = new ThumbnailBuilder(thumb.path, {mode: ThumbnailBuilder.MODE.COMPILATION})
		tBuilder.setImage('primary', thumb.images[0])
		tBuilder.setImage('panel1bg', thumb.images[1])
		tBuilder.setImage('secondary', thumb.images[2])
		tBuilder.setImage('panel2bg', thumb.images[3])
		tBuilder.setImage('panel3bg', thumb.images[4])
		tBuilder.setText('title1', thumb.texts[0])
		tBuilder.setText('title2', thumb.texts[1])
		tBuilder.setText('title3', thumb.texts[2])
		await tBuilder.build()

		let uploadData = await this.makeYTMeta(clips, {...params, thumb:thumb})

		console.log("YT Metadata ", uploadData)

		if(params.upload)
			YoutubeService.upload({
				filePath: UtilService.getLocalRoot()+"\\"+compilationPath,
				...uploadData
			})
	}

	async getCompilationThumbnailData(clips){
		let thumb = {
			images:[],
			texts:[],
			path: `${UtilService.getLocalPath()}\\twitch\\mix\\thumbnail_${UtilService.getUqId()}.png`,
		}
		
		try{

			let i = 0
			let prevChannel
			let mem = {}

			for(let clip of clips){
				let channel = clip.broadcaster.display_name
				
				if(!mem[channel]) mem[channel] = true
				else continue

				let limit = 1
				
				if(!thumb.images[1]){
					let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\primary`)

					for(let file of files){
						if(file.includes('${channel.toLowerCase()}-primary'))
							limit++
					}
					console.log(`${channel.toLowerCase} - limit: ${limit} `)

					thumb.images[0] = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\primary\\${channel.toLowerCase()}-primary-${UtilService.getRandomInt(1,limit)}.png`
					thumb.texts[0] = clip.title

					let outPath = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\generated\\panel1bg.png`
					if(!await fs.existsSync(clip.filePath)){
						await this.downloadClip(clip.filePath, clip.slug)
					}

					await this.getBgFromVid(clip.filePath, outPath)
					thumb.images[1] = outPath
				}
				else if(!thumb.images[2]){

					let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\secondary`)
					for(let file of files){
						if(file.includes('${channel.toLowerCase()}-secondary'))
							limit++
					}
					console.log(`${channel.toLowerCase} - limit: ${limit} `)

					let outPath = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\generated\\panel2bg.png`
					if(!await fs.existsSync(clip.filePath)){
						await this.downloadClip(clip.filePath, clip.slug)
					}
					await this.getBgFromVid(clip.filePath, outPath)

					thumb.images[2] = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\secondary\\${channel.toLowerCase()}-secondary-${UtilService.getRandomInt(1,limit)}.png`
					thumb.texts[1] = clip.title
					thumb.images[3] = outPath
				}
				else if(!thumb.images[4]){

					let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\third`)
					for(let file of files){
						if(file.includes('${channel.toLowerCase()}-third'))
							limit++
					}
					console.log(`${channel.toLowerCase} - limit: ${limit} `)

					thumb.images[4] = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\third\\${channel.toLowerCase()}-third-${UtilService.getRandomInt(1,limit)}.png`
					thumb.texts[2] = clip.title
					console.log("thumb.images[4]", thumb.images[4])
					console.log("thumb.texts[2]", clip.title)
				}
				else if(!thumb.images[0]){
					// let outPath = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\bg.jpg`
					// await this.getBgFromVid(clip.filePath, outPath)
					// thumb.images[0] = outPath
				}

				prevChannel = channel
				i++
			}

			// thumb.images[3] =  `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\bubble_long.png`
			// thumb.images[4] = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\bubble.png`

		}catch(err){
			console.log("error")
		}

		return thumb
	}
	async getSpecialThumbnailData(clips){
		let thumb = {
			images:[],
			texts:[],
			path: `${UtilService.getLocalPath()}\\twitch\\mix\\thumbnail.jpg`,
		}

		let channel = clips[0].broadcaster.display_name
		
		thumb.images[1] = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\special\\${channel.toLowerCase()}-special-${UtilService.getRandomInt(1,1)}.png`
		let outPath = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\bg.jpg`
		await this.getBgFromVid(clips[0].filePath, outPath)
		thumb.images[0] = outPath


		return thumb
	}

	async downloadClips(clips){

		for(let i = 0; i < clips.length; i++){
			let clip = clips[i]
			let channel = clip.broadcaster.display_name

			console.log("downloading clip.. ", channel + " " + clip.views)

			let clipOut = await this.downloadClip(clip.filePath, clip.slug)
		}
	}

	async getChannelsData(channels, interval){

		let res = {}

		for(let channel of channels){
			res[channel] = {}

			res[channel]['clips'] = await TwitchService.getTopClips({
				channel:channel,
				period:interval,
				trending:false,
				limit:30
			})
				
		}

		return res
	}

	//coomer farmer on the job - jinnytty
	//POG - daph
	async makeShortsYTMeta(clip, params){

		let title = clip.title + " | " +  clip.broadcaster.display_name + " #shorts"
		let description = 
		`#${clip.broadcaster.display_name} \n\n`+
		`Historical Date: ${moment(clip.created_at).format('MMM DD, YYYY hh:mm:ss')}\n\n`+
		`Vod Moment: ${clip.vod.url} \n\n`+
		`https://www.twitch.tv/${clip.broadcaster.display_name} \n\n`

		return {
			title: title,
			description: description,
			playlist:null,
			notify:params.notify,
			thumbnail:null
		}

	}
	async makeYTMeta(compilationClips, opts = null){

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
		// timestamps.push(
		// 	`${moment().date("2015-01-01").minutes( totalDuration/60 ).seconds(totalDuration % 60).format("m:ss")} Intro\n`
		// )
		// totalDuration += 6
 
		let names = ['xqc', 'yuno', 'poki', 'tina', 'jasmine', 'daph']

		for(let clip of compilationClips){

			  if(!channels.includes(clip.broadcaster.display_name)){
			  	channels.push(clip.broadcaster.display_name)
				  credits.push(`${clip.broadcaster.channel_url}\n`)
			 		hashtags += `#${clip.broadcaster.display_name} `
			  }
		}

		for(let clip of compilationClips){
		  let fileDir = `src/twitch/${clip.broadcaster.name}`

			let source = clip.broadcaster.display_name + " "


			for(let name of names){
				if(clip.title.toLowerCase().includes(name))
				source = ""
			}

			if(clip.title.includes(clip.broadcaster.display_name)  || channels.length <= 1)
				source = ""

			title += titleCase(source + clip.title + " | ")

		  timestamps.push(
		  	`${moment().date("2015-01-01").minutes( totalDuration/60 ).seconds(totalDuration % 60).format("m:ss")} ${source + clip.title}\n`
		  )
		  totalDuration += clip.duration


		}

		// timestamps.push(
		// 	`${moment().date("2015-01-01").minutes( totalDuration/60 ).seconds(totalDuration % 60).format("m:ss")} Like and Subscribe for more!\n`
		// )
		// totalDuration += 10

		title = title.substring(0,title.length - 3)

		if(channels.length == 1){
			title = channels[0] + " Weekly Top Clips Special | " + title
			playlist = channels[0]
		}else{
			title = "Top Twitch Daily | " + title
		}

		if(title.length > 100)
			title = title.substring(0,100)

		let description = new DescriptionBuilder(timestamps, credits, hashtags).build()

		if(channels.length == 1){
			playlist = channels[0]
		}

		let thumb:any = {
			path: null,
			primary: null,
			secondary: null,
			backdrop: null,
		}

		let thumbnail = opts.thumb ? opts.thumb.path : null

		return {
			title: title,
			description: description,
			playlist:playlist,
			notify:notify,
			thumbnail:thumbnail 
		}


	}

	generateCompilation(clips, outDir, processId){
		let videos = []
		let timestamps = []

		for(let clip of clips){
			videos.push({
				title:clip.title,
				file:clip.filePath
			})
		}

		let videoConfig = {
		  // outPath:`${fileDir}/compilation.mp4`,
		  processId: processId,
		  outDir: outDir,
		  outName:`compilation_${UtilService.getUqId()}.mp4`,
		  videos:videos,
		  timestamps: this.getTimestamps(clips)
		}

		return VideoService.compile(videoConfig)

	}
	async mockThumbnail(params){
		console.log("preparing dirs... ")
		await this.prepareDirs(params.channels, CLEAN_DIRS)

		console.log("getting channel data... ")
		let channels = await this.getChannelsData(params.channels, params.interval)

		for(let streamer in channels){
			console.log(streamer + " - " + channels[streamer]['clips'].length)
		}

		console.log("filterCompilationClips..")
		let clips:Array<any> = this.filterCompilationClips(channels, {
			maxVideoLength:params.maxVideoLength, 
			minVideoLength:params.minVideoLength,
			viewThreshold:params.viewThreshold,
			channels:params.channels
		})

		console.log("getCompilationThumbnailData..")
		let thumb = await this.getCompilationThumbnailData(clips)
		console.log("generating thumbnail..")

		let tBuilder = new ThumbnailBuilder(thumb.path, {mode: ThumbnailBuilder.MODE.COMPILATION})
		tBuilder.setImage('primary', thumb.images[0])
		tBuilder.setImage('panel1bg', thumb.images[1])
		tBuilder.setImage('secondary', thumb.images[2])
		tBuilder.setImage('panel2bg', thumb.images[3])
		tBuilder.setImage('panel3bg', thumb.images[4])
		tBuilder.setText('title1', thumb.texts[0])
		tBuilder.setText('title2', thumb.texts[1])
		tBuilder.setText('title3', thumb.texts[2])
		await tBuilder.build()

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
	 	 return res.json()
		}).catch(res=>{
			console.log("getTopClips err")
			console.log(res)
		})

		return res.clips
	}

	filterCompilationClips(channelData, params){
		
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
		let count = {}

		for(let channel in cdClone){

			cdClone[channel]['clips'].sort(function(a, b){return b.views-a.views})

			for(let clip of cdClone[channel]['clips']){
		  	let channel = clip.broadcaster.display_name

		  	if(!count[channel])
		  		count[channel] = 0

		  	count[channel]++

	  	  if( (count[channel] >= 6 || clip.views < params.viewThreshold ) && params.channels.length > 1 ){
	  	  	continue
	  	  } 

				clips.push(clip)
			}
		}

		clips.sort(function(a, b){return b.views-a.views})

		console.log('valid clips..', clips.length)
		for(let c of clips){
			console.log(`${c.broadcaster.display_name} - ${c.views} - ${c.title} `)
		}

		let top1 = clips.shift()
		let top2 = clips.shift()

		UtilService.shuffle(clips)

		clips.unshift(top1)
		clips.unshift(top2)

		let identical = 0
		for(let i = 0; i < clips.length-1; i++){
		  let channel = clips[i].broadcaster.display_name

			if(channel == clips[i+1].broadcaster.display_name){
				identical++
			}else{

				if(identical != 0){
					let toShift = clips.splice(i - identical, identical)
					clips.splice(i, 0, ...toShift)
					i--
				}
				identical = 0
			}
			
		}

		// console.log(111111)
		// console.log(clips)

		console.log('\nfinal clips to be used..')
		for(let c of clips){
			console.log(`${c.broadcaster.display_name} - ${c.views} - ${c.title}`)
		}


		for(let i = 0; i < clips.length; i++){
			let clip = clips[i]

			console.log("channel.. ", clip.broadcaster.display_name + " " + clip.title)
			// let clip = cdClone[cdKeys[i]]['clips'].shift()
			// console.log("clip = ", clip)
			let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
			clip.filePath = `${UtilService.getPath()}\\twitch\\${clip.broadcaster.display_name}\\${fileName}`
			clip.title = 
				clip.title.length > 50 ? 
				clip.title.substring(0,50) : 
				clip.title
			clip.title = clip.title.replace(/[^\x00-\x7F]|<|>/g, "")


			if(!titlesMem.includes(clip.title)){
				console.log("adding " + clip.title + " | clip duration: " + clip.duration + " | totat_duration: " + totalDuration)
				titlesMem.push(clip.title)
				res.push(clip)
				totalDuration += clip.duration
			}

			if(totalDuration >= params.maxVideoLength){
				console.log(`reached max video length.. ${totalDuration} > ${params.maxVideoLength}`)
				break
			}

		}




		return res

	}

	async downloadClip(outPath,slug){
			
		if (await fs.existsSync(outPath)){
			console.log("clip already exists.. ", outPath)
			return outPath
		} 

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

	async prepareDirs(channels, clean=false){

		let mixDir = `${UtilService.getPath()}\\twitch\\${MIX_PATH}`
		if (! await fs.existsSync(mixDir)){
	    await fs.mkdirSync(mixDir)
		}

		for(let channel of channels){
			let channelDir = `${UtilService.getPath()}\\twitch\\${channel}`
			if (await fs.existsSync(channelDir)){
		    await fs.rmdirSync(channelDir, {recursive:true})
			}
			if (! await fs.existsSync(channelDir)){
		    await fs.mkdirSync(channelDir)
			}
		}
	}
	async prepareShortsDirs(channels){
			if (!await fs.existsSync(`${UtilService.getPath()}\\twitch\\shorts`)) 
				await fs.mkdirSync(`${UtilService.getPath()}\\twitch\\shorts`)

		for(let channel of channels){
			let channelDir = `${UtilService.getPath()}\\twitch\\shorts\\${channel}`
			if (await fs.existsSync(channelDir)){
		    await fs.rmdirSync(channelDir, { recursive: true })
			}
			if (! await fs.existsSync(channelDir)){
		    await fs.mkdirSync(channelDir)
			}
		}
	}

	getTimestamps(compilationClips){

		let timestamps = []
		let totalDuration = 0

		// timestamps.push({
		// 	time: totalDuration,
		// 	title: "Intro"
		// })
		// totalDuration += 9

		for(let clip of compilationClips){

			timestamps.push({
				time: totalDuration,
				title: clip.title
			})

			totalDuration += clip.duration
		}

		return timestamps

	}


	getBgFromVid(vid, outPath){
		return new Promise(async (resolve,reject)=>{

			let durationStr = await VideoService.getInformation(vid, 'duration')
			console.log('durationStr',durationStr)
			let duration = durationStr.substring(durationStr.indexOf('duration='), durationStr.length)
			duration = Math.ceil(parseFloat(durationStr.replace(/[^\d.-]/g,'')))
			duration = duration / 2

			if (await fs.existsSync(outPath)){
				try{
					await fs.unlinkSync(outPath)
				}catch{}
			} 

			await VideoService.screenshot(vid, duration, outPath)

			resolve(outPath)
		})
	}

	static get(){
		if(instance == null)
			instance =  new TwitchTubeService()
		return instance
	}
}

export default instance ? instance : instance = TwitchTubeService.get()
