import { CodeBuildClient, ListBuildsForProjectCommand, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";

var instance = null

class AwsService{

	codebuild
	constructor(){
	  this.codebuild = new CodeBuildClient('../config.json');
	}

	async checkBuild(projectName) {
		let projectBuilds = await this.codebuild.send(new ListBuildsForProjectCommand({
	    sortOrder: 'DESCENDING',
	    projectName: projectName
	  }))

	  let latestBuild = await this.codebuild.send(new BatchGetBuildsCommand({ids:[projectBuilds.ids[0]]}))

	  return latestBuild.builds[0] || null
	}	
	static get(){
		if(instance == null)
			instance =  new AwsService()
		return instance
	}
}

export default instance ? instance : instance = AwsService.get()
