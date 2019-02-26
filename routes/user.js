const statics = require('./static');
var request = require('request');

exports.getUserId= (code)=>{
  
    return new Promise((resolve,reject)=>{

      request('https://api.weixin.qq.com/sns/jscode2session?appid=' + statics.appid + '&secret=' + statics.secret + '&js_code=' + code + '&grant_type=authorization_code',
        function(err,response,body){
          if(err){
            reject(err);
            return;
          }
          
          resolve(JSON.parse(body).openid)
          
        });
    })

}



//001lBOOe28uykH02R0Qe2eLBOe2lBOOh

// fetch('https://api.weixin.qq.com/sns/jscode2session?appid=wx2cd4379c989eb2fb&secret=8c57b7f197f180bbf75a47a308fa30c6&js_code=001lBOOe28uykH02R0Qe2eLBOe2lBOOh&grant_type=authorization_code')
//     .then((res)=>{
//       console.log(res)
//     })