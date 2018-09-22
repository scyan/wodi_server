const gdc = require('./gdc');

class Room {
  constructor(ws,config){
  	if(!ws){
  		throw {msg:'没有获取到链接'}
  	}
  	const {userId,userName,avatar,categoryIds,roomId} = config;

  	if(!userId||!userName||!avatar){
  		
  		throw {msg:'创建者信息不完整'}
  	}
  	if(!categoryIds||!categoryIds.length){
  		
  		throw {msg:'没有选择词'}
  	}
  	this.start=false;//游戏是否开始
	this.roomId = roomId || userId + (+new Date())+Math.ceil(Math.random()*100);
  	this.categoryIds=JSON.parse(categoryIds);//选择的词类别

  	this.userList=[];
  	this.usedWordsIndex=[];
  	this.host = userId;
  	this.enter(ws,config);
  }
  //过滤用户游戏进行中产生的信息
  filter(keyArray){
  	this.userList.some((item)=>{
  	  Object.keys(item.userInfo).map((key)=>{
  	  	if(keyArray.indexOf(key)<0){
  	  	  delete item.userInfo(key)
  	  	}
  	  })
  	})

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
  	  this.speak(userId,result.audioPath);
  	}
  	if(result.type==='vote'){
  	  this.vote(userId,result.toUserId);
  	}
  	if(result.type=='get_new_round'){//获取新一轮用户数据
  	  this.send(ws,{type:'get_new_round',userList:this.getUserInfoList(),host:this.host})
  	}
  	if(result.type=='change_word'){
  	  this.filter(['userId','userName','avatar','ready'])
  	  this.startGame();
  	  this.broadcast({type:'change_word',userList:this.getUserInfoList()})
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
  	  this.canSpeak();
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
  	  	item.userInfo.isWodi = true;
  	  }else{
  	  	item.userInfo.word = words[0];
  	  }
  	})
  	this.broadcast({type: 'game_start',userList:this.getUserInfoList()})
  }
  //通知发言
  canSpeak(reset){
  	//reset为true时，不是第一次发言，需要清空之前的发言投票结果
  	if(reset){
  	  this.filter(['userId','userName','avatar','ready','dead','isWodi','word']);

  	}
  	//speak分为0，1，2三种状态，0未发言，1轮到发言，2已经发言
  	this.userList.some((item)=>{

  	  if(!item.userInfo.speak && !item.userInfo.dead){
  	  	item.userInfo.speakState=1;
  	  	return true;
  	  }
  	})
  	this.broadcast({type: 'can_speak',userList:this.getUserInfoList(),notFirst:true})
  }
  //广播某人的发言消息
  speak(userId,audioPath){
  	let findNext = false;
  	this.userList.some((item,i)=>{
  	  let userInfo = item.userInfo;
  	  if(userInfo.userId==userId){
  	  	userInfo.audio = audioPath;
  	  	userInfo.speakState = 2;
  	  }
  	  if(!userInfo.speakState && !userInfo.dead){
  	  	userInfo.speakState=1;
  	  	findNext = true;
  	  	return true;
  	  }
  	})
  	//没找到下一个发言者，进入投票阶段
  	if(!findNext){
      this.broadcast({type: 'can_vote',userList: this.getUserInfoList()})
  	}else{
  		//否则普通的状态改变
  	  this.broadcast({type: 'change_userList',userList:this.getUserInfoList()})	
  	}
  }
  vote(userId,toUserId){
  	let voteCount = 0;
  	let maxUserIndex = [0];//得票最多的玩家,可能不止一位
  	let maxVoteCount = 0;//得票最多的玩家得票数量
    
  	this.userList.map((item,i)=>{
  	  let userInfo = item.userInfo;
  	  if(userInfo.userId==userId){
  	  	userInfo.voted = true;
  	  }
  	  //统计已投票人数和死人的总数
  	  if(userInfo.voted || userInfo.dead){
	  	voteCount++;
  	  }
  	  if(!userInfo.voteList){
  	  	userInfo.voteList=[];
  	  }
  		//找到我投票的人
  	  if(userInfo.userId == toUserId){
  	  	userInfo.voteList.push(userId);
  	  }
  	  if(userInfo.voteList.length>maxVoteCount){
  	  	maxUserIndex = [i];
  	  	maxVoteCount=userInfo.voteList.length
  	  	
  	  }else if(userInfo.voteList.length==maxVoteCount){
  	  	maxUserIndex.push(i);
  	  }
  	})
  	//所有人都投票，一轮游戏结束
  	if(voteCount==this.userList.length){
  	  if(maxUserIndex.length==1){this.userList[maxUserIndex[0]].userInfo.dead = true;}
  	  this.broadcast({type:'vote_end',userList: this.getUserInfoList(), maxUserIndex})

  	  if(maxUserIndex.length>1){//有平票，进入下一轮发言，显示延迟在前台做
  	  	this.canSpeak(true);
  	  }else{//计算死者，以及游戏是否结束	
  	  	this.ifGameOver();
  	  }
  	}else{
  		//否则普通状态改变
  	  this.broadcast({type: 'change_userList',userList: this.getUserInfoList()})
  	}
  }
  /**
   * 游戏结束检测
   * @param  {[type]} fromLeave [是否由某人离开引起的检测]
   * @return {[type]}           [description]
   */
  ifGameOver(fromLeave){
  	let lifeNormal=0;
  	let lifeWodi = 0;
  	// let gameOver=false;
  	let words={};
  	this.userList.map((item)=>{
  	  let userInfo = item.userInfo;
  	  if(!userInfo.dead){
  	  	if(userInfo.isWodi){
  	  	  lifeWodi++;
  	  	  words.wodi=userInfo.word;
  	  	}else{
  	  	  lifeNormal++;
  	  	  words.normal=userInfo.word;
  	  	}
  	  }
  	})

  	if(lifeNormal == lifeWodi + 1){//卧底获胜
  	
  	  this.broadcast({type:'game_over',userList:this.getUserInfoList(),winner:'wodi',words})
  	  this.clear();
  	}else if(lifeWodi==0){//平明获胜
  	  this.broadcast({type:'game_over',userList:this.getUserInfoList(),winner:'normal',words})
  	  this.clear();
  	}else if(!fromLeave){
  	  this.canSpeak(true)
  	}
  }
  //恢复房间到最初状态
  clear(){
  	this.start=false;
  	this.filter(['userId','userName','avatar'])
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
  leave(config,cb){
  	const {userId} = config;
  	if(userId==this.host){//房主离开，寻找新房主
  	  let findNewHost = false;
  	  this.userList.some((item,i)=>{
  	  	if(!item.leave && item.userInfo.userId!=userId){
  	  	  this.host = item.userInfo.userId;
  	  	  findNewHost = true;
  	  	  return true;
  	  	}
  	  })
  	  //所有人都离开的情况
  	  if(!findNewHost){
  	  	cb && cb(true);
  	  	return;
  	  }
  	}
  	this.userList.some((item,i)=>{
  	  if(item.userInfo.userId==userId){
  	  	if(this.start){//游戏正在进行
  	  	  item.userInfo.dead=true;
  	  	  item.userInfo.leave = true;
  	  	  this.ifGameOver(true);
  	  	}else{
  	  	  this.userList.splice(i,1);
  		  this.broadcast({type:'change_userList',userList:this.getUserInfoList()});  			
  	  	}
  	  	return true
  	  }
  	})
  	
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
  	Object.assign(msg,{host:this.host});
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