'use strict';

const min = 1;
const max = 20;

const router = require('express').Router();
// TODO
// 5人最少 20人上限
// 1:4 5   1:2
// 1:5 6   1:2
// 2:5 7   2:3  1:2
// 2:6 8   2:3  1:2
// 3:7 9

const rooms = {};

const category = {
  1: '公众类',
  2: '医学类',
};
const wordList = {
  1: [['开心', '高兴'], ['我', '你'], ['哈哈', '嘿嘿']],
  2: [['aa1', 'aa2'], ['bb1', 'bb2'], ['bb3', 'bb4']],
};
function notEmpty(obj) {
  let error = false;
  Object.keys(obj).some((key, i) => {
    if (!obj[key]) {
      error = { code: -400, msg: `缺少${key}` };
      return true;
    }
  });
  return error;
}
function log(){
  console.log(arguments)
}
// 进入房间
router.ws('/enter', (ws, req, res) => {
  const { userId, roomId, categoryId, userName, avatar } = req.query;
  const error = notEmpty(userId, roomId, categoryId, userName, avatar);
  if(error){
    send(ws,error);
    return;
  }
  const room = rooms[roomId];
  if (room) {
  	if (room.list.length >= max) {
  		send(ws, { code: -3, msg: `超过${max}人` });
  		return;
  	}

  	if (room.start) {
  		send(ws, { code: -2, msg: '游戏已经开始' });
  	  return;
  	}

    // 进入房间
    enter({ userId, userName, avatar, roomId, ws });
  } else if (categoryId) {
  	create({ userId, userName, avatar, roomId, ws, categoryId });
  } else {
  	send(ws, { code: -1, msg: '房间不存在' });
  }

  ws.on('message', (msg) => {
  	parseMsg(userId, roomId, msg,ws);
  });
  ws.on('close', (msg) => {
  	// 链接断开后，该用户从
  	leave(userId, roomId);
  });
  
});

// 创建房间
router.ws('/create', (ws, req, res) => {
  const { userId,  categoryId, userName, avatar } = req.query;
  const error = notEmpty({ userId,  categoryId, userName, avatar });
  if(error){
    send(ws,error);
    return;
  }
  // 生成房间号
  const roomId = userId + (+new Date());
  // 新建房间
  create({userId, userName,avatar,roomId, ws, categoryId});
  // ws.send(roomId);

  ws.on('message', (msg) => {
  	parseMsg(userId, roomId, msg,ws);
  });
  ws.on('close', (msg) => {
  	// 链接断开后，该用户从
  	leave(userId, roomId);
  });
});
//设定房间主人
function setHost(userId,roomId){
  const room = rooms[roomId];
  room.host = userId;
  room.list.some((item,i)=>{
    if(item.userId==userId){
      send(item.ws,{code:0,type:'setHost',userId})
      return true;
    }
  })
}
// 创建房间
function create(config) {
  const {roomId,categoryId,userId} = config;
  rooms[roomId] = {
  	start: false,

  	categoryId,
  	list: [],
  };
  enter(config);
  setHost(userId,roomId);
}
// 进入房间
function enter(config) {
  
  const {roomId,userId,userName,avatar,ws} = config;
  rooms[roomId].list.push({ userId, userName, avatar, ws });
  let canGoNext = false;
  const userList = [];
  if (rooms[roomId].list.length >= min) {
      canGoNext = true;
  }
  rooms[roomId].list.map((item,i)=>{
    let {userId,userName,avatar} = item
    userList.push({
      userId,userName,avatar
    })
  })

  brodcast(roomId, {code:0, type: 'enter', userList, canGoNext });

  //打log专用
  // let userIds=[];
  // rooms[roomId].list.map((item,i)=>{
  //   userIds.push(item.userId);
  // })
  // console.log(roomId,userIds.join(','));
}
// 离开房间
function leave(userId, roomId) {
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
    if(room.host == userId&&room.list.length){
      setHost(room.list[0].userId,roomId);
    }
  }
  brodcast(roomId, {code:0, type: 'leave', userId });

  //TODO 如果游戏已开始，要判断是否死亡，游戏是否结束
  
  if (!room.list.length) {
  	delete rooms[roomId];
  }

}

