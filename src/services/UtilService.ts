var instance = null
import {shell, app, ipcMain} from 'electron';
import path from 'path';
import ScriptService from './ScriptService'
import * as fs from 'fs';
import moment from 'moment';

class UtilService{

	path = app.isPackaged 
		? path.join(process.resourcesPath, "\\src") 
		: path.join(__dirname, '..') 

	constructor(){}

	getPath(){
		return this.path
	}

	getRandomInt(min, max) {
	    min = Math.ceil(min);
	    max = Math.floor(max);
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	static get(){
		if(instance == null)
			instance =  new UtilService()
		return instance
	}
}


export default instance ? instance : instance = UtilService.get()