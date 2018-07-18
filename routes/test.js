//进入房间，广播消息消息
{type:'enter',userList:[{userId,avatar,userName},{...}]}

//如果有人离开
[type:'leave',userList:[{userId,avatar,userName},{...}]]
//准备,所有人收到
{type:'ready',userList:[{userId,avatar,userName,ready:true}]}
//新人进入，收到广播
{type:'enter',userList:[{userId,avatar,userName,ready:true}]}

//所有人准备完毕,房主发送消息
{type:'start',roomId,words,usedWordsIndex}
//广播消息
{type:'start',words,usedWordsIndex}

//发言
//房主向后台发送信息
{type:'canSpeak',userId}
//广播
{type:'canSpeak',userId}

//发言者发送信息
{type:'speak',message}
//广播
{type:'speak',userId,message}
//回到“发言”


//所有人发言完毕
//房主发送信息
{type:'canVote'}
//广播信息
{type:'canVote'}
//投票

//投票者发送信息
{type:'vote',userId,toUserId}
//广播
{type:'vote',userId,toUserId}

//所有人投票完毕，房主统计死者,发送信息
{type:'dead',userId}

//如果游戏结束,发送
{type:'gameOver'}

//如果游戏进行中其中有人离开
//广播
{type:'leave',userId}


