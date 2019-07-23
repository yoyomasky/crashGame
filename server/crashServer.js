const Env_var = require('../config/config');
const Log = require('../config/log-config');
const Env_var_test = require('../config/test_config');
const crashMysqlAction = require('../action/crashMysqlAction');
const ANSWER_MAX_NUM=98;
var io = require('socket.io')(8899);


var gameStatus = true;//控制轮询
var blockLoopStatus = true;
var gameState = true;
var gameBetStop = true;
var socketsGameStatus=true;

var gameRevealNum=0;
var gameNowCrashNum=0;
var gameOldCrashNum=0;
var gameStartTime=0;
var gameNowRevealNum=0;
var gameTmpRecursive=0;
var gameTmpPlayersData={};
var gameTmpPlayersDataNum=0;


var textTouzhu_status=true;

//日志
var errlog = Log.getLogger('err');
var runlog = Log.getLogger();
var othlog = Log.getLogger('oth');
var consoleLog = Log.getLogger('consolelog');



//测试用的自动投注
async function testTouzhu(crashId){
  //consoleLog.info(textTouzhu_status);
    if(textTouzhu_status){
      await Env_var_test.EosApiTest.transact({
        actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: 'chen11111113',
          permission: 'active',
        }],
        data: {
          from: 'chen11111113',
          to: Env_var.CrashAdmin,
          quantity: '0.2000 EOS',
          memo: crashId+',123,chen11111114',
        },
      }]} , {
        blocksBehind: 3,
        expireSeconds: 30,
      }).then(res=>{
        textTouzhu_status=false;
        //consoleLog.info(res);
        consoleLog.info('自动投注执行完成~ 交易哈希:'+res.transaction_id);
      }).catch(err=>{
          consoleLog.info("自动投注 transact error: "+err);
      });
    }

}

function getOddx(num){
  if(num==0){
    return 0;
  }else{
    return (Math.round((ANSWER_MAX_NUM/num)*100) / 100);
  }

}

/**
 * 
 *游戏控制部分------------------------------------------------------------------
 */

/**
 * 创建游戏
 */
async function GameStart(gamesStartType){
  //console.log('准备创建游戏~');

  let gameOverNum=0;
  if(gamesStartType){
    const tableinfo = await Env_var.JsonRpc.get_table_rows({
      "code": Env_var.CrashAdmin,
      "index_position": 1,
      "json": true,
      "key_type": "i64",
      "limit": 100,
      "lower_bound": null,
      "scope": Env_var.CrashAdmin,
      "table": "history",
      "table_key": "",
      "upper_bound": null 
    }).catch(async err=>{
      errlog.error('创建游戏查询History表失败:'+err);
      setTimeout(async ()=>{
       await init();
      },5000);
  });

    for( val in tableinfo.rows ){
      if(tableinfo.rows[val].answer_number==0){
          gameOverNum++;
      }
    }
  }

  //console.log(gameOverNum);
  if(gameOverNum == 0){
    let txLog=await Env_var.EosApi.transact({
      actions: [{
      account: Env_var.CrashAdmin,
      name: 'create',
      authorization: [{
        actor: Env_var.CrashAdmin,
        permission: 'active',
      }],
      data: {

      },
    }]} , {
      blocksBehind: 3,
      expireSeconds: 30,
    }).catch(err=>{
        //console.log("创建游戏 error: ",err);
        errlog.error('创建游戏失败:'+err);
        setTimeout(async ()=>{      
          await GameStart(true);
        },5000);

    });

    //console.log('游戏已创建,现在开始游戏了~!',txLog.transaction_id);
    runlog.debug('游戏已经创建,现在开始游戏,可以投注了,交易Hash:'+txLog.transaction_id);
    gameStatus = true;
    blockLoopStatus = true;
    gameBetStop = true;
    socketsGameStatus = true;
    gameStartTime=Date.now();
    gameTmpPlayersDataNum=0;
    gameTmpPlayersData={};

    textTouzhu_status=true;//测试用投注开关
    await init();

  }

}
/**
 * GamesReveal
 * @param {number} block 
 * @param {number} crash_id 
 */
