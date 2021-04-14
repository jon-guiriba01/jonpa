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

class GmailService{
	PORT = 9876

	// If modifying these scopes, delete token.json.
	// The file token.json stores the user's access and refresh tokens, and is
	// created automatically when the authorization flow completes for the first
	// time.
  SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
  TOKEN_PATH = 'token.json';
  credPath = app.isPackaged 
  	? path.join(process.resourcesPath, "\\..\\creds\\") 
  	: path.join(__dirname, "../")
  gServer 

  mainWindow
  oAuth2Client
  gmail
  pubSubClient
	constructor(){
    this.pubSubClient = new PubSub()

	}

	init(mainWindow, oAuth2Client){
		this.mainWindow = mainWindow
    this.oAuth2Client = oAuth2Client
	}


  enablePushNotifs(){
    this.gmail.users.watch({
      userId:'me',
      topicName:'projects/jonpa-307706/topics/jonpa-gmail'
    },(err,res)=>{
      if(err) console.log(err)
      this.listenForMessages()
    })
  }

      
  // Creates a client; cache this for further use

  private listenForMessages() {
    // References an existing subscription
    const subscription = this.pubSubClient.subscription('projects/jonpa-307706/subscriptions/jonpa-gmail-sub');
    // Create an event handler to handle messages

    // Listen for new messages until timeout is hit
    subscription.on('message', async message => {
      message.ack();
      this.checkEmails()
    });

    //   subscription.removeListener('message', messageHandler);
  }

  checkEmails(){

  }

  //`from:jobs-listings@linkedin.com after:${moment().subtract(1,'months').format('YYYY/MM/DD')} before:${moment().format('YYYY/MM/DD')}`
	async getEmails(filter) {

    return new Promise((resolve,reject)=>{
      let emails = []
      this.gmail.users.messages.list({
        userId: 'me',
        q:filter
      }, async (err, res) => {

        let promises = []

        for(let message of res.data.messages){
          promises.push(
            new Promise((resolve,reject)=>{

              this.gmail.users.messages.get({
                userId:'me',
                id:message.id,
              },(err,res)=>{
                if(err) reject(err)
                resolve(res)
              })

            })
          )
        }

        Promise.all(promises).then((results) => {
          for(let res of results){
            for(let part of res.data.payload.parts){
              if(part.mimeType == 'text/html')
                emails.push({
                  html:part.body.data,
                  date:res.data.payload.headers.find(e=>e.name == 'Date').value,
                  from:res.data.payload.headers.find(e=>e.name == 'From').value
                })
            }
          }

          resolve(emails)
        });
        
        if (err) {
          return console.log('The API returned an error: ' + err);
          reject()
        }
      });

    })
	}	

  async fetchEmails(messageIds){

    let promises = []

    for(let id of messageIds){

      promises.push(
        new Promise((resolve,reject)=>{
          this.gmail.users.messages.get({
            userId:'me',
            id:id,
          },(err,res)=>{
            if(err) reject(err)
            resolve(res)
          })
        })
      )
    }

    let emails = []
    await Promise.all(promises).then((results) => {
      for(let res of results){
        for(let part of res.data.payload.parts){
          if(part.mimeType == 'text/html')
            emails.push({
              html:part.body.data,
              date:res.data.payload.headers.find(e=>e.name == 'Date').value,
              from:res.data.payload.headers.find(e=>e.name == 'From').value
            })
        }
      }

    });

    return emails
  }

	static get(){
		if(instance == null)
			instance =  new GmailService()
		return instance
	}
}

// module.exports.GmailService = GmailService.get()

export default instance ? instance : instance = GmailService.get()
