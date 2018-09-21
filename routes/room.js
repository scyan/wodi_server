const gdc = require('./gdc');
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
  	this.usedWordsIndex=[];
  	this.enter(ws,config);
  }
  //接收用户消息
  getMsg(config){
  	const {userId,msg,ws} = config;
  	const result = JSON.parse(msg);
  	if(result.type==='ready'){
  	  this.ready(userId);
	  return;
  	}
  	if(result.type==='speak'){
  	  this.speak(userId,result.cdnPath);
  	}
  }
  ready(userId){
  	let readyCount = 0;
  	this.userList.map((item)=>{

  	  if(item.userInfo.userId==userId){
  	  	item.userInfo.ready = true;
  	  }

  	  if(item.userInfo.ready){
  	  	readyCount = 1;
  	  }
  	})
  	//当房间人数达到最小人数，并且都准备了，就广播游戏开始
  	if(readyCount == this.userList.length && this.userList.length>=gdc.min){
  	  this.startGame();
  	  this.speakQueue();
  	}else{
  	  this.broadcast({type:'change_userList',userList:this.getUserInfoList()});	
  	}	
  }
  startGame(){
  	this.start = true;
  	let wodiCount = this.getWodiCount();
  	let wodiIndex=[];
  	let words = this.getWords();
  	//随机计算卧底的index
  	for(let i=0;i<wodiCount;i++){
  	  wodiIndex.push(this.getRandomInt(this.userList.length,wodiIndex))
  	}
  	this.userList.map((item,index)=>{
  	  if(wodiIndex.indexOf(index)>-1){
  	  	item.userInfo.word = words[1];
  	  }else{
  	  	item.userInfo.word = words[0];
  	  }
  	})
  	this.broadcast({type: 'game_start',userList:this.getUserInfoList()})
  }
  //通知发言
  speakQueue(){
  	//speak分为0，1，2三种状态，0为发言，1轮到发言，2已经发言
  	this.userList.some((item)=>{

  	  if(!item.userInfo.speak){
  	  	item.userInfo.speak=1;
  	  	return true;
  	  }
  	})
  	this.broadcast({type: 'can_speak',userList:this.getUserInfoList()})
  }
  //广播某人的发言消息
  speak(userId,cdnPath){
  	console.log(userId,cdnPath);

  	this.userList.some((item)=>{
  	  if(item.userInfo.userId==userId){
  	  	item.userInfo.audio = cdnPath
  	  	return;
  	  }
  	})
  	this.broadcast({type: 'change_userList',userList:this.getUserInfoList()})
  }

  //取词
  getWords(){
  	let words = []
  	this.categoryIds.map((id)=>{
  	  words = words.concat(gdc.category[id].words)
  	})

  	let index = this.getRandomInt(words.length);
  	if(this.usedWordsIndex.length === words.length){
  		return words[index];
  	}
  	while (this.usedWordsIndex.indexOf(index)>-1) {
	  index = getRandomInt(words.length);
	}
	
	return words[index];
  }
  // 随机数
  getRandomInt(max,except) {
  	let int = Math.floor(Math.random() * Math.floor(max));
	if(except){
	  while(except.indexOf(int)>-1){
	  	int = Math.floor(Math.random() * Math.floor(max));
	  }
	}
	return int;
  }
  //获取本轮卧底数量
  getWodiCount(){
  	const sum = this.userList.length;
  	let count = Math.floor((sum - 5) / 2) + 1;
	if (count > 3) { // 最多不超过3个卧底
	  count = 3;
	}
	//测试用
	if(count<1){
	  count=1;
	}
	return count;
  }
  leave(config){
  	const {userId} = config;
  	this.userList.some((item,i)=>{
  	  if(item.userInfo.userId==userId){
  	  	this.userList.splice(i,1);
  	  	return true
  	  }
  	})
  	this.broadcast({type:'change_userList',userList:this.getUserInfoList()});
  }
  enter(ws,config){
  	const {userId,userName,avatar} = config;
  	if(this.start){
  		throw {msg: '游戏已经开始'}
  	}
  	if(!userId || !userName || !avatar){
  		throw {msg:'用户信息不完整'}
  	}
  	this.userList.push({
	  ws,
	  userInfo:{userId,userName,avatar}
  	});
  	this.broadcast({type:'change_userList',userList:this.getUserInfoList()});
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