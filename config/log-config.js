const log4js = require('log4js');
 
log4js.configure({
    replaceConsole: true,
    appenders: {
    stdout: {//控制台输出
        type: 'stdout'
        },
    runlog: {//运行日志输出
        type: 'dateFile',
        filename: __dirname + '/../serverlog/runlog/runCrash',
        pattern: '-yyyy-MM-dd.log',//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
        encoding : 'utf-8',
        daysToKeep:20,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
        alwaysIncludePattern: true //（默认为false） - 将模式包含在当前日志文件的名称以及备份中
        },
    err: {//错误日志
        type: 'dateFile',
        filename: __dirname + '/../serverlog/errlog/err',
        pattern: '-yyyy-MM-dd.log',
        encoding : 'utf-8',
        alwaysIncludePattern: true
        },
    oth: {//其他日志
        type: 'dateFile',
        filename: __dirname + '/../serverlog/othlog/oth',
        pattern: '-yyyy-MM-dd.log',
        encoding : 'utf-8',
        alwaysIncludePattern: true
        }
},
categories: {
    default: { appenders: ['stdout', 'runlog'], level: 'debug' },//appenders:采用的appender,取appenders项,level:设置级别
    err: { appenders: ['stdout', 'err'], level: 'error' },
    oth: { appenders: ['stdout', 'oth'], level: 'info' },
    consolelog: { appenders: ['stdout'], level: 'debug' },
}
});
 
 
exports.getLogger = function (name) {//name取categories项
 return log4js.getLogger(name || 'default')
}