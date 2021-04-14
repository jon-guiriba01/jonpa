import {shell, app, dialog} from 'electron';
import * as electron from 'electron';
import path from 'path';
import {spawn} from 'child_process'

var instance = null



class ScriptService{
	path = app.isPackaged 
		? path.join(process.resourcesPath, "\\src\\local\\") 
		: path.join(__dirname, "../local/")
	constructor(){}

	run(filePath) {
		try{
		  shell.openExternal(this.path + filePath);
		}catch(err){
			console.log("err",err)
		}
	}	


	// This function will output the lines from the script 
	// and will return the full combined output
	// as well as exit code when it's done (using the callback).
	cmd(command, args, opts) {
		return new Promise((resolve,reject)=>{
			try{
				var child = spawn(command, args, {
				    encoding: 'utf8',
				    shell: false
				});
				// You can also use a variable to save the output for when the script closes later

				child.stdout.setEncoding('utf8');
				child.stdout.on('data', (data) => {
				    //Here is the output
				    if(opts?.log){
					    data=data.toString();   
					    console.log('spawn[stdout DATA]\n');      
					    console.log(data);  
				    }    
				});

				child.stderr.setEncoding('utf8');
				child.stderr.on('data', (data) => {
				    // Return some data to the renderer process with the mainprocess-response ID
				    // mainWindow.webContents.send('mainprocess-response', data);
				    //Here is the output from the command
				    if(opts?.log){
					    console.log('spawn[stderr DATA]\n');      
					    console.log(data);  
					  }
				});

				child.on('close', (code) => {
			    if(opts?.log){
			    	console.log('spawn[close]\n')
			    }      
					resolve(true)
				});
				child.on('disconnect', (code) => {
			    if(opts?.log){
				    console.log('spawn[disconnect]\n');
				  }
					reject()
				});
				child.on('error', (error) => {
			    if(opts?.log){
			    	console.log( 'spawn[error]\r\n' + error)
				  }
					reject()
				});
				child.on('exit', (code) => {
			    if(opts?.log){
				    console.log('spawn[exit]\n');  
				  }    
					resolve(true)
				});
	

			}catch(err){
				console.log(err)
				reject()
			}

		})
	
	   
	}


	static get(){
		if(instance == null)
			instance =  new ScriptService()
		return instance
	}
}

export default instance ? instance : instance = ScriptService.get()
