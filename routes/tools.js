const rooms =require('./room');
const state = require('./state');
function log(){
  console.log(arguments)
}

exports.notEmpty=(obj) =>{
  let error = false;
  Object.keys(obj).some((key, i) => {
    if (!obj[key]) {
      error = { code: -400, msg: `缺少${key}` };
      return true;
    }
  });
  return error;
}


// 广播
exports.broadcast=(roomId, msg)=> {
  const room = rooms[roomId];
  room.list&&room.list.map((item) => {
  	this.send(item.ws, msg);
  });
}
// 单独发送消息
exports.send=(ws, msg)=> {
  if(ws.readyState==1){
	ws.send(JSON.stringify(msg));
  }
}


exports.setHost=(config)=>{
  const {userId,roomId} = config
  const room = rooms[roomId];
  room.host = userId;
  room.list.some((item,i)=>{
    if(item.userId==userId){
      this.send(item.ws,{code:0,type:'set_host',userId})
      return true;
    }
  })
}
exports.leave=(config)=>{
  const {userId, roomId} = config;
  let index = -1;
  const room = rooms[roomId];
  room && room.list.some((item, i) => {
    if (item.userId == userId) {
    	index = i;
    	return true;
    }
  });
  if (index > -1) {
    room.list.splice(index, 1);
    //如果房主离开，则另选一个
    if(room.host == userId && room.list.length){
      setHost(room.list[0].userId,roomId);
    }
    //广播离开
  	this.broadcast(roomId, {code:0, type: 'leave_room', userId });
  }
  

  //TODO 如果游戏已开始，要判断是否死亡，游戏是否结束
  
  if (!room.list.length) {
  	delete rooms[roomId];
  }
}

exports.parseMsg=(config)=> {
  const {userId, roomId, msg,ws} = config;
  console.log('receiveMessage',msg)
  try{
    const result = JSON.parse(msg);
    switch (result.type) {
    	case 'ready':
    	  this.ready({userId, roomId});
    	  break;
    	case 'set_word':
    	  this.setWord({roomId,userList:result.userList});
    	case 'speak':
    	  this.speak({roomId,userId,message:result.message,skip:result.skip});
    	case 'vote':
    	  this.vote({userId, roomId,voteUserId:result.voteUserId});
     //  case 'resetWord':
     //    resetWord(userId,roomId,result.usedWordIndex);
     //  case 'resetCategory':
     //    resetCategory(userId,roomId,result.categoryId)
    	default:
    	  break;
    }
  }catch(e){
    console.log(e)
    this.send(ws,{code:-500,msg:'消息需为json字符串'})
  }
}

exports.ready=(config)=>{
  const {roomId,userId} = config;
  let readyNum = 0;
  const room = rooms[roomId];
  room.list.map((item) => {
  	if (item.userId == userId) {
  	  item.status = 'ready';
    }
    if (item.status == 'ready') {
      readyNum++;
    }
  });
  this.broadcast(roomId, {code:0, type: 'ready', userId });

  //当人数大于最小人数，且所有人都准备了，则触发开始
  if (readyNum == room.list.length && room.list.length>=state.min) {
  	room.start = true;
  	this.broadcast(roomId,{code:0,type:'start'});
  	// resetWord(userId,roomId,room.usedWordIndex);
  }
}
exports.setWord=(config)=>{
  const { roomId ,userList} = config;
  this.broadcast(roomId,{code:0,type:'set_word',userList});

}
//发言队列
exports.speakQueue=(config)=>{
  const {roomId}= config;
  const room = rooms[roomId];
  let speakOver=true;
  room.list.some((item,i)=>{
  	if(!item.speaked){
  	  speakOver=false
  	  this.send(item.ws,{code:0,type:'can_speak'})
  	  return true;
  	}
  })
  //发言结束,进入投票
  if(speakOver){
  	broadcast(roomId,{code:0,type:'can_vote'})

  }
}
exports.speak=(config)=>{
  const {roomId,userId,message,skip} = config;
  if(skip==true||skip=='true'){//跳过此人发言
  	this.speakQueue({roomId});
  }else{
  	broadcast(roomId,{code:0,type:'speak_message',userId,message});
  	this.speakQueue({roomId});
  }

}
exports.vote=(config)=>{
  const{roomId,userId,voteUserId} = config;
  broadcast(roomId,{code:0,type:'vote',userId,voteUserId})
}
exports.vote=()=>{}
exports.resetWord=()=>{}
exports.resetCategory=()=>{

}