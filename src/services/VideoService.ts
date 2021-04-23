var instance = null
import {shell, app, ipcMain} from 'electron';
import path from 'path';
import ScriptService from './ScriptService'
import * as fs from 'fs';
import moment from 'moment';

class VideoService{

	path = app.isPackaged 
		? path.join(process.resourcesPath, "\\src\\assets") 
		: path.join(__dirname, '..\\assets') 

	constructor(){}
	// https://trac.ffmpeg.org/wiki/Concatenate#protocol
	async compile(config){
		console.log("compile begin with config ", config)
		return new Promise(async(resolve,reject)=>{
			let videos = config.videos

			let subSrt = await this.makeSrt(config.timestamps, config.outDir)

			try{

			  let temps = []
			  let raws = []
				// let transition = `${this.path}\\vids\\transition.ts`

				let intro = `${this.path}\\vids\\intro.mp4`
				// let intro = `${this.path}\\vids\\intro-xqc-1.mp4`
				let introTempFile = config.outDir+'\\'+"temp_intro.ts"
				let introTempRawFile = config.outDir+'\\'+"raw_temp_intro.ts"
				await ScriptService.cmd('ffmpeg', [
					'-i', intro, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', introTempRawFile
				], {log:false})
				await ScriptService.cmd('ffmpeg', [
					'-i', introTempRawFile, '-b:v', '8000k', '-b:a', '160k', '-ar', '44100', 
					'-vf', "scale=1920:1080,setdar=16/9",  '-f', 'mpegts',  '-c:v', 'libx264', introTempFile
				], {log:false})
				temps.push(introTempFile)
				raws.push(introTempRawFile)

				for(let i = 0; i < videos.length; i++){

					let tempFile = config.outDir+'\\'+"temp"+i+".ts"
					let tempRawFile = config.outDir+'\\'+"raw_temp"+i+".ts"

					console.log("creating temp for " + videos[i])

					await ScriptService.cmd('ffmpeg', [
						'-i', videos[i], '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', tempRawFile
					], {log:false})
					await ScriptService.cmd('ffmpeg', [
						'-i', tempRawFile, '-b:v', '8000k', '-b:a', '160k', '-ar', '44100', 
						'-vf', "scale=1920:1080,setdar=16/9",  '-f', 'mpegts', '-c:v', 'libx264', tempFile
					], {log:false})
					temps.push(tempFile)
					raws.push(tempRawFile)
					// temps.push(transition)
				}

				let outro = `${this.path}\\vids\\outro.mp4`
				let outroTempFile = config.outDir+'\\'+"temp_outro.ts"
				let outroTempRawFile = config.outDir+'\\'+"raw_temp_outro.ts"
				await ScriptService.cmd('ffmpeg', [
					'-i', outro, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', outroTempRawFile
				], {log:false})

				await ScriptService.cmd('ffmpeg', [
					'-i', outroTempRawFile, '-b:v', '8000k', '-b:a', '160k', '-ar', '44100',
					 '-vf', "scale=1920:1080,setdar=16/9",  '-f', 'mpegts','-c:v', 'libx264', outroTempFile
				], {log:false})
				temps.push(outroTempFile)
				raws.push(outroTempRawFile)

						// '-i BlindingMistyWaffleKappaClaus-WuekI_40vRqY5OKy.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts temp1.ts'
			  let outPath = config.outDir+'\\'+config.outName
			  let rawOutPath = config.outDir+'\\'+ 'raw_'+config.outName

				console.log(">> Concat action started")

				await ScriptService.cmd(
					'ffmpeg', [
							'-i', `concat:${temps.join('|')}`, '-c', 'copy', 
							rawOutPath
					], {log:true})

				// ffmpeg -i "concat:temp1.ts|temp2.ts" -c copy -bsf:a aac_adtstoasc -r 60 testout.mp4
				try{
					for(let temp of temps){
						fs.unlinkSync(temp)
					}
					for(let raw of raws){
						fs.unlinkSync(raw)
					}
				}catch{}
				
				console.log(">> Concat finished..")
				console.log(">> Adding subs..")

				let fontsDir = `${this.path}\\fonts`
				// fontsDir = fontsDir.replaceAll('\\','/') // workaround
				let subPath = `${config.outDir}\\compilation.srt`
				subPath = subPath.replaceAll('\\','/') // workaround
				// let subPath = `../twitch/mix/compilation.srt`

				// "subtitles=\'C:/Users/Jon/Personal Projects/pa-beta/src/twitch/mix/compilation.srt\':fontsdir='./fonts':force_style='FontName=Patchwork Stitchlings,FontSize=21,Alignment=7'" compilation2.mp4
				await ScriptService.cmd(
					`ffmpeg -i src\\twitch\\mix\\raw_compilation.mp4 -vf "subtitles='src/twitch/mix/compilation.srt':force_style='FontName=Sweet Talk,FontSize=23,Alignment=7'" -b:v 8000k -b:a 160k -ar 44100 src\\twitch\\mix\\compilation.mp4`,
					 [], 
					 {log:true, shell:true}
				)

				console.log(">> Added subs..")

				// ffmpeg -i ${outPath} -vf subtitles=${config.outDir}\\compilation.srt:fontsdir='${this.path}\\fonts\\KGCandyCaneStripe.ttf':force_style='FontName=KG Candy Cane Stripe,Fontsize=20' compilation2.mp4
				resolve(outPath)
			}catch(err){
				console.log(err)
				reject()
			}


		})

	}


	async makeSrt(timestamps, outDir){
		let data = ""
		let outFile = `${outDir}\\compilation.srt`
		
		for(let i = 0; i < timestamps.length; i++){
			let min = timestamps[i].time / 60
			let sec = timestamps[i].time % 60
			data += `${i+1}\n`
			data += 
				moment().date("2015-01-01").minutes(min).seconds(sec).format("00:mm:ss,00")
				+ " --> "
				+ moment().date("2015-01-01").minutes(min).seconds(sec+5).format("00:mm:ss,00")
				+ "\n"
			data += timestamps[i].title +"\n"
			data += "\n"
		}

		await fs.writeFileSync(outFile, data);
		return outFile
	}

	getInformation(vid, format){
		return new Promise(async (resolve,reject)=>{
			let res = await ScriptService.cmd(
				`ffprobe -i ${vid} -show_entries format=${format} -v quiet -of csv="p=0"`,
				 [], 
				 {log:true, shell:true}
			)

			resolve(res)
			
		})
	}


	static get(){
		if(instance == null)
			instance =  new VideoService()
		return instance
	}
}


export default instance ? instance : instance = VideoService.get()