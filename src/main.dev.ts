
// https://twitchtokengenerator.com/

/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */


import 'core-js/stable'
import 'regenerator-runtime/runtime'
import path from 'path'
import { app, BrowserWindow, shell, Menu, Tray, ipcMain, clipboard } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import MenuBuilder from './classes/MenuBuilder'
import TrayBuilder from './classes/TrayBuilder'
import checkInternetConnected from 'check-internet-connected'
// import ScriptService from './services/ScriptService'
// import AwsService from './services/AwsService'
// import GChatService from './services/GChatService'
import ViewService from './services/ViewService'
import TrelloService from './services/TrelloService'
import GmailService from './services/GmailService'
import EventService from './services/EventService'
import AuthService from './services/AuthService'
import YoutubeService from './services/YoutubeService'
import TwitchService from './services/TwitchService'
import TwitchTubeService from './services/TwitchTubeService'
import fetch from 'node-fetch';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {

  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.DEBUG_PROD !== 'true'
  ) {
    return
  }

  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};


let mainWindow: BrowserWindow | null = null;

const init = async()=>{

  ipcMain.on('runCommand', async (event, arg) => {
    event.returnValue = []
  });  
  ipcMain.on('gauth', async (event, arg) => {
    console.log("recieved ipcMain", arg)
  });

  var retryInterval = setInterval(()=>{
    checkInternetConnected({
      timeout: 5000, 
      retries: 1,
      domain: 'google.com'
    }).then(() => {
      createWindow()
      clearInterval(retryInterval)
    }).catch((err) => {
      console.log("No connection", err);
    });
  }, 3000)


}

const createWindow = async () => {

  await installExtensions();
  const assetPath = getAssetPath()

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: assetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }

    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }

  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', function (event) {
      if(!app.isQuiting){
        event.preventDefault();
        mainWindow.hide();
      }
      return false;
  });

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.webContents.openDevTools()

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  mainWindow.webContents.on('did-finish-load', async() => {
    console.log("FINISHED LOAD \n\n\n")
    let menuBuilder = new MenuBuilder(mainWindow) 
    menuBuilder.buildMenu()
    let trayBuilder = new TrayBuilder(mainWindow) 
    trayBuilder.buildTray()

    process.on('uncaughtException', function (err) {
      console.log("GLOBAL ERROR CAUGHT..", err.stack);
    });


    EventService.sub('auth:success', async(oAuth2Client)=>{
      console.log("auth:success")
      GmailService.init(mainWindow,oAuth2Client)
      YoutubeService.init(mainWindow,oAuth2Client)
      // YoutubeService.enableAutoClipoboardDownload()
      // YoutubeService.getChannel('Box')
      // YoutubeService.upload('src/test.mp4')
      // YoutubeService.download('https://www.youtube.com/watch?v=g5o9hbYfZLs')
      // mainWindow.webContents.send('emails', emails);
    })

    EventService.sub('test', (res)=>{
      mainWindow.webContents.send('test', res);
    })
    EventService.sub("context-menu:settings", (res)=>{
      mainWindow.webContents.send('context-menu:settings', res);
    })
    EventService.sub("gauth", (authUrl)=>{
      console.log("sent: ", authUrl)
      mainWindow.webContents.send('gauth', authUrl);
    })
    

    AuthService.googleAuth('src/credentials.json')

    const HOUR = 60 * 60 * 1000;

    console.log(`autoUploadInterval started every 3 hours`)
    var autoUploadInterval = setInterval(async()=>{
      
      let channels = [
        "TinaKitten", 
        // "SteveSuptic", 
        // "xChocoBars", 
        // "BrookeAB", 
        // "5uppp", 
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
        // "natsumiii",
        "ariasaki", 
        "masayoshi", 
        "quarterjade", 
        "peterparktv", 
        "kristoferyee", 
        "kyedae_",
        // "susu_jpg",
        "melina", 
        // "imjasmine",
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

    }, HOUR * 3)
  
  })

  
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});


app.whenReady().then(init).catch(console.log);

const getAssetPath = ()=>{

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '/assets');


  return  (...paths: string[]): string => {
      return path.join(RESOURCES_PATH, ...paths);
    };
}