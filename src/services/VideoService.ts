var instance = null
import {shell, app, ipcMain} from 'electron';
import path from 'path';
import ScriptService from './ScriptService'
import UtilService from './UtilService'
import * as fs from 'fs';
import moment from 'moment';
import { titleCase } from "title-case";
import jimp from 'jimp';

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

			// let subSrt = await this.makeCompilationSrt(config.timestamps, config.outDir)

			try{

			  let temps = []
			  let raws = []
				// let transition = `${this.path}\\vids\\transition.ts`

				// let intro = `${this.path}\\vids\\intro.mp4`
				// let introTempFile = config.outDir+'\\'+"temp_intro.ts"
				// let introTempRawFile = config.outDir+'\\'+"raw_temp_intro.ts"
				// await ScriptService.cmd('ffmpeg', [
				// 	'-i', intro, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', introTempRawFile
				// ], {log:false})
				// await ScriptService.cmd('ffmpeg', [
				// 	'-i', introTempRawFile, '-b:v', '8000k', '-b:a', '160k', '-ar', '44100', 
				// 	'-vf', "scale=1920:1080,setdar=16/9",  '-f', 'mpegts',  '-c:v', 'libx264', introTempFile
				// ], {log:false})
				// temps.push(introTempFile)
				// raws.push(introTempRawFile)
				let introRand = 1
				let introPath = `${UtilService.PATH.ASSETS}\\vids\\intro${introRand}.ts`


				temps.push(introPath)

				for(let i = 0; i < videos.length; i++){

					let tempFile = `${config.outDir}\\temp${i}_${config.processId}.ts`
					let tempSrtPath = `src/twitch/mix/temp_srt${i}.srt`
					let tempRawFile = `${config.outDir}\\raw_temp${i}_${config.processId}.ts`

					console.log("creating temp for " + videos[i].file)
					
					let tempSrt = await this.makeTempSrt(videos[i].title, tempSrtPath)

					await ScriptService.cmd('ffmpeg', [
						'-i', videos[i].file, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', tempRawFile
					], {log:true})
					// await ScriptService.cmd('ffmpeg', [
					// 	'-i', tempRawFile, '-b:v', '8000k', '-b:a', '160k', '-ar', '44100', 
					// 	'-vf', "scale=1920:1080,setdar=16/9",  '-f', 'mpegts', '-c:v', 'libx264', tempFile
					// ], {log:false})

			


					if(i == 0){

						await ScriptService.cmd('ffmpeg', [
							'-i', tempRawFile, '-filter_complex',
							`[0]scale=1920:1080,setdar=16/9[a];[a]fade=t=in:st=0:d=3[a1];[a1]subtitles='${tempSrtPath}':force_style='FontName=Roboto Bk,FontSize=20,Alignment=7'[b]`,
							'-map', '[b]', '-map', '0:a', '-b:v', '8000k', '-b:a', '160k', '-ar', '44100',  '-c:v', 'libx264', '-c:a', 'aac',  tempFile
						], {log:true})
						
					}else{
						await ScriptService.cmd('ffmpeg', [
							'-i', tempRawFile, '-filter_complex',
							`[0]scale=1920:1080,setdar=16/9[a];[a]subtitles='${tempSrtPath}':force_style='FontName=Roboto Bk,FontSize=20,Alignment=7'[b]`,
							'-map', '[b]', '-map', '0:a', '-b:v', '8000k', '-b:a', '160k', '-ar', '44100',  '-c:v', 'libx264', '-c:a', 'aac',  tempFile
						], {log:true})
					}


					await fs.unlinkSync(tempRawFile)
					await fs.unlinkSync(tempSrtPath)

					temps.push(tempFile)
					// raws.push(tempRawFile)
					// temps.push(transition)
				}
				console.log("clips.. ", temps.length)

				console.log("creating outro temp.. ")
				let outro =  `${UtilService.getLocalPath()}\\assets\\vids\\outro.mp4`
				let outroTempFile = config.outDir+'\\'+"temp_outro.ts"
				let outroTempRawFile = config.outDir+'\\'+"raw_temp_outro.ts"
				await ScriptService.cmd('ffmpeg', [
					'-i', outro, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts', outroTempRawFile
				], {log:false})

				await ScriptService.cmd('ffmpeg', [
					'-i', outroTempRawFile, '-b:v', '8000k', '-b:a', '160k', '-ar', '44100',  '-c:v', 'libx264', '-c:a', 'aac', outroTempFile
				], {log:false})
				
				await fs.unlinkSync(outroTempRawFile)
				temps.push(outroTempFile)
				// raws.push(outroTempRawFile)

						// '-i BlindingMistyWaffleKappaClaus-WuekI_40vRqY5OKy.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts temp1.ts'
			  let outPath = config.outDir+'\\'+config.outName
			  // let rawOutPath = config.outDir+'\\'+ 'raw_'+config.outName

				console.log(">> Concat action started ", `concat:${temps.join('|')}`)

				await ScriptService.cmd(
					'ffmpeg', [
							'-i', `concat:${temps.join('|')}`, '-c', 'copy', 
							outPath
					], {log:false})

				// ffmpeg -i "concat:temp1.ts|temp2.ts" -c copy -bsf:a aac_adtstoasc -r 60 testout.mp4
				try{
					for(let temp of temps){
						if(temp == introPath) continue
						await fs.unlinkSync(temp)
					}
					// for(let raw of raws){
					// 	fs.unlinkSync(raw)
					// }
				}catch{}
				
				console.log(">> Concat finished..")
				// console.log(">> Adding subs..")

				// let fontsDir = `${this.path}\\fonts`
				// fontsDir = fontsDir.replaceAll('\\','/') // workaround
				// let subPath = `${config.outDir}\\compilation.srt`
				// subPath = subPath.replaceAll('\\','/') // workaround
				// let subPath = `../twitch/mix/compilation.srt`

				// "subtitles=\'C:/Users/Jon/Personal Projects/pa-beta/src/twitch/mix/compilation.srt\':fontsdir='./fonts':force_style='FontName=Patchwork Stitchlings,FontSize=21,Alignment=7'" compilation2.mp4
				// await ScriptService.cmd(
				// 	`ffmpeg -i src\\twitch\\mix\\raw_compilation.mp4 -vf "subtitles='src/twitch/mix/compilation.srt':force_style='FontName=Roboto Bk,FontSize=20,Alignment=7'" -b:v 8000k -b:a 160k -ar 44100 src\\twitch\\mix\\compilation.mp4`,
				// 	 [], 
				// 	 {log:false, shell:true}
				// )

				// console.log(">> Added subs..")

				// ffmpeg -i ${outPath} -vf subtitles=${config.outDir}\\compilation.srt:fontsdir='${this.path}\\fonts\\KGCandyCaneStripe.ttf':force_style='FontName=KG Candy Cane Stripe,Fontsize=20' compilation2.mp4
				resolve(outPath)
			}catch(err){
				console.log(err)
				reject()
			}


		})

	}


	async makeCompilationSrt(timestamps, outDir){
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

	async makeTempSrt(text, outDir){
		let data = ""
		let outFile = `${outDir}`
		
		data += `${0}\n`
		data += 
			moment().date("2015-01-01").minutes(0).seconds(0).format("00:mm:ss,00")
			+ " --> "
			+ moment().date("2015-01-01").minutes(0).seconds(5).format("00:mm:ss,00")
			+ "\n"
		data += text +"\n"
		data += "\n"

		await fs.writeFileSync(outFile, data);
		return outFile
	}

	screenshot(vid, sec, outPath){
		let time = moment().date("2015-01-01").minutes( sec/60 ).seconds(sec % 60).format("00:mm:ss")

		console.log("ss v", vid)
		console.log("ss t", time)
		console.log("ss o", outPath)
		
		return  new Promise(async(resolve,reject)=>{
			let step1Path = outPath.slice(0, outPath.lastIndexOf('.')) + "_step_1" + outPath.slice(outPath.lastIndexOf('.'))

			if (await fs.existsSync(step1Path)){
		    await fs.unlinkSync(step1Path)
			}
			if (await fs.existsSync(outPath)){
		    await fs.unlinkSync(outPath)
			}

			await ScriptService.cmd(
					`ffmpeg`,
					 ['-ss', time, '-i', vid, '-vframes', '1', '-q:v', '2', step1Path], 
					 {log:false}
				)
			await ScriptService.cmd(
					`ffmpeg`,
					 ['-i', step1Path, '-vf', 'scale=1280:720,setdar=16/9', outPath], 
					 {log:false}
				)


			if (await fs.existsSync(step1Path)){
		    await fs.unlinkSync(step1Path)
			}

			resolve(null)
		})

	}

	getInformation(vid, format){
		return new Promise(async (resolve,reject)=>{

			let {stdout} = await ScriptService.execa(
				`ffprobe`,
				 ['-v', 'error', '-show_entries', `stream=${format}`, '-select_streams', 'v', '-of', 'compact=p=0', '-v', '0', vid], 
				 {log:false}
			)
			   
			resolve(stdout)
			
		})
	}

	static get(){
		if(instance == null)
			instance =  new VideoService()
		return instance
	}
}


