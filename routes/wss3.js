const router = require('express').Router();
const Room = require('./room.js');
router.ws('/enter', (ws, req, res) => {
  const { userId, userName, avatar } = req.query;
  
  	try{
  		new Room(ws,req.query);
  		console.log('???')
	    ws.on('message', (msg) => {
	    	// parseMsg({userId, roomId, msg,ws});
	    });
	    ws.on('close', (msg) => {
	    	// 链接断开后，该用户从
	    	// leave({userId, roomId});
	    });
  	}catch(e){
  		console.log(e)
  	}
  
})
module.exports = router;