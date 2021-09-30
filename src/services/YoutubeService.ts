import fetch from 'node-fetch';
import * as fs from 'fs';
import * as readline from 'readline';
import {
  google,   // The top level object used to access services
  drive_v3, // For every service client, there is an exported namespace
  Auth,     // Namespace for auth related types
  Common,   // General types used throughout the library
} from 'googleapis';
import {
  app,
  Menu,
  Tray,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  Notification,
  clipboard
} from 'electron';
import path from 'path';
import * as http from 'http';
import * as url from 'url';
import moment from 'moment';
import axios from 'axios';

import express from 'express'
import bodyParser from 'body-parser'

import EventService from './EventService'
import SeleniumService from './SeleniumService'
import UtilService from './UtilService'
import { encode, decode } from 'js-base64';

var instance = null
import youtubedl from 'youtube-dl-exec'
import {Builder, By, Key, until} from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox'
import sound from "sound-play"



const UPLOAD_URL = 'https://www.youtube.com/upload'
const WAIT_DURATION = 2 * 1000

class YoutubeService{

  PORT = 9876
  // If modifying these scopes, delete token.json.
  // The file token.json stores the user's access and refresh tokens, and is
  // created automatically when the authorization flow completes for the first
  // time.
  SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
  TOKEN_PATH = 'token.json';
  credPath = app.isPackaged 
    ? path.join(process.resourcesPath, "\\..\\creds\\") 
    : path.join(__dirname, "../")
  gServer 

  mainWindow
  oAuth2Client
  youtube
  pubSubClient
  clipboardDLULInterval
  clipboardDLInterval
  constructor(){
  }

  init(mainWindow, oAuth2Client){
    this.mainWindow = mainWindow
    this.oAuth2Client = oAuth2Client

    this.youtube = google.youtube('v3')

  }

  async download(url){
    try{
      await fs.rmdirSync(`${UtilService.PATH.LOCAL}\\youtube\\clips`, {recursive:true})
      await fs.mkdirSync(`${UtilService.PATH.LOCAL}\\youtube\\clips`)

      console.log("\nYoutube Download\n", url)
      let metaData = await youtubedl(url, {
        dumpJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        referer: url
      })
      console.log("\nmetaData\n", metaData)
      let filename = `${UtilService.getUqId()}`
      let dlRes = await youtubedl(url, {
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        referer: url,
        output:`src/youtube/clips/${filename}.%(ext)s`
      })
      // console.log("dlRes\n", dlRes)
      let files = await fs.readdirSync(`${UtilService.PATH.LOCAL}\\youtube\\clips`)

      await new Notification({
        title: 'download done',
        body: files[0],
        hasReply:true
      }).show()
      await sound.play(`${UtilService.getLocalPath()}/assets/audio/ring1.mp3`, 1);

      return {
        filePath:`${UtilService.PATH.LOCAL}\\youtube\\clips\\${files[0]}`,
        title:metaData.title,
        tags:metaData.tags,
        description:metaData.description,
        notify:false
      }
    }catch(err){
      console.log(err)
    }
  }

  upload(params){

    console.log("UPLOADING TO YOUTUBE WITH PARAMS", params)
    return SeleniumService.ytUpload(params)
  }

  apiUpload(videoPath, thumbPath = null, opts){
    return new Promise((resolve,reject)=>{
      this.youtube.videos.insert({
        auth:this.oAuth2Client,
        part: 'snippet,status',
        requestBody:{
          snippet:{
            title:opts.title,
            description:"",
            categoryIds: 24, //entertainment
            defaultLanguage: 'en',
            defaultAudioLanguage: 'en',
            tags:opts.tags
          },
          status:{
            privacyStatus: "public",
            selfDeclaredMadeForKids: false
          }
        }, 
        media: {
          body: fs.createReadStream(videoPath),
        },
      },(err, response)=>{
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }
        console.log(response.data)

        console.log('Video uploaded. Uploading the thumbnail now.')

        if(thumbPath){
          this.youtube.thumbnails.set({
            auth: this.oAuth2Client,
            videoId: response.data.id,
            media: {
              body: fs.createReadStream(thumbPath)
            },
          }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
              return;
            }
            resolve(true)
            console.log(response.data)
          })
        }else{
          resolve(true)
        }


      })
    })
  
  }

  enableAutoClipoboardDownload(){
    if(this.clipboardDLInterval) return

    this.clipboardDLInterval = setInterval(()=>{
      if(clipboard.readText().includes('youtube.com/watch')){
        let url = clipboard.readText()
        clipboard.clear()
        
        this.download(url).then(async (opts)=>{

          new Notification({
            title: 'youtbe download finished',
            body: params.title,
            hasReply:false
          }).show()

          await sound.play(`${UtilService.PATH.ASSET}/audio/ring1.mp3`, 1);
          
        }).catch((err)=>{
          console.log("err", err)
        })
        
      }
    },2500)

  }
  enableAutoClipoboardDLUL(){
    if(this.clipboardDLULInterval) return

    this.clipboardDLULInterval = setInterval(()=>{
      if(clipboard.readText().includes('youtube.com/watch')){
        let url = clipboard.readText()
        clipboard.clear()
        
        this.download(url).then((opts)=>{
          this.upload({
            filePath:opts.filePath,
            title:opts.title,
            description:opts.description,
          })
        }).catch((err)=>{
          console.log("err", err)
        })
        
      }
    },2500)
  }

  disableAutoClipoboardTransfer(){
    if(this.clipboardInterval)
      clearInterval(this.clipboardInterval)
  }

  getChannel(channelName) {
    this.youtube.channels.list({
      auth: this.oAuth2Client,
      part: 'snippet,contentDetails,statistics',
      id: 'UCL2ygm2wYqUd5nZtuain0AA,UC_nG_n6DkvYPA4E4GnxDPOg'
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }

      console.log('>>>>>>>>> getChannel')
      console.log(response)

      var channels = response.data.items;

      for(let channel of channels){
        console.log('channel')
        console.log(channel)
      }
    });
  }

  static get(){
    if(instance == null)
      instance =  new YoutubeService()
    return instance
  }
}

// module.exports.GmailService = GmailService.get()

export default instance ? instance : instance = YoutubeService.get()
