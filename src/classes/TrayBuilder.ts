import {
  app,
  Menu,
  Tray,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
} from 'electron';

import path from 'path';
import GChatService from '../services/GChatService';
import ScriptService from '../services/ScriptService';
import TrelloService from '../services/TrelloService';
import AwsService from '../services/AwsService';
import ViewService from '../services/ViewService';
import EventService from '../services/EventService'
import TwitchService from '../services/TwitchService'
import YoutubeService from '../services/YoutubeService'
import AuthService from '../services/AuthService'
import checkInternetConnected from 'check-internet-connected';

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
	      		label: 'postTopClips', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			TwitchService.postMixCompilation({
	      				channels:[
		      				"TinaKitten", 
		      				"39daph", 
		      				"kkatamina",
		      				"xQcOW",
		      				"Sykkuno",
		      				"stevesuptic", 
		      				"xchocobars", 
		      				"lilypichu", 
		      				"fuslie", 
		      				"natsumiii",
		      				"ariasaki", 
		      				"masayoshi", 
		      				"quarterjade", 
		      				"peterparktv", 
		      				"kristoferyee", 
		      				"pokimane", 
		      				// "Jinnytty", 
		      				// "amouranth", 
		      				// "melina", 
		      				// "kiaraakitty",
		      				// "imjasmine",
		      				// "indiefoxx", 
		      				// "evaanna", 
	      				],
	      				maxVideoLength: 12 * 60,
	      				// maxVideoLength: 0,
	      				uploadClips:false,
	      				notify:true,
	      				upload:true

	      			})

  			    	console.log("TwitchService.downloadClip\n")
  			    	// EventService.pub('test', res)

  			    }
  			  },
	      	{
	      		label: 'test', type:'normal', click: async(menuItem, BrowserWindow, event)=>{
	      			// TwitchService.testSelenium()

							console.log("test ä< test".replace(/[^\x00-\x7F]/g, ""))

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
	      label: 'exit', type: 'normal', click:(menuItem, BrowserWindow, event)=>{
	      app.isQuiting = true
	      app.quit()
	      } 
	    },   
	  ])

	  this.tray.setContextMenu(contextMenu)
	}

}