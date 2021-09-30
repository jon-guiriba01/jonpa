import * as fs from 'fs';
import VideoService from '../../services/VideoService'
import ScriptService from '../../services/ScriptService'
import UtilService from '../../services/UtilService'
import moment from 'moment';
import { titleCase } from "title-case";
import jimp from 'jimp';



interface textConfig{
	x: number,
	y: number,
	w: number,
	h: number,
	minTextW: number,
	maxTextW: number,
	borderImgPath:string,
}
export class ThumbnailBuilder{
	settings = {
		outPath:"",
		text:{
			charLimit:70,
			size:20,
			fontPath:UtilService.getPath()+"/assets/fonts/Bangers-67.fnt"
		},
		mode:ThumbnailBuilder.MODE.COMPILATION
	}

	images = {}
	texts = []

	uqId

	constructor(outPath, opts:any = {}){
		this.settings.outPath = outPath
		this.uqId = UtilService.getUqId()
		
		if(opts.fontPath){
			this.settings.text.fontPath = opts.fontPath
		}
		if(opts.mode){
			this.settings.mode = opts.mode
		}
	}

	setMode(mode:ThumbnailBuilder.MODE){
		this.settings.mode = mode
	}

	build(){
		return new Promise(async(resolve,reject)=>{
			try{
				switch (this.settings.mode) {
					case ThumbnailBuilder.MODE.COMPILATION:
						await this.buildCompilationThumbnail()
						resolve(true)
						break;
					case ThumbnailBuilder.MODE.SPECIAL:
						await this.buildSpecialThumbnail()
						resolve(true)
						break;
					case ThumbnailBuilder.MODE.SHORT:
						await this.buildShortThumbnail()
						resolve(true)
						break;
				}
			}catch(err){
				console.log(err)
				resolve()
			}
		})
	}

	setImage(label,imgPath){
		this.images[label] = imgPath
	}

	setText(label,text){
		this.texts[label] = text
	}

	async buildSpecialThumbnail(){
		console.log('buildSpecialThumbnail', {images:this.images,texts:this.texts})

	  let base =	await this.imageOverlay(
	  	await jimp.read(this.images['bg']),
	  	await jimp.read(this.images['primary']),
	  	0, 0
		)

    await base.write(this.settings.outPath)
	}

	async buildShortThumbnail(){
		console.log('buildShortThumbnail', {images:this.images,texts:this.texts})

	 //  let base =	await this.imageOverlay(
	 //  	await jimp.read(this.images['bg']),
	 //  	await jimp.read(this.images['secondary']),
	 //  	20, 720-220
		// )
		let base = await jimp.read(this.images['bg'])

		let frame = `${UtilService.PATH.ASSETS}\\imgs\\thumbs\\frame.png`
	  await base.composite(
	  	await jimp.read(frame), 0, 0
		)

		let title1 = this.ytTitle(this.texts['title1'], this.settings.text.charLimit)
	  await this.applyText(base,title1,{
	  		x: 1280-550-34,
	  		y: 720+50,
	  		w: 550,
	  		h: 40,
	  		minTextW: 100,
	  		maxTextW: 550,
	  		borderImgPath:`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\bubble_long.png`
	  	}						
	  )

    await base.write(this.settings.outPath)
	}
	
