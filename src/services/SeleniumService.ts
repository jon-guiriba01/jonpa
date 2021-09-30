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
  clipboard,
  Notification
} from 'electron';
import path from 'path';
import * as http from 'http';
import * as url from 'url';
import moment from 'moment';
import axios from 'axios';

import express from 'express'
import bodyParser from 'body-parser'

import EventService from './EventService'
import { encode, decode } from 'js-base64';

var instance = null
import {Builder, By, Key, until} from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox'

const UPLOAD_URL = 'https://www.youtube.com/upload'
const WAIT_DURATION = 2 * 1000
import sound from "sound-play"
import UtilService from './UtilService'

class SeleniumService{

  driver
  drivers = []
  constructor(){
  }

  ytUpload(params){
    return new Promise(async (resolve,reject)=>{
      let driver = await this.open()          

      try {
        //go to upload to youtube upload modal
        await driver.get('https://www.youtube.com/upload')

        //upload file
        await driver.findElement(By.xpath("//input[@type='file']")).sendKeys(params.filePath);
        await this.sleep(5000)

        //get modal
        let eModal = await driver.findElement(By.css("#dialog.ytcp-uploads-dialog"))
        await this.sleep(WAIT_DURATION)
        // select and input title
        let eTitle = await eModal.findElement(By.id('textbox'))
        await eTitle.click()
        await eTitle.sendKeys(Key.CONTROL, 'a', Key.CONTROL, Key.BACK_SPACE)
        await eTitle.sendKeys(params.title)

        // select made for kids radio
        // let eKidsSelect = await eModal.findElement(By.name('NOT_MADE_FOR_KIDS'))
        // await eKidsSelect.findElement(By.id("radioLabel")).click()


        // aapply thumbnail
        if(params.thumbnail){
          try{
            // let container = await eModal.findElement(
            //   By.id(
            //     'file-loader'
            //   )
            // ).sendKeys(params.thumbnail)     
            let container = await eModal.findElement(
             By.xpath("//input[@id='file-loader']")
            ).sendKeys(params.thumbnail)

            await this.sleep(2000)

          }catch(err){
            console.log("thumbnail err", err)
          }
        // style-scope ytcp-thumbnails-compact-editor-uploader

        }

        // select and input description
        if (params.description){
          let container = await eModal.findElement(By.xpath(
              "/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[2]/ytcp-mention-textbox/ytcp-form-input-container/div[1]/div[2]/ytcp-mention-input"
            )
          )
          let eDescription = await container.findElement(By.id('textbox'))
          await eDescription.click()
          await eDescription.clear()
          await eDescription.sendKeys(params.description)
        }

        
        if(params.playlist){

          try{

            let ePlaylistToggle = await eModal.findElement(By.css(
              '.style-scope.ytcp-text-dropdown-trigger'
            ))
            
            await ePlaylistToggle.click()
            await this.sleep(2000)

            let ePlaylistSearch = await eModal.findElement(By.xpath(
              '/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[1]/input'
            ))
            await ePlaylistSearch.sendKeys(params.playlist)
            await this.sleep(2000)
            
            let ePlaylistItem = await eModal.findElement(By.xpath(
              "/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/ytcp-checkbox-group/div/ul/tp-yt-iron-list/div/ytcp-ve[1]/li/label"
            )) 
            await this.sleep(1000)

            // try{
            // let ePlaylistItem = await ePlaylistContainer.findElement(By.linkText(params.playlist))
            // await ePlaylistItem.click()
            await ePlaylistItem.click()
            await this.sleep(1000)

            let eDoneBtn = await eModal.findElement(By.xpath(
              '/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[2]/ytcp-button[3]/div'
            ))
            eDoneBtn.click()
            await this.sleep(1000)

            // }catch(err){
            //   console.log("error selecting existing playlist, creating a new one")
            //   let eNewPlaylistBtn = await eModal.findElement(By.xpath(
            //     '/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[2]/ytcp-button[1]'
            //   ))
            //   await eNewPlaylistBtn.click()
            //   await this.sleep(1000)


            //   let eNewPlaylistTextarea = await eModal.findElement(By.xpath(
            //     '/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[2]/div[1]/ytcp-form-textarea/div/textarea'
            //   ))
            //   await eNewPlaylistTextarea.click()
            //   await eNewPlaylistTextarea.sendKeys(params.playlist)
            //   await this.sleep(1000)

            //   let eCreateBtn = await eModal.findElement(By.xpath(
            //     '/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[3]/ytcp-button[2]/div'
            //   ))
            //   eCreateBtn.click()
            //   await this.sleep(1000)

            //   let ePlaylistItem = await eModal.findElement(By.linkText(params.playlist))
            //   await ePlaylistItem.click()

            //   let eDoneBtn = await eModal.findElement(By.xpath(
            //     '/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[2]/ytcp-button[3]/div'
            //   ))
            //   eDoneBtn.click()
            //   await this.sleep(1000)
            // }

          }catch(err){
            console.log(err)
          }

          
        }

        await this.sleep(500)

        
        let eShowMoreToggle = await eModal.findElement(By.xpath(
          '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-video-metadata-editor/div/div/ytcp-button/div'
        ))
        await eShowMoreToggle.click()
        await this.sleep(500)

        if (!params.notify){
          // let notifyContainer = await eModal.findElement(By.id('notify-subscribers'))
          // let eNotify = await eModal.findElement(By.xpath(
          //   '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-advanced/div[5]/div[4]/ytcp-checkbox-lit/div[2]'
          // ))
          // await eNotify.click()
        }

        await this.sleep(500)
        await eModal.findElement(By.id("next-button")).click()

        await this.sleep(500)
        await eModal.findElement(By.id("next-button")).click()

        try{ // if suddenly 3 tabs
          await this.sleep(WAIT_DURATION)
          await eModal.findElement(By.id("next-button")).click()
        }catch(err){}

        let ePublicRadio = await eModal.findElement(By.name('PUBLIC'))
        await ePublicRadio.findElement(By.id("radioLabel")).click()
        // video_id = self.get_video_id(modal)
        let eStatus = await eModal.findElement(By.xpath("/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[2]/div/div[1]/ytcp-video-upload-progress/span"))


        let eDoneButton = await eModal.findElement(By.id("done-button"))
        await this.sleep(WAIT_DURATION)
        eDoneButton.click()

        await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Video upload complete')]")), 1000 * 60 * 5);
        await this.sleep(2000)

        await driver.quit();

        new Notification({
          title: 'upload finished',
          body: params.title,
          hasReply:false
        }).show()

        await sound.play(`${UtilService.PATH.ASSET}/audio/ring1.mp3`, 1);
        console.log('Upload finished..')
        
        
        resolve(null)
      } catch(err){
        console.log(err)
        resolve(null)
      }finally {
        // await this.sleep(60000 * 10)
        // await driver.quit();
      }

    })

 
  }

  async close(){
    await this.driver.quit()
  }

  closeAll(){
    let promises = []

    for(let driver of this.drivers){
      let p = new Promise((resolve,reject)=>{
        try{
          driver.quit()
          resolve()
        }catch(err){
          resolve()
        }
      })
      promises.push(p)
    }

    return Promise.all(promises)
  }

  async open(){
    let driver = await new Builder().forBrowser('firefox')
      .setFirefoxOptions(
        new firefox.Options()
          .headless()
          .setProfile(process.env.FIREFOX_PROFILE)
      ).build()
    this.drivers.push(driver)
    return driver
  }

  async sleep(duration){
   return new Promise(resolve => setTimeout(resolve, duration))
  }

  static get(){
    if(instance == null)
      instance =  new SeleniumService()
    return instance
  }
}

// module.exports.GmailService = GmailService.get()

export default instance ? instance : instance = SeleniumService.get()
