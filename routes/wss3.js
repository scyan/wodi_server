const router = require('express').Router();
const Room = require('./room.js');
const rooms = require('./rooms');

router.ws('/enter', (ws, req, res) => {
  const { roomId, userId } = req.query;

  	try {
  		let room;
  		if (!userId) {
  			throw {};
  		}
  		if (roomId) {//带roomId说明从卡片进入，直接进入存在房间
        room = rooms.getRoom(roomId);

        //检测房间是否还在存在，不存在则以原来的roomId创建房间
        if(room){
          room.enter(req.query);
        }else{
          room = new Room(ws, Object.assign(req.query,{roomId}));
          rooms.addRoom(room);
        }

  		} else {
	  	  room = new Room(ws, req.query);
        rooms.addRoom(room);
  		}
	    ws.on('message', (msg) => {
	    	room.getMsg({ userId, msg, ws });
	    });
	    ws.on('close', (msg) => {
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