	async buildCompilationThumbnail(){
		console.log('buildCompilationThumbnail', {images:this.images,texts:this.texts})

		let title1 = this.ytTitle(this.texts['title1'], this.settings.text.charLimit)
		let title2 = this.ytTitle(this.texts['title2'], this.settings.text.charLimit)
		let title3 = this.ytTitle(this.texts['title3'], this.settings.text.charLimit)

		let mask1 = `${UtilService.PATH.ASSETS}\\imgs\\thumbs\\mask_panel_1.png`
		let mask2 = `${UtilService.PATH.ASSETS}\\imgs\\thumbs\\mask_panel_2.png`


	  let p1Base =	await this.imageOverlay(
	  	await jimp.read(this.images['panel1bg']),
	  	await jimp.read(this.images['primary']),
	  	100, 16
		)

	  let panel1 =	await this.imageMask(
	  	p1Base,
	  	await jimp.read(mask1),
	  	0, 0
		)
		let panel1Path = `${UtilService.PATH.ASSETS}\\imgs\\thumbs\\generated\\panel1.png`
	  await this.imageWrite(panel1,panel1Path)

	  let panel2 =	await this.imageMask(
	  	await jimp.read(this.images['panel2bg']),
	  	await jimp.read(mask2),
	  	0, 0
		)
		let panel2Path = `${UtilService.PATH.ASSETS}\\imgs\\thumbs\\generated\\panel2.png`
	  await this.imageWrite(panel2,panel2Path)

    let base = await jimp.read(`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\base.png`)
    await base.composite(await jimp.read(panel1Path), -90, 0)
    await base.composite(await jimp.read(panel2Path), 240, 155)
    await base.composite(await jimp.read(this.images['panel3bg']), 1280-490 - 15, 0 + 15)
    await base.composite(await jimp.read(`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\daily-compilation-frame.png`), 0, 0)
    await base.composite(await jimp.read(`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\daily-compilation-header.png`), 0, 0)
    await base.composite(await jimp.read(`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\yt-icon.png`), 1280-150, 720-88)
    await base.composite(await jimp.read(this.images['secondary']), 1280-205, 720-450)

		let font = await jimp.loadFont(this.settings.text.fontPath)

		await this.applyText(base,title1,{
				x: 40,
				y: 720-240,
				w: 280,
				h: 40,
				minTextW: 60,
				maxTextW: 280,
				borderImgPath:`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\bubble_long.png`
			}						
		)
		await this.applyText(base,title2,{
				x: 780,
				y: 720-400,
				w: 280,
				h: 40,
				minTextW: 60,
				maxTextW: 280,
				borderImgPath:`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\bubble_long.png`
			}						
		)
		await this.applyText(base,title3,{
				x: 660,
				y: 30,
				w: 220,
				h: 40,
				minTextW: 60,
				maxTextW: 220,
				borderImgPath:`${UtilService.PATH.ASSETS}\\imgs\\thumbs\\bubble_long.png`
			}						
		)


    await base.write(this.settings.outPath)

    return this.settings.outPath
	}

	private async imageOverlay(base,overlay, x,y){
    return await base.composite(overlay, x, y)
	}

	private async imageWrite(base,outPath){
		await base.write(outPath)
		await UtilService.wait(1000)
	}

	private async imageMask(base,mask, x,y){
    return await base.mask(mask, x, y)
	}

	private async applyText(base:jimp,text:string,config:textConfig){

		let font = await jimp.loadFont(this.settings.text.fontPath)
    let border = await jimp.read(config.borderImgPath)
		let size = {
			w: await jimp.measureText(font, text),
			h: await jimp.measureTextHeight(font, text, config.w)
		}

		console.log("applyText",{text,size,config})

		if(size.w > config.maxTextW) size.w = config.maxTextW
		if(size.w < config.minTextW) size.w = config.minTextW

		let b1Path = `${UtilService.PATH.ASSETS}\\imgs\\thumbs\\generated\\b1.png`
		await border.resize(size.w+20,size.h + 20)
		await border.write(b1Path)
    await UtilService.wait(1000)
		let b1 = await jimp.read(b1Path)

		if(size.h > config.h)
			config.y += size.h - config.h + 5

    await base.composite(b1, config.x-10 , config.y-10 )

    await base.print(
      font,
      config.x,
      config.y,
      {
        text: text,
        alignmentX: jimp.HORIZONTAL_ALIGN_LEFT,
        alignmentY: jimp.VERTICAL_ALIGN_TOP
      },
      config.w,
      config.h
    )

	}

	private ytTitle(str, charLimit){
		if(str.length > charLimit){
			let words = str.split(' ')
			str = ""

			for(let word of words){
				if(str.length + word.length > charLimit)
					break
				str += word
			}
		}
		return UtilService.capitalizeFirstLetter(str)
	}

}

export namespace ThumbnailBuilder{

	export enum MODE{
		COMPILATION,
		SPECIAL,
		SHORT
	}
}