export default instance ? instance : instance = VideoService.get()

// prints 'Hello world!' on an image, middle and center-aligned, when x = 0 and y = 0
// await ScriptService.execa(
// 	`ffmpeg`,
// 	 ['-i', panel1bg, '-i', primary, '-i', secondary, '-i', primaryBubble, '-filter_complex',
// 	  `[0]scale=1280:720[0a];[0]scale=1280:720[0b];[0a][0b]overlay=140:0[0c];[3]scale=${bubbleScale}:40[3a];`
// 	  + '[0c][1]overlay=0:0[step1];'
// 	  + '[step1][2]overlay=140:main_h-overlay_h-10[step2];'
// 	  + `[step2][3a]overlay=main_w-overlay_w:0[step3];`
// 	  // + '[step3][4a]overlay=main_w-overlay_w-10:main_h-overlay_h-60[step4];' 
// 	  // + `[step2]drawtext=text='${primaryText}':fontfile='${fontPath}':fontcolor=black:fontsize=${fontSize}:x=((350-tw)/2):y=h-th-16[step5]`
// 	  // + `[step3]drawtext=text='${primaryText}':x=((${bubbleScale}-tw)/2):y=h-th-16`
// 	  + `[step3]drawtext=text='${primaryText}':x=(w-tw) - ( ( (${bubbleScale}-tw)/2 ) ):y=11`
// 	  // + `[step3]drawtext=text='${primaryText}':x=main_w-overlay_w:y=11`
// 	  + `:fontfile='${fontPath}':fontcolor=black:fontsize=${fontSize}[step5]`
// 	  // + `[step5]drawtext=text='${secondaryText}':fontfile='${fontPath}':fontcolor=black:fontsize=${fontSize}:x=140:y=105[step6]`
// 	  // 'drawtext="fontfile=/path/to/font.ttf:text='Stack Overflow': fontcolor=white: fontsize=24: box=1: 
// 	  // boxcolor=black@0.5:boxborderw=5: x=(w-text_w)/2: y=(h-text_h)/2'
// 	  , '-map', '[step5]', thumb.path], 
// 	 {log:false}
// )


