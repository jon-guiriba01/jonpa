var instance = null
import {shell, app, ipcMain} from 'electron';
import path from 'path';
import moment from 'moment';
import Storage from 'node-storage'
import UtilService from './UtilService'

class StorageService{
	store
	constructor(){}

	get(key){
		return this.store.get(key)
	}
	set(key, value){
    this.store.put(key, value)
	}

	static get(){
		if(instance == null){
			instance =  new StorageService()
			instance.store = new Storage(`${UtilService.getPath()}/twitch-storage`)
		}
		return instance
	}
}


export default instance ? instance : instance = StorageService.get()