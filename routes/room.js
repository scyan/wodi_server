class Room {
  constructor(ws,config){
  	if(!ws){
  		throw {msg:'没有获取到链接'}
  	}
  	const {userId,userName,avatar,categoryIds} = config;

  	if(!userId||!userName||!avatar){
  		
  		throw {msg:'创建者信息不完整'}
  	}
  	if(!categoryIds||!categoryIds.length){
  		
  		throw {msg:'没有选择词'}
  	}
  	this.start=false;//游戏是否开始
	this.roomId = userId + (+new Date())+Math.ceil(Math.random()*100);
  	this.categoryIds=JSON.parse(categoryIds);//选择的词类别
  	this.userList=[];
  	this.enter(ws,config);
  }
  enter(ws,config){
  	const {userId,userName,avatar} = config;
  	this.userList.push({
	  ws,
	  userInfo:{userId,userName,avatar}
  	});
  	this.broadcast({type:'enter_room',userList:this.getUserInfoList()});
  }
  getUserInfoList(){
  	const list = [];
  	this.userList.map((item)=>{
	  list.push(item.userInfo);
  	})
  	return list;
  }
  broadcast(msg){
  	this.userList.map((item)=>{
  	  this.send(item.ws,msg);
  	})
  }
  send(ws,msg){
  	if(ws.readyState==1){
      ws.send(JSON.stringify(msg));
	}
  }
}
module.exports=Room;