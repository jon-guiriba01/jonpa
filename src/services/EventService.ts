import {Subject} from 'rxjs';

var instance = null

class EventService{

  constructor() { }

  subjects = {}

  pub(channel, data=null) {

    if(!this.subjects[channel]){
      this.subjects[channel] =  new Subject<any>()
    }
    
		this.subjects[channel].next(data);
  }

  sub(channel,callback){

    if(!this.subjects[channel]){
      this.subjects[channel] =  new Subject<any>()
    }

    this.subjects[channel].subscribe(callback)
  }
  
	static get(){
		if(instance == null)
			instance =  new EventService()
		return instance
	}
}

export default instance ? instance : instance = EventService.get()