function parseMsg(userId, roomId, msg,ws) {
  console.log('receiveMessage',msg)
  try{
    const result = JSON.parse(msg);
    switch (result.type) {
    	case 'ready':
    	  ready(userId, roomId,result.usedWordIndex);
    	  break;
    	case 'speak':
    	  speak(userId, roomId, result.message);
    		break;
    	case 'vote':
    		vote(userId, roomId, result.voteUserId);
      case 'resetWord':
        resetWord(userId,roomId,result.usedWordIndex);
      case 'resetCategory':
        resetCategory(userId,roomId,result.categoryId)
    	default:
    	  break;
    }
  }catch(e){
    console.log(e)
    send(ws,{code:-500,msg:'消息需为json字符串'})
  }
}
function resetCategory(userId,roomId,categoryId){
  const room = rooms[roomId];
  room.categoryId = categoryId;
  brodcast(roomId,{code:0,type:'resetCategory',categoryId})
}
//换词
function resetWord(userId,roomId,usedWordIndex=[]){
  const room = rooms[roomId];
  let resultList = [];
  let words= [];

  const wodiCount = getWodiCount(room.list.length);
  words = getRandomWords(roomId,usedWordIndex);
  delete room.usedWordIndex;
  // 随机打乱房间数组
  room.list.sort(randomSort);
  room.list.map((item, i) => {
    if (i < wodiCount) {
      item.isWodi = true;
      resultList.push({ userId: item.userId, word: words.words[0] });
      // item.word = words.words[0];
    } else {
      resultList.push({ userId: item.userId, word: words.words[1] });
      // item.word = words.words[1];
    }
  });
  brodcast(roomId, {code:0, type: 'start',words:words.words, wordsIndex:words.index , userList: resultList });
  room.list.length && canSpeak(roomId,room.list[0]);
  room.list.map((item) => {
    delete item.voteCount;
    delete item.dead;
    delete item.isWodi;
  });
}
// 准备
function ready(userId, roomId,usedWordIndex=[]) {
  let readyNum = 0;
  const room = rooms[roomId];
  room.list.map((item) => {
  	if (item.userId == userId) {
  	  item.ready = true;
    }
    if (item.ready) {
      readyNum++;
    }
  });
  brodcast(roomId, {code:0, type: 'ready', userId });
  //每个准备者都会在ready时发送曾用词，选取最长的数组作为房间层用词
  if(!room.usedWordIndex||room.usedWordIndex.length<usedWordIndex){
    room.usedWordIndex = usedWordIndex;
  }

  if (readyNum == room.list.length) {
  	room.start = true;

  	resetWord(userId,roomId,room.usedWordIndex);
  }
}
// 投票
function vote(userId, roomId, voteUserId) {
  const room = rooms[roomId];
  let liftCount = 0;
  let allCount = 0;
  const voteCountList = [];// 投票结果列表
  let lifeWodi = 0,
    lifeNormal = 0;
  let gameOver = false;
  room.list.map((item, i) => {
    if (!item.dead) { // 只有活人才能参与投票与被投票
	  liftCount++;
	  if (item.userId == voteUserId) {
	     item.voteCount = item.voteCount ? item.voteCount + 1 : 1;
	  }
	  allCount += item.voteCount;
	  voteCountList.push({ userId: item.Id, count: item.voteCount });
    }
  });
  // 本轮票数等于活着人数，所有人都投票完毕
  if (allCount == liftCount) {
    // 宣布死亡userId
    voteCountList.sort(getMaxVote);
    // 有平票，重新投
    if (voteCountList[0].count == voteCountList[1].count) {
	  // 投票结束，有相同
	  brodcast(roomId, {code:0, type: 'vote_end', list: voteCountList, hasSame: true });
	  // 清空票数
	  room.list.map((item) => {
	    delete item.voteCount ;
	  });
	  return;
    }
    // 找出死者
    room.list.map((item) => {
	  if (item.userId == voteCountList[0].userId) {
	  	item.dead = true;
	  }
	  if (!item.dead) {
	  	if (item.isWodi) {
	  		lifeWodi++;
	  	} else {
	  		lifeNormal++;
	  	}
	  }
    });

    if (lifeNormal == lifeWodi + 1) {
      gameOver = true;
      // 卧底获胜
      brodcast(roomId, { code:0,type: 'game_over', list: voteCountList, deadUserId: voteCountList[0].userId });
    } else if (lifeWodi == 0) {
      gameOver = true;
      // 平民获胜
      brodcast(roomId, {code:0, type: 'game_over', list: voteCountList, deadUserId: voteCountList[0].userId });
    } else {
      // 投票结束，有人死
      brodcast(roomId, {code:0, type: 'vote_end', list: voteCountList, deadUserId: voteCountList[0].userId });
    }

    // 清零投票结果

    room.list.map((item) => {
      delete item.voteCount ;
      if (gameOver) {
        delete item.dead;
        delete item.isWodi;
        delete item.ready;
      }
    });
    if (gameOver) {
    	room.start = false;
    }
  } else {
    brodcast(roomId, {code:0, type: 'vote_count', list: voteCountList });
  }
}
function canSpeak(roomId,config){
  const {userId,ws} = config;
  brodcast(roomId,{code:0,type:'canSpeak',userId});
}
function goToVote(roomId){
  brodcast(roomId,{code:0,type:'goToVote'})
}
// 发言
function speak(userId, roomId, message) {
  const room = rooms[roomId];
  let nextSpeaker = false;
  brodcast(roomId, {code:0, type: 'speak', userId, message });
  room.list.some((item,i)=>{
    if(item.userId==userId){
      item.speaked=true;
      return true;
    }
  })
  //寻找下一个发言人
  room.list.some((item,i)=>{
    if(!item.dead&&!item.speaked){
      canSpeak(roomId,item);
      nextSpeaker = true;
      return true;
    }
  })
  if(!nextSpeaker){//没有下一个发言者
    goToVote(roomId)
  }

  

}
// 广播
function brodcast(roomId, msg) {
  rooms[roomId].list.map((item) => {
  	send(item.ws, msg);
  });
}
// 单独发送消息
function send(ws, msg) {
  log('send',JSON.stringify(msg))
  ws.send(JSON.stringify(msg));
}
// 随机数
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
// 随机获取词组
function getRandomWords(roomId,usedWordIndex=[]) {
  const room = rooms[roomId];
  const words = wordList[room.categoryId];
  let index = getRandomInt(words.length);
  while (usedWordIndex.indexOf(index)>-1 && usedWordIndex.length<words.length) {
    index = getRandomInt(words.length);
    console.log(index)
  }
  return {words:words[index],index};
}
// 获取卧底数量
function getWodiCount(sum) {
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
function randomSort(a, b) {
  return Math.random() > 0.5 ? -1 : 1;
}
function getMaxVote(a, b) {
  return a.count < b.count;
}
module.exports = router;
