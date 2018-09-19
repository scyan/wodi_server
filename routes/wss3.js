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
  		if (roomId) {
        room = rooms.getRoom(roomId);
        room.enter(req.query);
  		} else {
	  	  room = new Room(ws, req.query);
  		}
	    ws.on('message', (msg) => {
	    	room.getMsg({ userId, msg, ws });
	    });
	    ws.on('close', (msg) => {
        room.leave({userId});
	    });
  	} catch (e) {
  		console.log(e);
  	}
});
module.exports = router;
