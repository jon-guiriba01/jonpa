import {
  app,
  Menu,
  Tray,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  Notification,
} from 'electron';
import path from 'path';
import GChatService from '../services/GChatService';
import ScriptService from '../services/ScriptService';
import TrelloService from '../services/TrelloService';
import AwsService from '../services/AwsService';
import ViewService from '../services/ViewService';
import EventService from '../services/EventService'
import TwitchTubeService from '../services/TwitchTubeService'
import TwitchService from '../services/TwitchService'
import YoutubeService from '../services/YoutubeService'
import VideoService from '../services/VideoService'
import UtilService from '../services/UtilService'
import SeleniumService from '../services/SeleniumService'
import AuthService from '../services/AuthService'
import checkInternetConnected from 'check-internet-connected';
import sound from "sound-play"
import { v5 as uuidv5 } from 'uuid';
export default class TrayBuilder{
	tray:Tray

	assetsPath = app.isPackaged 
		? path.join(process.resourcesPath, "\\src\\assets\\imgs\\") 
		: path.join(__dirname, "../assets/imgs/")

	ASSETS = {
	  trayIcon : this.assetsPath + 'tray-icon.ico',
	  offlineTrayIcon : this.assetsPath + 'tray-icon-offline.ico',
	  menuSuccessIcon : this.assetsPath + 'menu-success.png',
	  menuLoadingIcon : this.assetsPath + 'menu-loading.png',
	  menuNoneIcon : this.assetsPath + 'menu-none.png',
	  menuFailedIcon : this.assetsPath + 'menu-failed.png',
	}

	buildStatus = 'UNCHECKED'
	buildStatusIcon = this.ASSETS.menuNoneIcon
	prevBuildStatus = null

	intervals = {
		smartMeter:null
	}
	mainWindow
	constructor(mainWindow: BrowserWindow){
		this.mainWindow = mainWindow
		this.tray = new Tray(this.ASSETS.offlineTrayIcon)

	}

	buildTray(){
		try{
			this.tray.setImage(this.ASSETS.trayIcon)
			this.tray.setToolTip("Jon's PA")
			this.updateTrayMenu()

		}catch(err){
			console.log(err)
		}
	}

