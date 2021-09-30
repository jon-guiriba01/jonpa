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
const ALL_CHANNELS = [
  "TinaKitten", 
  "SteveSuptic", 
  "xChocoBars", 
  "BrookeAB", 
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
  "melina", 
  "imjasmine",
  "Jinnytty", 
  "justaminx", 
  "hasanabi",
  "botezlive", 
  "qtcinderella",
  "susu_jpg",
]

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
	      			{label: 'special-Jinnytty', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["Jinnytty"])}},
	      			{label: 'special-Melina', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["Melina"])}},
	      			{label: 'special-TinaKitten', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["TinaKitten"])}},
	      			{label: 'special-qtcinderella', type:'normal', click: async(menuItem, BrowserWindow, event)=>{this.postSpecialCompilation(["qtcinderella"])}},

		        ]
		      },      
	      	{
	      		label: 'postMixCompilation', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			await this.postMixCompilation([
      					"xQcOW",
      					"Sykkuno",
      					"39daph", 
      					"kkatamina",
      					"kristoferyee", 
      					"TinaKitten", 
      					"xChocoBars", 
      					"BrookeAB", 
      					"itshafu",       					
      			    "ariasaki", 
      					"pokimane", 
      					"lilypichu", 
      					"fuslie", 
      					"natsumiii",
      					"masayoshi", 
      					"quarterjade", 
      					"peterparktv", 
      					"yvonnie", 
      					"melina", 
      					"Jinnytty", 
      					"justaminx", 
      					// "hasanabi", 
      					"botezlive",

      				])

  			    }
  			  },
	      	{
	      		label: 'make shorts', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			let channels = [
      			    "TinaKitten", 
      			    "SteveSuptic", 
      			    "xChocoBars", 
      			    "BrookeAB", 
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
      			    "melina", 
      			    "imjasmine",
      			    "Jinnytty", 
      			    "justaminx", 
      			    "hasanabi",
      			    "botezlive", 
      			    "qtcinderella",
      			    "susu_jpg"
      			  ]

      			  let users = await TwitchService.getUsers(channels)
      			  console.log("users",users)
      			  for(let channel of channels){
      			  	console.log("channel ", channel)
      			  	let channelId = users[channel.toLowerCase()]._id

      			  	await TwitchTubeService.makeShorts({
      			  	  channel:channel,
      			  	  channelId:channelId,
      			  	  viewThreshold:800,
      			  	  notify:false,
      			  	  upload:true
      			  	})
      			  }


	      		}
					},
					{ 
	      		label: 'make top short', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			let channels = [
      			    // "TinaKitten", 
      			    // "SteveSuptic", 
      			    // "xChocoBars", 
      			    // "BrookeAB", 
      			    // "5uppp", 
      			    // "karlnetwork", 
      			    // "itshafu", 

      			    // "xQcOW",
      			    // "39daph", 
      			    // "pokimane", 
      			    // "kkatamina",
      			    // "Sykkuno",
      			    // "disguisedtoast",
      			    // "ludwig",
      			    // "yvonnie",

      			    // "lilypichu", 
      			    // "fuslie", 
      			    // "natsumiii",
      			    // "ariasaki", 
      			    // "masayoshi", 
      			    // "quarterjade", 
      			    // "peterparktv", 
      			    // "kristoferyee", 
      			    // "kyedae_",
      			    "susu_jpg",
      			    "melina", 
      			    "imjasmine",
      			    "Jinnytty", 
      			    // "justaminx", 
      			    // "hasanabi",
      			    "botezlive", 
      			    "qtcinderella"
      			  ]


    			  	await TwitchTubeService.postTopShort({
								channels,
    			  	  viewThreshold:800,
    			  	  interval:"week",
    			  	  notify:false,
    			  	  upload:true
					})

	      		}
			},
	      	{
	      		label: 'test', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
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
	      			    "melina", 
	      			    "imjasmine",
	      			    "Jinnytty", 
	      			    "justaminx", 
	      			    "hasanabi",
	      			    "botezlive", 
	      			    "qtcinderella"
	      			  ]

	      			let res = await TwitchService.getUsers(channels)
	      			// let res2 = await TwitchService.getUser('naja_croc')
	      			console.log("TEST RES", res)
	      			// console.log("TEST RES2", res2)

	      			// let xxx = await TwitchService.getLiveChannels({channels:['cdawgva']})

	      			// stream {
	      			//   id: '42347519677',
	      			//   user_id: '45098797',
	      			//   user_login: 'cdawgva',
	      			//   user_name: 'CDawgVA',
	      			//   game_id: '19745',
	      			//   game_name: 'Pokémon Platinum',
	      			//   type: 'live',
	      			//   title: 'Alright time to suffer all day. NUZLOCKE (not really) 18 HOUR STREAM. | !nuzlocke !gyms !partypoke !deaths\n' +
	      			//     '\n',
	      			//   viewer_count: 8058,
	      			//   started_at: '2021-06-13T01:04:45Z',
	      			//   language: 'en',
	      			//   thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_cdawgva-{width}x{height}.jpg',
	      			//   tag_ids: [ '6ea6bca4-4712-4ab9-a906-e3336a9d8039' ],
	      			//   is_mature: false
	      			// }

	      		}
	      	}
	      ]
	    },    
	    {
	      label: 'youtube', 'submenu':[
	      	{
	      		label: 'enableClipoboardDownload', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
    					
    					if(!AuthService.isAuthenticated()){
    						AuthService.googleAuth('src/credentials.json').then((res)=>{
    							console.log("AutoClipoboardDL enabled!")
      						YoutubeService.enableAutoClipoboardDownload()
    						}).catch((err)=>{ })
    					}else{
  							console.log("AutoClipoboardDL enabled!")
      					YoutubeService.enableAutoClipoboardDownload()
    					}
  			    }
  			  },
	      	{
	      		label: 'enableClipoboardDLUL', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
    					
    					if(!AuthService.isAuthenticated()){
    						AuthService.googleAuth('src/credentials.json').then((res)=>{
    							console.log("AutoClipoboardDLUL enabled!")
      						YoutubeService.enableAutoClipoboardDLUL()
    						}).catch((err)=>{ })
    					}else{
  							console.log("AutoClipoboardDLUL enabled!")
      					YoutubeService.enableAutoClipoboardDLUL()
    					}
  			    }
  			  },
	      	{
	      		label: 'disableClipoboardDLUL', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
  							console.log("AutoClipoboardDLUL disabled!")
    					YoutubeService.disableAutoClipoboardDLUL()
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
	    { 
	      label: 'test', type: 'normal', click:async (menuItem, BrowserWindow, event)=>{
	      	console.log("test")
	      	await ScriptService.cmd('ffmpeg', [
	      		'-i', 'test/a.mp4', '-filter_complex',
	      		`[0]fade=t=in:st=1:d=3:color=white`,
	      		'-map', '[a]', '-map', '0:a',  '-c:v', 'libx264', '-c:a', 'aac',  'test/b.mp4'
	      	], {log:true})
	      } 
	    },   
	  ])

	  this.tray.setContextMenu(contextMenu)
	}

	async postMixCompilation(channels){
		await TwitchTubeService.postMixCompilation({
			channels,
			maxVideoLength: 12 * 60,
			interval:'day', //day|week|month
			treshold:400,
			notify:true,
			upload:true,
			download:true,
		})
	}

	async postSpecialCompilation(channels){
		await TwitchTubeService.postSpecialCompilation({
			channels,
			maxVideoLength: 8 * 60,
			minVideoLength: 6 * 60,
			interval:'week', //day|month
			treshold:400,
			notify:true,
			upload:true

		})

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