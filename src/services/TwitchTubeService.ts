import {shell, app, ipcMain} from 'electron';
import path from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs';
import moment from 'moment';
import * as _ from 'lodash';
import { titleCase } from "title-case";
import YoutubeService from './YoutubeService'
import DescriptionBuilder from '../classes/Youtube/DescriptionBuilder'
import {ThumbnailBuilder} from '../classes/Youtube/ThumbnailBuilder'
import VideoService from './VideoService'
import TwitchService from './TwitchService'
import SeleniumService from './SeleniumService'
import UtilService from './UtilService'
import StorageService from './StorageService'
import Storage from 'node-storage'


var instance = null

const DOMAIN = "https://api.twitch.tv"
const TOP_CLIPS_PATH = "kraken/clips/top"
const HELIX_PATH = "helix/clips"
const MIX_PATH = "mix"
const CLEAN_DIRS = false
const BLACKLIST_TITLES = ['insta', 'reddit', 'redd.it']

class TwitchTubeService{
	store
	constructor(){
	}

	async makeShorts(params){
		let processId = UtilService.getUqId()
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

		let prevTitlesEntry = `${params.channel}.shorts.prevTitles`
		let prevTitles = await StorageService.get(prevTitlesEntry) || []
		let prevVideos = await TwitchService.getChannelRecentVideos(params.channelId)
		let prevVidTitles = prevVideos.map(e=>e.title)

		clips = clips.filter( e=>{
      return e.views > params.viewThreshold &&
      	e.title.length > 4 &&
      	// moment().diff(moment(e.created_at),'hours') < 72 &&
      	!prevTitles.includes(this.ytTitle(e.title)) &&
      	!this.isVidTitle(prevVidTitles,e.title) &&
      	e.duration > 15 &&
      	!(new RegExp(BLACKLIST_TITLES.join("|")).test(e.title))
    })

		clips.sort( (a,b)=>{
      return moment(b.created_at).diff(moment(a.created_at), 'seconds')
    })

		clips.map(e=>console.log(e.views + " " + e.title + " " + moment().diff(moment(e.created_at),'hours') +" hours ago") )

		let lastUsedEntry = `${params.channel}.shorts.lastUsed`
		let lastUsed = StorageService.get(lastUsedEntry)


    let selectedClip = clips[0]

    if(!selectedClip) {
      console.log("no suitable clip for "+ params.channel + " skipping...")
    	return
    }

    selectedClip.title = this.ytTitle(selectedClip.title)
    prevTitles.push(selectedClip.title)

    if(prevTitles.length > 100)
    	prevTitles.shift()

    console.log('making video for ' + params.channel + " - " + selectedClip.views + " " + selectedClip.title)

    let downloadDir = `${UtilService.getPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}`
    
    let filePath = await TwitchService.downloadClip(selectedClip, downloadDir)
    console.log("downloaded..  ", filePath)
    selectedClip.filePath = filePath
    StorageService.set(lastUsedEntry, moment().format())
    StorageService.set(prevTitlesEntry, prevTitles)

  	let thumbPath = `${UtilService.getLocalPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}\\thumbnail_${processId}.jpg`
    try{
    	await this.buildShortThumbnail([selectedClip], thumbPath)
    }catch(err){
    	console.log(err)
    }

    let uploadData = await this.makeShortsYTMeta(selectedClip, {
      channel:params.channel,
      notify:params.notify,
      thumbPath:thumbPath
    })


    let outDir = `${UtilService.getPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}`
    let generatedPath = await this.generateShort([selectedClip], outDir, processId)

    
    console.log("YT Metadata ", uploadData)

		if(params.upload){
    	console.log("uploading to youtube..")
			await YoutubeService.upload({
				filePath:UtilService.getLocalRoot()+"\\"+generatedPath,
				...uploadData
			})
		}

	}