	async updateTrayMenu(){

	  let smTrelloMenu = []
			// let smCards:any
	  // 		smCards = await TrelloService.getCardsOfList("Smart Meter", "To Do")

	  // 	for(let card of smCards){
	  // 		var self = this
	  // 	  smTrelloMenu.push({
	  // 	    label: card.name, 
	  // 	    submenu:[
	  // 	      {label:'ask',type:'normal', click:(menuItem, BrowserWindow, event)=>{

	  // 	        GChatService.publishToWebhook(
	  // 	          process.env.GCHAT_WALLY_WEBHOOK
	  // 	          , "Wasssap, can I ask more about ["+ card.name +"] in Trello?"
	  // 	        )

	  // 	      }},
	  // 	      {label:'done',type:'normal', click: async (menuItem, BrowserWindow, event)=>{
	  // 	        let toList = "Pending"

	  // 	        await TrelloService.moveCardToList("Smart Meter",card.id, toList)
	  // 	        GChatService.publishToWebhook(
	  // 	          process.env.GCHAT_WALLY_WEBHOOK
	  // 	          , `Moved Trello card "${card.name}" to "${toList}" list`
	  // 	        )
	  // 	        self.updateTrayMenu()

	  // 	      }},
	  // 	    ]
	  // 	  })
	  // 	}
	  let watcherInterval
	  var contextMenu = Menu.buildFromTemplate([
	    { label: 'smartmeter', icon: this.buildStatusIcon, 'submenu':[
	      { 
	        label:  `Gmail`, 'submenu':[ 
	          { 
	            label: 'push', type: 'normal', click:(menuItem, BrowserWindow, event)=>{
	            } 
	          },    
	        ] 
	      },
	      { 
	        label:  `Trello`, 'submenu':smTrelloMenu 
	      },
	      {
	        label: 'Git','submenu':[    
	          { 
	            label: 'push', type: 'normal', click:(menuItem, BrowserWindow, event)=>{
	              ScriptService.run('../local/push_smartmeter.bat')
	            } 
	          },    
	        ]
	      },    
	      {
	        label: 'AWS','submenu':[    
	          { 
	            label: `${this.intervals.smartMeter ? 'disable' : 'enable'} codebuild update`, 
	            type: 'normal', click: async (menuItem, BrowserWindow, event)=>{

	              if(this.intervals.smartMeter){
	                clearInterval(this.intervals.smartMeter);
	                this.intervals.smartMeter = null
	                this.updateTrayMenu()
	              }else{

	                var buildInfo = await AwsService.checkBuild('smart-meter')
	                this.buildStatus = buildInfo.buildStatus
	                

	                var icon = this.ASSETS.menuNoneIcon
	                switch(this.buildStatus){
	                  case "UNCHECKED": icon = this.ASSETS.menuNoneIcon; break
	                  case "SUCCEEDED": icon = this.ASSETS.menuSuccessIcon; break
	                  case "FAILED": icon = this.ASSETS.menuFailedIcon; break
	                  case "IN_PROGRESS": icon = this.ASSETS.menuLoadingIcon; break
	                }

	                this.buildStatusIcon = icon

	                this.updateTrayMenu()

	                this.intervals.smartMeter = setInterval(async()=>{

	                  var buildInfo = await AwsService.checkBuild('smart-meter')
	                  this.buildStatus = buildInfo.buildStatus
	                  
	                  if(this.prevBuildStatus == null){
	                    this.prevBuildStatus = buildInfo.buildStatus
	                  }

	                  if(this.prevBuildStatus != buildInfo.buildStatus){

	                    GChatService.publishToWebhook(
	                      'https://chat.googleapis.com/v1/spaces/4KK7VQAAAAE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=MekUiEx2shr-5wbCuj5dPzKGMJ9GBsqHbFoy7mFTLfc%3D'
	                      , "Project 'smart-meter' build status: " + buildInfo.buildStatus
	                    )

	                    this.prevBuildStatus = buildInfo.buildStatus

	                  }
	                  
	                  var icon = this.ASSETS.menuNoneIcon
	                  switch(this.buildStatus){
	                    case "UNCHECKED": icon = this.ASSETS.menuNoneIcon; break
	                    case "SUCCEEDED": icon = this.ASSETS.menuSuccessIcon; break
	                    case "FAILED": icon = this.ASSETS.menuFailedIcon; break
	                    case "IN_PROGRESS": icon = this.ASSETS.menuLoadingIcon; break
	                  }

	                  this.buildStatusIcon = icon

	                  this.updateTrayMenu()
	                },5000)

	              }
	            } 
	          },         
	        ]
	      },
	      { 
	        label: 'run', type: 'normal', click:(menuItem, BrowserWindow, event)=>{
	          ScriptService.run('../local/run_smartmeter.bat')
	        } 
	      },   
	    ]}, 
	    { 
	      label:'settings',type:'normal',click:(menuItem, BrowserWindow, event)=>{
	      	EventService.pub('context-menu:settings')
	      } 
	    },    
	    {
	      label: 'twitch', 'submenu':[
		      {
		        label: 'special','submenu':[
	      			{label: 'special-39daph', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["39daph"])}},
	      			{label: 'special-xQcOW', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["xQcOW"])}},
	      			{label: 'special-TinaKitten', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["TinaKitten"])}},
	      			{label: 'special-xchocobars', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["xchocobars"])}},
	      			{label: 'special-itshafu', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["itshafu"])}},
	      			{label: 'special-lilypichu', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["lilypichu"])}},
	      			{label: 'special-fuslie', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["fuslie"])}},
	      			{label: 'special-peterparktv', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["peterparktv"])}},
	      			{label: 'special-quarterjade', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["quarterjade"])}},
	      			{label: 'special-kristoferyee', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["kristoferyee"])}},
	      			{label: 'special-kkatamina', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["kkatamina"])}},

		        ]
		      },    
	      	{
	      		label: 'postTopClips-All', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			await this.postMixCompilation([
      					"xQcOW",
      					"39daph", 
      					"pokimane", 
      					"kkatamina",
      					"Sykkuno",
      					"kristoferyee", 
      				])

	      			await this.postMixCompilation([
      					"TinaKitten", 
      					"stevesuptic", 
      					"xchocobars", 
      					"brookeab", 
      					"5uppp", 
      					"karlnetwork", 
      					"itshafu", 
      				])

	      			await this.postMixCompilation([
      					"lilypichu", 
      					"fuslie", 
      					"natsumiii",
      					"ariasaki", 
      					"masayoshi", 
      					"quarterjade", 
      					"peterparktv", 
      				])

  			    	console.log("postTopClips-SaladGang\n")
  			    }
  			  },    
	      	{
	      		label: 'postTopClips-Top', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			await this.postMixCompilation([
      					"xQcOW",
      					"39daph", 
      					"kkatamina",
      					"Sykkuno",
      					"kristoferyee", 

      					"TinaKitten", 
      					"xchocobars", 
      					"brookeab", 
      					"itshafu",       					

      					"pokimane", 
      					"lilypichu", 
      					"fuslie", 
      					"natsumiii",
      					"masayoshi", 
      					"quarterjade", 
      					"peterparktv", 
      				])

  			    	console.log("postTopClips-SaladGang\n")
  			    }
  			  },
	      	{
	      		label: 'postTopClips-SaladGang', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			await this.postMixCompilation([
      					"TinaKitten", 
      					"stevesuptic", 
      					"xchocobars", 
      					"brookeab", 
      					"5uppp", 
      					"karlnetwork", 
      					"itshafu", 
      				])

  			    	console.log("postTopClips-SaladGang\n")
  			    }
  			  },
	      	{
	      		label: 'postTopClips-OTV', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			await this.postMixCompilation([
      					"pokimane", 
      					"lilypichu", 
      					"fuslie", 
      					"natsumiii",
      					"ariasaki", 
      					"masayoshi", 
      					"quarterjade", 
      					"peterparktv", 
      				])

  			    	console.log("postTopClips-SaladGang\n")
  			    }
  			  },
	      	{
	      		label: 'make shorts', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			let channels = [
      			    "TinaKitten", 
      			    "stevesuptic", 
      			    "xchocobars", 
      			    "brookeab", 
      			    "5uppp", 
      			    "karlnetwork", 
      			    "itshafu", 

      			    "xQcOW",
      			    "39daph", 
      			    "pokimane", 
      			    "kkatamina",
      			    "Sykkuno",
      			    "disguisedtoast",
      			    "ludwig",
      			    "yvonnie",

      			    "lilypichu", 
      			    "fuslie", 
      			    "natsumiii",
      			    "ariasaki", 
      			    "masayoshi", 
      			    "quarterjade", 
      			    "peterparktv", 
      			    "kristoferyee", 
      			    "kyedae_",
      			    // "amouranth", 
      			    "melina", 
      			    "imjasmine",
      			    // "indiefoxx", 
      			    "Jinnytty", 
      			    "justaminx", 
      			  ]

      			  for(let channel of channels){

      			  	await TwitchTubeService.makeShorts2({
      			  	  channel:channel,
      			  	  viewThreshold:500,
      			  	  notify:false,
      			  	  upload:true
      			  	})

      			  }


	      		}
					},
	      	{
	      		label: 'stop twitch watcher', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			console.log("stopping twitch watcher..")
	      			if(watcherInterval) clearInterval(watcherInterval)
	      		}
	      	},
	      	{
	      		label: 'mockThumbnail', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
							await TwitchTubeService.mockThumbnail({
								channels:[	      			      
									"pokimane", 
									"lilypichu", 
									"fuslie", 
									"natsumiii",
									"ariasaki", 
									"masayoshi", 
									"quarterjade", 
									"peterparktv", 
								],
								maxVideoLength: 5 * 60,
								minVideoLength: 3 * 60,
								interval:'week', //day|month
								treshold:100,
								uploadClips:false,
								notify:false,
								upload:false

							})


	      		}
	      	},
	      	{
	      		label: 'test', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
							let introFile = `${UtilService.PATH.ASSETS}\\vids\\intro1.mp4`
	      			let tempIntroRawFile = `${UtilService.PATH.LOCAL}\\test\\raw_temp_intro1.ts`
	      			let tempIntroFile = `${UtilService.PATH.LOCAL}\\test\\temp_intro1.ts`
	      			let introSS1 = `${UtilService.PATH.LOCAL}\\test\\introSS_zz_1.png`
	      			let testFile = `${UtilService.PATH.LOCAL}\\twitch\\39daph\\FuriousGlutenFreeAlligatorMcaT-bneglbq2fwoqmeH6.mp4`
	      			let testRawFile = `${UtilService.PATH.LOCAL}\\twitch\\39daph\\test1.ts`


	      			await ScriptService.cmd(
	      					`ffmpeg`,
	      					 ['-ss', "00:00:00", '-i', testFile, '-vframes', '1', '-q:v', '2', introSS1], 
	      					 {log:true}
	      				)
	      			await ScriptService.cmd('ffmpeg', [
	      				'-i', introFile, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', tempIntroRawFile
	      			], {log:true})

	      			await ScriptService.cmd('ffmpeg', [
	      				'-i', tempIntroRawFile, '-i', introSS1, '-filter_complex',
	      				`[1]scale=1920:1080,setdar=16/9[1a];[1a][0]overlay=0:0[a]`,
	      				'-map', '[a]', '-map', '0:a', '-b:v', '8000k', '-b:a', '160k', '-ar', '44100',  '-c:v', 'libx264', '-c:a', 'aac',  tempIntroFile
	      			], {log:true})

	      		}
	      	}
	      ]
	    },    
	    {
	      label: 'youtube', 'submenu':[
	      	{
	      		label: 'enableClipoboardDL', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
    					
    					if(!AuthService.isAuthenticated()){
    						AuthService.googleAuth('src/credentials.json').then((res)=>{
    							console.log("AutoClipoboardDownload enabled!")
      						YoutubeService.enableAutoClipoboardDownload()
    						}).catch((err)=>{ })
    					}else{
  							console.log("AutoClipoboardDownload disabled!")
      					YoutubeService.enableAutoClipoboardDownload()

    					}


  			    }
  			  },
	      	{
	      		label: 'disableClipoboardDL', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
    					YoutubeService.disableAutoClipoboardDownload()
  			    }
  			  }
	      ]
	    },    
	    { 
	      label: 'show window', type: 'normal', click:(menuItem, BrowserWindow, event)=>{
	        this.mainWindow.show();
	      } 
	    },    
	    { 
	      label: 'exit', type: 'normal', click:async (menuItem, BrowserWindow, event)=>{
		      app.isQuiting = true
		      await SeleniumService.closeAll()
		      app.quit()
	      } 
	    },   
	  ])

	  this.tray.setContextMenu(contextMenu)
	}

	async postMixCompilation(channels){
		await TwitchTubeService.postMixCompilation({
			channels,
			maxVideoLength: 2 * 60,
			minVideoLength: 2 * 60,
			interval:'day', //day|month
			treshold:100,
			uploadClips:false,
			notify:true,
			upload:false

		})

		const notification = {
		  title: 'postMixCompilation Done',
		  body: channels.join(',')
		}
		new Notification(notification).show()

		await sound.play(`${UtilService.getLocalPath()}/assets/audio/ring1.mp3`, 1);
	}

	async postSpecialCompilation(channels){
		await TwitchTubeService.postMixCompilation({
			channels,
			maxVideoLength: 5 * 60,
			minVideoLength: 3 * 60,
			interval:'week', //day|month
			treshold:100,
			uploadClips:false,
			notify:true,
			upload:true

		})

		const notification = {
		  title: 'postSpecialCompilation Done',
		  body: channels.join(',')
		}
		new Notification(notification).show()

		await sound.play(`${UtilService.getLocalPath()}/assets/audio/ring1.mp3`, 1);
	}


	// channels:[
	// 	"TinaKitten", 
	// 	"stevesuptic", 
	// 	"xchocobars", 
	// 	"brookeab", 
	// 	"5uppp", 
	// 	"karlnetwork", 
	// 	"itshafu", 

	// 	// "xQcOW",
	// 	// "39daph", 
	// 	// "pokimane", 
	// 	// "kkatamina",
	// 	// "Sykkuno",

	// 	// "lilypichu", 
	// 	// "fuslie", 
	// 	// "natsumiii",
	// 	// "ariasaki", 
	// 	// "masayoshi", 
	// 	// "quarterjade", 
	// 	// "peterparktv", 
	// 	// "kristoferyee", 

	// 	// "amouranth", 
	// 	// "melina", 
	// 	// "imjasmine",
	// 	// "indiefoxx", 
	// 	// "Jinnytty", 
	// ],
}