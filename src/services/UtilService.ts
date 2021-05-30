var instance = null
import {shell, app, ipcMain} from 'electron';
import path from 'path';
import ScriptService from './ScriptService'
import * as fs from 'fs';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

class UtilService{

	path = app.isPackaged 
		? path.join(process.resourcesPath, "\\src") 
		: 'src'

	public PATH = {
		ASSETS:'src\\assets',
		LOCAL:__dirname+'\\..'
	}
	constructor(){}

	getPath(){
		return this.path
	}
	getLocalPath(){
		return __dirname+'\\..'
	}
	getLocalRoot(){
		return __dirname+'\\..\\..'
	}

	getRandomInt(min, max) {
	    min = Math.ceil(min);
	    max = Math.floor(max);
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	capitalizeFirstLetter(string) {
	  return string.charAt(0).toUpperCase() + string.slice(1);
	}

	getUqId(){
		let rNum = uuidv4() 
		rNum.substring(rNum.length - 12)
		return rNum
	}


	async wait(duration){
	 return new Promise(resolve => setTimeout(resolve, duration))
	}

	shuffle(array) {
	  var currentIndex = array.length, temporaryValue, randomIndex;

	  // While there remain elements to shuffle...
	  while (0 !== currentIndex) {

	    // Pick a remaining element...
	    randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex -= 1;

	    // And swap it with the current element.
	    temporaryValue = array[currentIndex];
	    array[currentIndex] = array[randomIndex];
	    array[randomIndex] = temporaryValue;
	  }

	  return array;
	}

	static get(){
		if(instance == null)
			instance =  new UtilService()
		return instance
	}
}


export default instance ? instance : instance = UtilService.get()