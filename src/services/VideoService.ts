var instance = null
import ScriptService from './ScriptService'
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';

class VideoService{

	constructor(){}
	// https://trac.ffmpeg.org/wiki/Concatenate#protocol
	async compile(config){
		console.log("compile begin with config ", config)
		return new Promise(async(resolve,reject)=>{
			let videos = config.videos

			try{

			  let temps = []
				for(let i = 0; i < videos.length; i++){

					let tempFile = config.outPath+'\\'+"temp"+i+".ts"

					console.log("creating temp for " + videos[i])

					let res = await ScriptService.cmd('ffmpeg', [
						'-i', videos[i], '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', tempFile
					], {log:false})

					temps.push(tempFile)
				}
						// '-i BlindingMistyWaffleKappaClaus-WuekI_40vRqY5OKy.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts temp1.ts'

				console.log(">>>>> Concat action started")
				await ScriptService.cmd(
					'ffmpeg', [
							'-i', `concat:${temps.join('|')}`, '-c', 'copy', 
							'-bsf:a', 'aac_adtstoasc', config.outPath+'\\'+config.outName
					], {log:false})


				for(let temp of temps){
					fs.unlinkSync(temp);
				}

				resolve(true)
			}catch(err){
				console.log(err)
				reject()
			}


		})

	}

	async edit(config){

		return new Promise(async(rootResolve,rootReject)=>{

			let videos = config.videos
			let outPath = config.outPath
			let toDelete = []
			for(let i = 0; i < videos.length; i++){
				console.log("CONCAT ITERATION ", i)
				let tempOutPath  =
					outPath.slice(0,outPath.indexOf('.mp4') ) + 
					i +
					outPath.slice(outPath.indexOf('.mp4') )


					let editor

					if(i == 0)
						editor = ffmpeg()
					else{
						let prevTempOutPath = 
							outPath.slice(0,outPath.indexOf('.mp4') ) + 
							(i-1) +
							outPath.slice(outPath.indexOf('.mp4') )

						toDelete.push(prevTempOutPath)
							
						editor = ffmpeg().input(prevTempOutPath)
							.videoCodec('libx264')
							.audioCodec('aac')
							.fps(30)
	  					.size('720x1280')
							.autopad()
							// .keepDAR()
					}

					editor.input(videos[i])
						.videoCodec('libx264')
						.audioCodec('aac')
						.fps(30)
  					.size('720x1280')
						.autopad()
						// .keepDAR()

					editor.on('start', function(err) {
					  console.log('compiling..', videos[i])
					})
	
					editor.on('codecData', function(data) {
				    console.log('Codec Data ')
				    console.log(data)
				  });

					editor.on('progress', function(progress) {
					  console.log('Processing: ' + progress.percent + '% done');
					})

					editor.on('stderr', function(stderrLine) {
				    console.log('Stderr output: ' + stderrLine);
				  });

					if(i != videos.length-1)
				  	editor.mergeToFile(tempOutPath, 'ffmepg-temp')
					else
				  	editor.mergeToFile(outPath, 'ffmepg-temp');

				  await new Promise((resolve,reject)=>{
					  editor.on('error', function(err) {
					    console.log('An error occurred: ' + err.message);
					    // return this.concat(videos,index+1,outPath)
		  	    	resolve(true)
					  })

			  	  editor.on('end', function() {
			  	    console.log('concat success !')
		  	    	resolve(true)
			  	  })


				  })

			}

			for(let path of toDelete){
				fs.unlinkSync(path);
			}

			rootResolve(outPath)
			// console.log("Concat Res", concatRes)

			// let i = 0
			// for(let video of config.videos){
			// 	if(i == 5) break
			// 	editor.input(video)
			// 	i++
			// }


		})

	}

	static get(){
		if(instance == null)
			instance =  new VideoService()
		return instance
	}
}


export default instance ? instance : instance = VideoService.get()