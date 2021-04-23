
export default class DescriptionBuilder{
	timestamps
	credits
	hashtags
	constructor(timestamps, credits, hashtags){
		this.timestamps = timestamps
		this.credits = credits
		this.hashtags = hashtags
	}

	build(){

		let description = ""

		if(this.timestamps.length > 0)
			description += "Timestamps:\n\n"

		for(let t of this.timestamps){
			description += t
		}

		description += "Credits:\n\n"

		for(let c of this.credits){
			description += c
		}

		description += "\n" + this.hashtags

		return  description
	}

}