const router = require('express').Router();
const rooms =require('./room');
const tools =require('./tools');

const state = require('./state');


const {notEmpty,send,broadcast,parseMsg,leave,setHost} = tools;

router.ws('/enter', (ws, req, res) => {
  const { userId, userName, avatar } = req.query;
  let roomId=init(ws,req,res);
  if(roomId){
    ws.on('message', (msg) => {
    	parseMsg({userId, roomId, msg,ws});
    });
    ws.on('close', (msg) => {
    	// 链接断开后，该用户从
    	leave({userId, roomId});
    });
  }
})
function init(ws, req, res){
  const { userId, userName, avatar,create } = req.query;
  let {roomId} = req.query;
  const error = notEmpty({userId, userName, avatar});
  if(error){
    send(ws,error);
    return;
  }
  //创建房间
  
  if(create==true||create=='true'){
    roomId = userId + (+new Date());
    createRoom({userId, userName,avatar,roomId, ws, categoryId});
    return roomId;
  }
  //进入房间
  const room = rooms[roomId];
  if(room){//如果房间存在
    if (room.list.length >= state.max) {
      send(ws, { code: -3, msg: `超过${max}人` });
      return;
    }

    if (room.start) {
      send(ws, { code: -2, msg: '游戏已经开始' });
      return;
    }

    // 进入房间
    enterRoom({ userId, userName, avatar, roomId, ws });

  }else if(categoryId&&roomId){
    //创建房间
    createRoom({ userId, userName, avatar, roomId, ws, categoryId });
  }else {
    send(ws, { code: -1, msg: '房间不存在' });
  }
  return roomId;
}

//创建房间
function createRoom(config){
  const {roomId,categoryId,userId} = config;
  rooms[roomId] = {
  	start: false,
  	categoryId,
  	list: [],
  };
  enterRoom(config);
  setHost({userId,roomId});
}
//进入房间
function enterRoom(config){
  const {roomId,userId,userName,avatar,ws} = config;
  const room = rooms[roomId];
  //广播给现存者
  broadcast(roomId,{code:0,type:'enter_room',roomId,min:state.min,max:state.max,userList:[{userId,userName,avatar}]});
  //通知新来的
  room.list.push({ws,userId,userName,avatar});
  const list=[];
  room.list.map((item)=>{
  	list.push({
  	  userId:item.userId,
  	  userName:item.userName,
  	  avatar:item.avatar,
  	  status:item.status
  	})
  })
  send(ws,{code:0,type:'enter_room',roomId,min:state.min,max:state.max,userList:list})
}
module.exports = router;