async function revealGame(block,crash_id){
    if(gameBetStop){
      gameBetStop=false;
      //停止投注
      let txStopBet=await Env_var.EosApi.transact({
        actions: [{
        account: Env_var.CrashAdmin,
        name: 'stopgamebet',
        authorization: [{
          actor: Env_var.CrashAdmin,
          permission: 'active',
        }],
        data: {
          type:0
        },
      }]} , {
        blocksBehind: 3,
        expireSeconds: 30,
      }).catch(async err=>{
        errlog.error('停止游戏操作失败:'+err);
        setTimeout(async ()=>{      
          await init();
        },5000);
      });
      if(typeof txStopBet.transaction_id != "undefined"){
        runlog.debug('游戏已经停止投注,交易Hash:'+txStopBet.transaction_id);
      }

    }
  let revealStatus=true;
    //循环查询区块开奖
  let intervalObj=setInterval(async()=>{
      if(revealStatus){
        let info = await Env_var.JsonRpc.get_info();
        //console.log('等待开奖~~~',block,info.head_block_num);
        if(info.head_block_num>=(block+10) && blockLoopStatus){
          blockLoopStatus=false;
          clearInterval(intervalObj);
          let revealBlock=await Env_var.JsonRpc.get_block(block+10+'');

          let BlockNum = revealBlock.id.replace(/[^0-9]/ig,"");
          let revealNum = Number(BlockNum.substring(BlockNum.length-2))+1;
          //console.log('该开奖了',revealBlock.id,revealNum,getOddx(revealNum));
          runlog.debug('准备执行开奖交易,开奖区块:'+revealBlock.id+ ' 游戏ID:' +crash_id+' 中奖数:'+revealNum+' 中奖赔率:'+ getOddx(revealNum));
          
        
          let txLog='';
          await Env_var.EosApi.transact({
            actions: [{
            account: Env_var.CrashAdmin,
            name: 'reveal',
            authorization: [{
              actor: Env_var.CrashAdmin,
              permission: 'active',
            }],
            data: {
              crash_id: crash_id,
              answer_number: revealNum,
            },
          }]} , {
            blocksBehind: 3,
            expireSeconds: 30,
          }).then(res=>{
              txLog=res;
              revealStatus=false;
          }).catch(err=>{
              errlog.error('执行开奖方法操作失败:'+err);
          });

          runlog.debug('开奖方法执行完毕,hash:'+txLog.transaction_id);

          await crashMysqlAction.updCrashGameHistory(crash_id,getOddx(revealNum),gameStartTime.toString().substr(0,10));//更新数据库游戏历史记录
          socketsGameStatus = false;
          gameRevealNum=revealNum;//中奖随机数
          gameOldCrashNum=crash_id;//准备开奖的游戏ID
          setTimeout(async ()=>{      
            await GameStart(true);
          },(getOddx(revealNum)*1000+1000));
        }
      }
  },500);
}
/**
 * 服务start.....
 */
async function init(){

   // 获取主网信息
  const info = await Env_var.JsonRpc.get_info();

  const tableinfo = await Env_var.JsonRpc.get_table_rows({
    "code": Env_var.CrashAdmin,
    "index_position": 1,
    "json": true,
    "key_type": "i64",
    "limit": 1000,
    "lower_bound": null,
    "scope": Env_var.CrashAdmin,
    "table": "history",
    "table_key": "",
    "upper_bound": null 
  }).catch(async err=>{
      errlog.error('获取主网信息失败,init->getTableRow:'+err);
      setTimeout(async ()=>{
       await init();
      },5000);
  });
  
  var crashTime=0;
  for( val in tableinfo.rows ){
    if(tableinfo.rows[val].answer_number==0){
        crashTime=tableinfo.rows[val].creation_time;
        crash_id=tableinfo.rows[val].crash_id;
    }
  }
  if(crashTime!=0){
  let chainTime=Env_var.Moment(info.head_block_time);
  let gameTime=Env_var.Moment((crashTime/1000)-28800000);
    if(chainTime.diff(gameTime)>=Env_var.GameIntervalTime && gameStatus){
      gameStatus=false;
      revealGame(info.head_block_num,crash_id);
    }else{
      //console.log('- - -');
      //console.log('游戏已经创建,投注中~~',crash_id);
      gameNowCrashNum=crash_id;
      await crashMysqlAction.addCrashGameHistory(crash_id,gameStartTime.toString().substr(0,10));//数据库里插入刚创建的游戏

      await testTouzhu(crash_id);//测试用的自动投注

      setTimeout(async ()=>{
        await init();
      },1000);
    }
  }else if(gameState){
    gameState=false;
    GameStart(false);
  }else{
      //console.log('- - - -');
      //console.log('游戏已经创建,投注中~~',crash_id);
      setTimeout(async ()=>{
        await init();
      },1000);
  }
}



/**
 * Sockets部分------------------------------------------------------------------
 */
