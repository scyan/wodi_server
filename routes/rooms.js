class Rooms{
	constructor(){
		this.rooms={}
	}
	addRoom(room){
		this.rooms[room.roomId] = room;
	}
	deleteRoom(roomId){
		delete this.rooms[roomId];
	}
	getRoom(roomId){
		return this.rooms[roomId]
	}
}

module.exports = new Rooms();