	async postSpecialCompilation(params){
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
		let clips:Array<any> = await this.filterCompilationClips(
			_.cloneDeep(channels), 
			{
				maxVideoLength:params.maxVideoLength, 
				minVideoLength:params.minVideoLength,
				viewThreshold:params.treshold,
				channels:params.channels
			}
		)

		console.log("download clips..")
		await this.downloadClips(clips)

		console.log("generate compilation..")
		let outDir = `${UtilService.getPath()}\\twitch\\${MIX_PATH}`
		let compilationPath = await this.generateCompilation(clips, outDir, processId)
		console.log("compilationPath.. ", compilationPath)
		console.log("creating YT meta.. ")

		let thumbPath = `${UtilService.getLocalPath()}\\twitch\\mix\\thumbnail_${processId}.jpg`
		await this.buildSpecialThumbnail(clips, thumbPath)

		let uploadData = await this.makeYTMeta(clips, {...params, thumbPath:thumbPath})

		console.log("YT Metadata ", uploadData)

		if(params.upload)
			YoutubeService.upload({
				filePath: UtilService.getLocalRoot()+"\\"+compilationPath,
				...uploadData
			})
	}

	
	async postTopShort(params){
		let processId = UtilService.getUqId()
		console.log("PROCESS ID", processId)
		console.log("preparing dirs... ")
		await this.prepareDirs(params.channels, CLEAN_DIRS)

		console.log("getting channel data... ")
		let channels = await this.getChannelsData(params.channels, params.interval)

		for(let streamer in channels){
			if(channels[streamer]['clips'])
				console.log(streamer + " - " + channels[streamer]['clips'].length)
		}

		console.log("filterCompilationClips..")
		let clips:Array<any> = await this.filterCompilationClips(
			_.cloneDeep(channels), 
			{
				maxVideoLength:params.maxVideoLength, 
				minVideoLength:params.minVideoLength,
				viewThreshold:params.treshold,
				channels:params.channels
			}
		)

	
		let lastUsedEntry = `${params.channel}.shorts.lastUsed`
		let lastUsed = StorageService.get(lastUsedEntry)

		let selectedClip = clips[0]

		if(!selectedClip) {
		console.log("no suitable clip for "+ params.channel + " skipping...")
			return
		}

		selectedClip.title = this.ytTitle(selectedClip.title)

		let prevTitlesEntry = `${params.channel}.shorts.prevTitles`
		let prevTitles = await StorageService.get(prevTitlesEntry) || []

		prevTitles.push(selectedClip.title)
		if(prevTitles.length > 100)
			prevTitles.shift()

		console.log('making video for ' + params.channel + " - " + selectedClip.views + " " + selectedClip.title)

		let downloadDir = `${UtilService.getPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}`
		await UtilService.preparePath(downloadDir)

		let filePath = await TwitchService.downloadClip(selectedClip, downloadDir)
		console.log("downloaded..  ", filePath)
		selectedClip.filePath = filePath
		StorageService.set(lastUsedEntry, moment().format())
		StorageService.set(prevTitlesEntry, prevTitles)

		let thumbDir = `${UtilService.getLocalPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}`
		await UtilService.preparePath(thumbDir)
		
		let thumbPath = `${thumbDir}\\thumbnail_${processId}.jpg`
		try{
			await this.buildShortThumbnail([selectedClip], thumbPath)
		}catch(err){
			console.log(err)
		}

		let uploadData = await this.makeShortsYTMeta(selectedClip, {
			channel:params.channel,
			notify:params.notify,
			thumbPath:thumbPath
		})


		let outDir = `${UtilService.getPath()}\\twitch\\shorts\\${selectedClip.broadcaster.display_name}`
		await UtilService.preparePath(outDir)
		let generatedPath = await this.generateShort([selectedClip], outDir, processId)

		
		console.log("YT Metadata ", uploadData)

		if(params.upload){
    	console.log("uploading to youtube..")
			await YoutubeService.upload({
				filePath:UtilService.getLocalRoot()+"\\"+generatedPath,
				...uploadData
			})
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
			if(channels[streamer]['clips'])
				console.log(streamer + " - " + channels[streamer]['clips'].length)
		}

		console.log("filterCompilationClips..")
		let clips:Array<any> = await this.filterCompilationClips(
			_.cloneDeep(channels), 
			{
				maxVideoLength:params.maxVideoLength, 
				minVideoLength:params.minVideoLength,
				viewThreshold:params.treshold,
				channels:params.channels
			}
		)
		
		let compilationPath
		if(params.download){
			console.log("download clips..")
			await this.downloadClips(clips)

			console.log("generate compilation..")
			let outDir = `${UtilService.getPath()}\\twitch\\${MIX_PATH}`
			compilationPath = await this.generateCompilation(clips, outDir, processId)
		}

		console.log("generating thumbnail.. ")
		let thumbPath = `${UtilService.getLocalPath()}\\twitch\\mix\\thumbnail_${processId}.jpg`
		await this.buildCompilationThumbnail(clips, thumbPath)

		console.log("creating YT meta.. ")
		let uploadData = await this.makeYTMeta(clips, {...params, thumbPath:thumbPath})
		console.log("YT Metadata ", uploadData)

		if(params.upload)
			YoutubeService.upload({
				filePath: UtilService.getLocalRoot()+"\\"+compilationPath,
				...uploadData
			})
	}

