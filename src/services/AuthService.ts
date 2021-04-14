import fetch from 'node-fetch';
import fs from 'fs';
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
} from 'electron';
import path from 'path';
import * as http from 'http';
import * as url from 'url';
import moment from 'moment';
import axios from 'axios';

import express from 'express'
import bodyParser from 'body-parser'

import EventService from './EventService'
import {PubSub} from '@google-cloud/pubsub'
import { encode, decode } from 'js-base64';

var instance = null

class AuthService{

  PORT = 9876
	// If modifying these scopes, delete token.json.
	// The file token.json stores the user's access and refresh tokens, and is
	// created automatically when the authorization flow completes for the first
	// time.
  SCOPES = [
   'https://www.googleapis.com/auth/youtube',
   'https://www.googleapis.com/auth/youtube.upload',
   'https://www.googleapis.com/auth/youtube.readonly',
   'https://www.googleapis.com/auth/gmail.readonly'];
  TOKEN_PATH = 'token.json';
  credPath = app.isPackaged 
  	? path.join(process.resourcesPath, "\\..\\creds\\") 
  	: path.join(__dirname, "../")
  gServer 

  mainWindow
  oAuth2Client
	constructor(){

	}

	async init(){
	}
  isAuthenticated(){
    return this.oAuth2Client ? true : false
  }
	googleAuth(credentials){
    return new Promise((resolve,reject)=>{

      fs.readFile(credentials, (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);

        let tokens = JSON.parse(content)

        let {client_secret, client_id, redirect_uris} = tokens.web;
        
        this.oAuth2Client = new google.auth.OAuth2(
          client_id, client_secret, 
          redirect_uris[0]
        );

        fs.readFile(this.TOKEN_PATH, async(err, token) => {
          if (err){
          console.log("try AUTH 2")
            let success = await this.getNewToken(this.oAuth2Client);
          console.log("SUCCESS AUTH 2")
            
            if(success) resolve(this.oAuth2Client)
            else reject()
          } 

          console.log("SUCCESS AUTH 1")
          this.oAuth2Client.setCredentials(JSON.parse(token))
          EventService.pub('auth:success', this.oAuth2Client)
          resolve(this.oAuth2Client)

        });

      });
      reject()
    })

	}


	async getNewToken(oAuth2Client) {
    return new Promise((resolve,reject)=>{

      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.SCOPES,
      });

      EventService.pub('gauth',authUrl)
    
      this.gServer = express().use(bodyParser.json())
      this.gServer.listen(this.PORT, () => console.log('GmailService is listening'));
      setTimeout(()=>{
        try{
          this.gServer.close()
        }catch(err){
          // console.log(err)
        }
        reject(false)
      },30000)

      this.gServer.get('/oauth2callback', async(req, res) => { 
      try{
        let code = req.query.code
        var {tokens} = await this.oAuth2Client.getToken(code)

        fs.writeFile(this.TOKEN_PATH, JSON.stringify(tokens), (err) => {
          if (err) return console.error(err);
        });

        this.oAuth2Client.setCredentials(tokens);
        EventService.pub('auth:success', this.oAuth2Client)
        resolve(true)

        res.sendStatus(200)
        this.gServer.close()
      }catch(err){
        console.log(err)
        reject(false)
      } 


      })

    })
	}



	static get(){
		if(instance == null)
			instance =  new AuthService()
		return instance
	}
}

// module.exports.GmailService = GmailService.get()

export default instance ? instance : instance = AuthService.get()