io.sockets.on('connection', function (socket){

	var refresh_online = function(){

    let gameDataObj={
      gameState:socketsGameStatus,//现在的游戏状态
      betState:gameBetStop,//现在的投注状态
      //revealOddx:OddxNum,//揭奖结果倍数
      nowCrashId:gameNowCrashNum,
      oldCrashId:gameOldCrashNum,
      gameStartTime:gameStartTime,
    }
    //console.log(gameDataObj);
		io.sockets.emit('nowGameData', gameDataObj);//所有人广播游戏数据

    let OddxNum =getOddx(gameRevealNum);
    if(OddxNum != gameNowRevealNum && OddxNum!=0){
      gameTmpRecursive=100;
      OddxAnimation(OddxNum);
      gameNowRevealNum = OddxNum;
    }
    getGamesTableData();
    setTimeout(async ()=>{
      refresh_online();
    },500);
	}
  //倒计时动画递归
  function OddxAnimation(OddxNum){
    let tmp1=Number(OddxNum*100);
    //console.log(gameTmpRecursive,OddxNum);
    if(Math.abs(gameTmpRecursive-tmp1)>20){
      gameTmpRecursive+=10;
      setTimeout(async ()=>{
        OddxAnimation(OddxNum);
      },100);
    }else{
      gameTmpRecursive=OddxNum;
    }
		io.sockets.emit('oddxAnimation', gameTmpRecursive);//所有人广播倒计时动画
  }
  //递归获取当前游戏数据
  async function getGamesTableData(){
    if(gameBetStop){
      var tableinfo = await Env_var.JsonRpc.get_table_rows({
        "code": Env_var.CrashAdmin,
        "index_position": 1,
        "json": true,
        "key_type": "i64",
        "limit": 1000,
        "lower_bound": null,
        "scope": Env_var.CrashAdmin,
        "table": "games",
        "table_key": "",
        "upper_bound": null 
      }).catch(async err=>{
        setTimeout(async ()=>{
        await getGamesTableData();
        },5000);
      });
      if(typeof tableinfo.rows != "undefined"){
        if(gameTmpPlayersDataNum != tableinfo.rows.length){
          gameTmpPlayersDataNum = tableinfo.rows.length
          gameTmpPlayersData=tableinfo;
          io.sockets.emit('gamesTableData', tableinfo);//所有人游戏上车状态
        }else{
          io.sockets.emit('gamesTableData', gameTmpPlayersData);//所有人游戏上车状态
        }
      }else{
        setTimeout(async ()=>{
        await getGamesTableData();
        },5000);
      }
    }else{
        io.sockets.emit('gamesTableData', gameTmpPlayersData);//所有人游戏上车状态
    }
  }

	refresh_online();

  socket.on('getCrashGamePlayer', async data =>{//监听获取我的记录事件
    let playData=await crashMysqlAction.searchCrashGamePlayer(data.playerAcc,data.playType);
    io.sockets.connected[socket.id].emit('pushPlayerGameData',playData);
  });
  socket.on('getCrashGameHistory', async data =>{//监听获取游戏历史记录事件
    let historyData=await crashMysqlAction.searchCrashGameHistory(data.playerAcc,data.playType);
    io.sockets.connected[socket.id].emit('pushHistoryGameData',historyData);
  });
  socket.on('addCrashGamePlayer', function(data){//添加玩家投注监听事件
    //console.log(data);
    crashMysqlAction.addCrashGamePlayer(data.crash_id,data.playerAcc,data.betOddx,data.betNum,data.playType,data.playTime);
    //console.log('addCrashGamePlayer',data.crash_id);
  });
  
	// //掉线，断开链接处理
	// socket.on('disconnect', function(){
	// 	delete usersWS[name];
	// 	session = null;
	// 	socket.broadcast.emit('system message', '【'+name + '】无声无息地离开了。。。');
	// 	refresh_online();
	// });
	
});

init();//Server入口

//crashMysqlAction.addCrashGameHistory(2);//添加游戏历史
//crashMysqlAction.updCrashGameHistory(2,98,1111111);//修改游戏历史
//crashMysqlAction.addCrashGamePlayer(2,'chen21111111',1.23,1.0000,1,Date.now().toString().substr(0,10));//添加玩家投注 游戏期数,账号,投注赔率,投注金额,投注时间(秒)
//crashMysqlAction.searchCrashGamePlayer('chen21111111');//查询玩家记录
//crashMysqlAction.searchCrashGameHistory('chen21111111');//查询游戏历史记录
