

class ViewService{
	errors = []
	errorsC = []
	test = ['test1','test2','test3']
	constructor(){
		console.log("ViewService")
	}

	static get(){
		if(instance == null)
			instance =  new ViewService()
		return instance
	}
}
var instance = new ViewService()

export default instance 
