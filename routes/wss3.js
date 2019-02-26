const router = require('express').Router();
const Room = require('./room.js');
const rooms = require('./rooms');
const {getUserId} = require('./user');
router.ws('/enter',async (ws, req, res) => {
  const { roomId, code } = req.query;
  let { userId } = req.query; 
  	try {
  		let room;

  		if (!userId && !code) {
   			throw {};
  		}
      if(!userId){
        userId = await getUserId(code)
        console.log(userId)
      }
  		if (roomId) {//带roomId说明从卡片进入，直接进入存在房间
        room = rooms.getRoom(roomId);

        //检测房间是否还在存在，不存在则以原来的roomId创建房间
        if(room){
          room.enter(ws,Object.assign(req.query,{userId}));
        }else{
          
          room = new Room(ws, Object.assign(req.query,{roomId,userId}));
          rooms.addRoom(room);
        }

  		} else {
	  	  room = new Room(ws, Object.assign(req.query,{userId}));
        rooms.addRoom(room);
  		}
	    ws.on('message', (msg) => {
	    	room.getMsg({ userId, msg, ws });
	    });
	    ws.on('close', (msg) => {
        console.log('close')
        room.leave({userId},(noBody)=>{
          if(noBody){
            rooms.deleteRoom(roomId);
          }
        });
	    });
  	} catch (e) {
  		console.log(e);
  	}
});
module.exports = router;