	async buildCompilationThumbnail(clips, path){
		try{

			let i = 0
			let prevChannel
			let mem = []

			let tBuilder = new ThumbnailBuilder(path, {mode: ThumbnailBuilder.MODE.COMPILATION})
		
			let prevChannelThumbsEntry = `mix:compilation:thumbs`
			let prevChannelThumbs = StorageService.get(prevChannelThumbsEntry) || []
			console.log("prevChannelThumbs.. ", prevChannelThumbs.join(","))
			for(let clip of clips){
				let channel = clip.broadcaster.display_name
				
				if(!mem.includes(channel) && !prevChannelThumbs.includes(channel) ) 
					mem.push(channel)
				else 
					continue

				let limit = 1
				
				if(i == 0){
					let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\primary`)

					for(let file of files){
						if(file.includes('${channel.toLowerCase()}-primary'))
							limit++
					}
					console.log(`${channel.toLowerCase()} - limit: ${limit} `)

					tBuilder.setImage('primary', 
						`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\primary\\${channel.toLowerCase()}-primary-${UtilService.getRandomInt(1,limit)}.png`
					)
					tBuilder.setText('title1', clip.title)

					let p1Path = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\generated\\panel1bg.png`
					if(!await fs.existsSync(clip.filePath)){
						await this.downloadClip(clip.filePath, clip.slug)
					}

					await this.getBgFromVid(clip.filePath, p1Path)
					tBuilder.setImage('panel1bg', p1Path)
				}
				else if(i == 1){

					let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\secondary`)
					for(let file of files){
						if(file.includes('${channel.toLowerCase()}-secondary'))
							limit++
					}
					console.log(`${channel.toLowerCase()} - limit: ${limit} `)

					let p2Path = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\generated\\panel2bg.png`
					if(!await fs.existsSync(clip.filePath)){
						await this.downloadClip(clip.filePath, clip.slug)
					}
					await this.getBgFromVid(clip.filePath, p2Path)

					tBuilder.setImage('secondary', `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\secondary\\${channel.toLowerCase()}-secondary-${UtilService.getRandomInt(1,limit)}.png`)
					tBuilder.setImage('panel2bg', p2Path)
				}
				else if(i == 2){

					let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\third`)
					for(let file of files){
						if(file.includes('${channel.toLowerCase()}-third'))
							limit++
					}
					console.log(`${channel.toLowerCase()} - limit: ${limit} `)

					tBuilder.setImage('panel3bg',  `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\third\\${channel.toLowerCase()}-third-${UtilService.getRandomInt(1,limit)}.png`)

					break
				}

				i++
			}
			let tileSortedClips = _.cloneDeep(clips)
			tileSortedClips.sort((a,b)=>b.title.length - a.title.length)

			let titles = ["title1","title2","title3",]
			for(let clip of clips){
				if(titles.length == 0) break
				tBuilder.setText(titles.shift(), clip.title)
			}

			console.log("prevChannelThumbs set.. ", mem.join(","))
			await StorageService.set(prevChannelThumbsEntry, mem)
			await tBuilder.build()

		}catch(err){
			console.log(err)
		}



	}
	async buildSpecialThumbnail(clips, path){

		let channel = clips[0].broadcaster.display_name
		
		let tBuilder = new ThumbnailBuilder(path, {mode: ThumbnailBuilder.MODE.SPECIAL})

		tBuilder.setImage('primary', 
			`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\special\\${channel.toLowerCase()}-special-${UtilService.getRandomInt(1,1)}.png`
		)
		let bgPath = `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\bg.jpg`
		await this.getBgFromVid(clips[0].filePath, bgPath)

		tBuilder.setImage('bg',  bgPath)

		tBuilder.setText('title1', `${channel} Special` )
		await tBuilder.build()
	}

	async buildShortThumbnail(clips, path){

		let channel = clips[0].broadcaster.display_name
		
		let limit = 0
		let files = await fs.readdirSync(`${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\secondary`)
		for(let file of files){
			if(file.includes('${channel.toLowerCase()}-secondary'))
				limit++
		}

		let tBuilder = new ThumbnailBuilder(path, {mode: ThumbnailBuilder.MODE.SHORT})

		tBuilder.setImage('secondary', `${UtilService.getLocalPath()}\\assets\\imgs\\thumbs\\secondary\\${channel.toLowerCase()}-secondary-${UtilService.getRandomInt(1,limit)}.png`)
		
		let bgPath = `${UtilService.getLocalPath()}\\twitch\\shorts\\${channel}\\bg.jpg`
		await this.getBgFromVid(clips[0].filePath, bgPath)
		tBuilder.setImage('bg',  bgPath)

		tBuilder.setText('title1', `${clips[0].title}` )
		await tBuilder.build()
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

			let topClips = await TwitchService.getTopClips({
				channel:channel,
				period:interval,
				trending:false,
				limit:30
			})

			if(!topClips || topClips.length == 0){
				continue
			}

			res[channel] = {}
			res[channel]['clips'] = topClips
				
		}

		return res
	}

	//coomer farmer on the job - jinnytty
	//POG - daph
	async makeShortsYTMeta(clip, params){

		let title = clip.title + " | " +  clip.broadcaster.display_name + " #shorts"
		let vodUrl = clip?.vod?.url || "Not Found"
		let description = 
		`Historical Date: ${moment(clip.created_at).format('MMM DD, YYYY hh:mm:ss')}\n`+
		`Vod Moment: ${vodUrl} \n`+
		`https://www.twitch.tv/${clip.broadcaster.display_name}\n\n` +
		`#${clip.broadcaster.display_name}\n`

		return {
			title: title,
			description: description,
			playlist:clip.broadcaster.display_name,
			notify:params.notify,
			thumbnail:params.thumbPath
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
		// totalDuration += 11
 
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
			title = title +" | " + channels[0] + " Weekly Special" 
			playlist = channels[0]

		}else{
			title = "Top Twitch Daily | " + title
			playlist = "Mix Compilation"
			
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


		return {
			title: title,
			description: description,
			playlist:playlist,
			notify:notify,
			thumbnail:opts.thumbPath 
		}


	}

	generateShort(clips, outDir, processId){
		let videos = []

		for(let clip of clips){
			videos.push({
				title:clip.title,
				file:clip.filePath
			})
		}

		let videoConfig = {
		  processId: processId,
		  outDir: outDir,
		  outName:`short_${processId}.mp4`,
		  videos:videos,
		}

		return VideoService.generateShort(videoConfig)

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
		let clips:Array<any> = await this.filterCompilationClips(
			_.cloneDeep(channels), 
			{
				maxVideoLength:params.maxVideoLength, 
				minVideoLength:params.minVideoLength,
				viewThreshold:params.treshold,
				channels:params.channels
			}
		)

		console.log("getCompilationThumbnailData..")
		let thumbPath = `${UtilService.getLocalPath()}\\twitch\\mix\\thumbnail_${UtilService.getUqId()}.png`
		let thumb = await this.getCompilationThumbnailData(clips, thumbPath)
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

	async filterCompilationClips(channelData, params){
		console.log(">>>> filterCompilationClips")
		const randProperty = (obj)=> {
	    var keys = Object.keys(obj);
	    return keys[ keys.length * Math.random() << 0];
		}

		//to prevent pop from obscuring the object
		// let cdKeys = Object.keys(cdClone)
		// console.log("using clips from", cdKeys)


		let titlesMem = []
		let clips = []


	  let users = await TwitchService.getUsers(params.channels)
		let count = {}
		for(let channel in channelData){
			channelData[channel]['clips'].sort(function(a, b){return b.views-a.views})

	  	let channelId = users[channel.toLowerCase()]._id
			let prevVideos = await TwitchService.getChannelRecentVideos(channelId)
			let prevVidTitles = prevVideos.map(e=>e.title)

			let prevTitlesEntry = `${params.channel}.shorts.prevTitles`
			let prevTitles = await StorageService.get(prevTitlesEntry) || []
	  	let blackListTitles = ['insta', 'reddit', 'redd.it']

			for(let clip of channelData[channel]['clips']){
		  	let channel = clip.broadcaster.display_name

		  	if(!count[channel])
		  		count[channel] = 0

		  	let isVidCountReached = (count[channel] > 4 && Object.keys(channelData).length > 1)
		  	if(isVidCountReached){
		  		console.log("isVidCountReached for " + channel )
		  		break
		  	}

		  	let isLowViews = clip.views < params.viewThreshold
		  	let isStreamTitle = this.isVidTitle(prevVidTitles, clip.title)
		  	let isUsedTitle = prevTitles.includes(this.ytTitle(clip.title))
		  	let isDuplicate = titlesMem.includes(clip.title) 
		  	let isShort = clip.duration <= 15
		  	let isBlacklisted = new RegExp(blackListTitles.join("|")).test(clip.title)
	  	  if( 
	  	  	isLowViews || isStreamTitle ||
      		isUsedTitle || isDuplicate || isShort || 
      		isBlacklisted
	  	  ){
	  	  	console.log(
	  	  		`skipping.. ${clip.title} - ${clip.views} - dur:${clip.duration}: ${channel} |${clip.url}`
  	  		)
	  	  	// console.log(
	  	  	// 	`skipping.. ${clip.title} - ${clip.views} - dur:${clip.duration}:`+
  	  		// 	`${isVidCountReached?'isVidCountReached ':''}${isLowViews?'isLowViews ':''}${isStreamTitle?'isStreamTitle ':''}` +
  	  		// 	`${isUsedTitle?'isUsedTitle ':''}${isDuplicate?'isDuplicate ':''}${isShort?'isShort ':''}`
  	  		// )
	  	  	continue
	  	  } 
	  	  else{
		  		count[channel]++
  	  	  titlesMem.push(clip.title)

  	  	  let fileName = `${clip.slug.substr(clip.slug - 16)}.mp4`
  	  	  clip.filePath = `${UtilService.getPath()}\\twitch\\${clip.broadcaster.display_name}\\${fileName}`
  	  	  clip.title = this.ytTitle(clip.title)

  	  	  console.log(`pushing ${clip.broadcaster.display_name} - ${clip.views} - ${clip.title} `)
  				clips.push(clip)

	  	  }
			}
		}

		clips.sort(function(a, b){return b.views-a.views})

		console.log('valid clips..', clips.length)
		for(let c of clips){
			console.log(`${c.broadcaster.display_name} - ${c.views} - ${c.title} `)
		}

		if(Object.keys(channelData).length > 1){
			clips.forEach(e=>console.log(`${e.broadcaster.display_name} - ${e.views} - ${e.title} `))

			let top1 = clips.shift()
			let top2 = clips.shift()

			UtilService.shuffle(clips)
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

		}


		let totalDuration = 0

		let temp = []
		for(let c of clips){
			if(totalDuration > params.maxVideoLength)
				break

			console.log(`${c.broadcaster.display_name} - ${c.views} - ${c.title} - t:${totalDuration}`)
			temp.push(c)
			totalDuration += c.duration
		}
		clips = temp
		// clips = clips.filter(e=>{
		// 	console.log(`${e.broadcaster.display_name} - ${e.views} - ${e.title} - t:${totalDuration}`)
		// 	totalDuration += e.duration
		// 	return totalDuration <= params.maxVideoLength
		// })


		console.log("===After Shuffle===")
		clips.forEach(e=>console.log(`${e.broadcaster.display_name} - ${e.views} - ${e.title} `))

		return clips

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

	isVidTitle(vids,title){
		for(let vid of vids){
			if(vid.toLowerCase().trim() == title.toLowerCase().trim())
				return true
		}
		return false
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

	ytTitle(str){
		let charLimit = 65
	  str = str.length > charLimit ? str.substring(0,charLimit) :  str
		return str.replace(/[^\x00-\x7F]|<|>/g, "")
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
