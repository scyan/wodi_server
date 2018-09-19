const rooms={
	rooms:{},
	addRoom:(roomId,room)=>{
	  this.rooms[roomId] = room;
	},
	getRoom:(roomId)=>{
		return this.rooms[roomId]
	}
};
module.exports = rooms;