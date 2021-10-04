var instance = null
import {shell, app, ipcMain} from 'electron';
import path from 'path';
import * as fs from 'fs';
import UtilService from './UtilService'

class FileService{
	


	constructor(){}

	async cleanTwitchDir(){

		console.log("cleaning Twitch dir")
		if (await fs.existsSync(`${UtilService.getPath()}/twitch`)){
			await fs.rmdirSync(`${UtilService.getPath()}/twitch`, {recursive:true})
		}
		console.log("create twitch")
		await fs.mkdirSync(`${UtilService.getPath()}/twitch`)
		console.log("create twitch/mix")
		await fs.mkdirSync(`${UtilService.getPath()}/twitch/mix`)
		console.log("create twitch/shorts")
		await fs.mkdirSync(`${UtilService.getPath()}/twitch/shorts`)
		

	}
	static get(){
		if(instance == null){
			instance =  new FileService()
		}
		return instance
	}
}


export default instance ? instance : instance = FileService.get()