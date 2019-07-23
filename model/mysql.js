let mysql = require('mysql');//引入mysql模块
var databaseConfig = require('../config/mysql.config');  //引入数据库配置模块中的数据

//向外暴露方法
module.exports = {
    query : (sql,params)=>{
        return new Promise((resolve,reject)=>{
            //每次使用的时候需要创建链接，数据操作完成之后要关闭连接
            var connection = mysql.createConnection(databaseConfig);        
            connection.connect((err)=>{
                if(err){
                    console.log('数据库链接失败');
                    reject(err);
                }
                //开始数据操作
                //传入三个参数，第一个参数sql语句，第二个参数sql语句中需要的数据，第三个参数回调函数
                connection.query( sql, params, (err,results,fields )=>{
                    if(err){
                        console.log('数据操作失败');
                        reject(err);
                    }
                    resolve(results, fields)
                    //results作为数据操作后的结果，fields作为数据库连接的一些字段
                    //停止链接数据库，必须再查询语句后，要不然一调用这个方法，就直接停止链接，数据操作就会失败
                    connection.end((err)=>{
                        if(err){
                            console.log('关闭数据库连接失败！');
                            reject(err);
                        }
                    });
                });
            });
        });
    }
};