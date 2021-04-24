import * as fs from 'fs';
import VideoService from '../../services/VideoService'

export default class ThumbnailBuilder{
	thumbnailData:{
		primary, secondary, backdrop
	}
	outPath
	constructor(thumbnailData, outPath){
		this.thumbnailData = thumbnailData
		this.outPath = outPath
	}

	build(){
		return new Promise(async(resolve,reject)=>{

			// await VideoService.generateThumbnail(thu)
			// ffmpeg -i input -i logo -filter_complex 'overlay=10:main_h-overlay_h-10' output

		})
	}
}