// await ScriptService.execa(
// 	`ffmpeg`,
// 	 ['-i', panel1bg, '-i', primary, '-i', secondary, '-i', primaryBubble, '-filter_complex',
// 	  `[0]scale=1280:720[0a];[0]scale=1280:720[0b];[0a][0b]overlay=140:0[0c];[3]scale=${bubbleScale}:40[3a];`
// 	  + '[0c][1]overlay=0:0[step1];'
// 	  + '[step1][2]overlay=140:main_h-overlay_h-10[step2];'
// 	  + `[step2][3a]overlay=main_w-overlay_w:0[step3];`
// 	  // + '[step3][4a]overlay=main_w-overlay_w-10:main_h-overlay_h-60[step4];' 
// 	  // + `[step2]drawtext=text='${primaryText}':fontfile='${fontPath}':fontcolor=black:fontsize=${fontSize}:x=((350-tw)/2):y=h-th-16[step5]`
// 	  // + `[step3]drawtext=text='${primaryText}':x=((${bubbleScale}-tw)/2):y=h-th-16`
// 	  + `[step3]drawtext=text='${primaryText}':x=(w-tw) - ( ( (${bubbleScale}-tw)/2 ) ):y=11`
// 	  // + `[step3]drawtext=text='${primaryText}':x=main_w-overlay_w:y=11`
// 	  + `:fontfile='${fontPath}':fontcolor=black:fontsize=${fontSize}[step5]`
// 	  // + `[step5]drawtext=text='${secondaryText}':fontfile='${fontPath}':fontcolor=black:fontsize=${fontSize}:x=140:y=105[step6]`
// 	  // 'drawtext="fontfile=/path/to/font.ttf:text='Stack Overflow': fontcolor=white: fontsize=24: box=1: 
// 	  // boxcolor=black@0.5:boxborderw=5: x=(w-text_w)/2: y=(h-text_h)/2'
// 	  , '-map', '[step5]', thumb.path], 
// 	 {log:false}
// )