var db=require('../model/mysql.js');

//向外暴露方法
module.exports = {
     addCrashGameHistory :  async (crash_id,times) => {//历史记录表添加游戏历史
        let resultArray =  await db.query('SELECT COUNT(ch_id) as chNum FROM eg_crash_history WHERE crash_id=?',[crash_id]);
        resultArray = Object.values(JSON.parse(JSON.stringify(resultArray)))[0];//格式化返回结果变成对象
        //console.log(resultArray);
        if(resultArray.chNum == 0){
            let insRes=await db.query('INSERT INTO eg_crash_history(crash_id,ch_time) VALUES(?,?)',[crash_id,times]);
            let tmpVar=JSON.parse(JSON.stringify(insRes));
            //console.log(tmpVar.insertId);
        }
    },
    updCrashGameHistory : async (crash_id,oddx,times)=>{//修改游戏记录表里历史游戏
        let resultArray =  await db.query('SELECT COUNT(ch_id) as chNum FROM eg_crash_history WHERE crash_id=?',[crash_id]);
        resultArray = Object.values(JSON.parse(JSON.stringify(resultArray)))[0];//格式化返回结果变成对象
        //console.log(resultArray);
        if(resultArray.chNum > 0){
            let insRes=await db.query('UPDATE eg_crash_history SET ch_win_result=? , ch_time=? WHERE crash_id=?',[oddx,times,crash_id]);
            let tmpVar=JSON.parse(JSON.stringify(insRes));
            //console.log(tmpVar.insertId);
        }
    },
     addCrashGamePlayer :  async (crash_id,playAcc,betOddx,betNum,playType,times) => {//添加玩家投注记录
            let resultHistoryArray =  await db.query('SELECT COUNT(ch_id) as chNum FROM eg_crash_history WHERE crash_id=?',[crash_id]);
            resultHistoryArray = Object.values(JSON.parse(JSON.stringify(resultHistoryArray)))
            let resultArray =  await db.query('SELECT COUNT(cp_id) as cpNum FROM eg_crash_players WHERE crash_id=? AND cp_player_account=?',[crash_id,playAcc]);
            resultArray = Object.values(JSON.parse(JSON.stringify(resultArray)))[0];
            //console.log(resultArray);
            if(resultArray.cpNum == 0 && resultHistoryArray.length>0){
                let insRes=await db.query('INSERT INTO eg_crash_players(crash_id,cp_player_account,cp_bet_oddx,cp_bet_num,cp_play_type,cp_play_time) VALUES(?,?,?,?,?,?)',[crash_id,playAcc,betOddx,betNum,playType,times]);
                let tmpVar=JSON.parse(JSON.stringify(insRes));
                //console.log(tmpVar.insertId);
            }
    },
     updCrashGamePlayer :  async (crash_id,playAcc,betOddx) => {//修改玩家投注记录,逃跑时用
            let resultArray =  await db.query('SELECT COUNT(cp_id) as cpNum FROM eg_crash_players WHERE crash_id=? AND cp_player_account=?',[crash_id,playAcc]);
            resultArray = Object.values(JSON.parse(JSON.stringify(resultArray)))[0];
            console.log(resultArray);
            if(resultArray.cpNum > 0){
                let insRes=await db.query('UPDATE eg_crash_players SET cp_bet_oddx=? WHERE crash_id=? AND cp_player_account=?',[betOddx,crash_id,playAcc]);
                let tmpVar=JSON.parse(JSON.stringify(insRes));
                console.log(tmpVar);
            }
        
    },
    searchCrashGamePlayer : async (playAcc,playType=1)=>{//检索玩家游戏历史记录 全部条
            let resultArray =  await db.query('SELECT crash_id,cp_bet_num as betNum,cp_bet_oddx as betOddx FROM eg_crash_players WHERE cp_player_account=? AND cp_play_type=? ORDER BY cp_id DESC',[playAcc,playType]);
            resultArray = Object.values(JSON.parse(JSON.stringify(resultArray)));//格式化返回结果变成对象
            let resArr=[];
            let betOddx=0;
            let income=0;
            let betNum=0;
            for(let i=0;i<resultArray.length;i++){
                        let historyData =  await db.query('SELECT ch_win_result FROM eg_crash_history WHERE crash_id=?',[resultArray[i].crash_id]);
                        historyData = Object.values(JSON.parse(JSON.stringify(historyData)))[0];//格式化返回结果变成对象
                        let historyDataArr = Object.values(JSON.parse(JSON.stringify(historyData)));//格式化返回结果变成对象
                        if(historyDataArr.length>0){
                            if(resultArray[i].betOddx >= historyData.ch_win_result){
                                betOddx='-';
                                income='-';
                            }else{
                                betOddx=resultArray[i].betOddx;
                                income=resultArray[i].betOddx*resultArray[i].betNum;//算玩家收益,应该不太准,到时候再调
                            }
                            resArr[i]={
                                crash_id:resultArray[i].crash_id,
                                betNum:resultArray[i].betNum,
                                revelNum:historyData.ch_win_result,
                                betOddx:betOddx,
                                income:income,
                                    }
                };
            }
            //console.log(resArr);
            return resArr;
    },
    searchCrashGameHistory : async (playAcc,playType=1)=>{//检索游戏历史记录 20条
    
            let historyResultArray =  await db.query('SELECT crash_id,ch_win_result as winOddx FROM eg_crash_history ORDER BY ch_id DESC LIMIT 0,20',[]);
            historyResultArray = Object.values(JSON.parse(JSON.stringify(historyResultArray)));//格式化返回结果变成对象
            let resArr=[];
            let myBetNum=0;
            let myWinNum=0;
            for(let i=0;i<historyResultArray.length;i++){
                let playersResultArray =  await db.query('SELECT crash_id,cp_bet_num AS betNum,cp_bet_oddx AS betOddx FROM eg_crash_players WHERE cp_player_account=? AND cp_play_type=? AND crash_id=?',[playAcc,playType,historyResultArray[i].crash_id]);
                playersResultArray = Object.values(JSON.parse(JSON.stringify(playersResultArray)));
                if(playersResultArray.length>0){
                    myBetNum = playersResultArray[0].betNum;
                    if(historyResultArray[i].winOddx > playersResultArray[0].betOddx){
                        myWinNum = playersResultArray[0].betNum*playersResultArray[0].betOddx;//算玩家收益,应该不太准,到时候再调
                    }else{
                        myWinNum='-';
                    }
                    
                }else{
                    myBetNum='-';
                    myWinNum='-';
                }
                resArr[i]={
                    crash_id:historyResultArray[i].crash_id,
                    reveal:historyResultArray[i].winOddx,
                    myBetNum:myBetNum,
                    myWinNum:myWinNum,
                }
            }
            //console.log(resArr);
            return resArr;
    },
};