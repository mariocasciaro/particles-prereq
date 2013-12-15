var bunyan = require('bunyan'),
  config = require("../config"),
  extend = require('extend'),
  bunyanPrettystream = require('bunyan-prettystream'),
  _ = require('lodash');

var DEFAULT_ROOT_CONFIG = {
  level: "info",
  streams: [
    {
      level: "info",
      stream: "process.stdout",
      streamOptions: {mode: 'short', prettyPrint: true}
    }
  ],
  serializers: bunyan.stdSerializers
};

var LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];



function Logger(level, bunyanLogger) {
  this.bunyanLogger = bunyanLogger;
  this.level = level;
  
  switch(level) {
    case 'trace':
      this.trace = function() {
        this.bunyanLogger.trace.apply(this.bunyanLogger, arguments);
      };
    case 'debug':
      this.debug = function() {
        this.bunyanLogger.debug.apply(this.bunyanLogger, arguments);
      };
    case 'info':
      this.info = function() {
        this.bunyanLogger.info.apply(this.bunyanLogger, arguments);
      };
    case 'warn':
      this.warn = function() {
        this.bunyanLogger.warn.apply(this.bunyanLogger, arguments);
      };
    case 'error':
      this.error = function() {
        this.bunyanLogger.error.apply(this.bunyanLogger, arguments);
      };
    case 'fatal':
      this.fatal = function() {
        this.bunyanLogger.fatal.apply(this.bunyanLogger, arguments);
      };
  }
}

Logger.prototype.startProfiling = function(name, autoStart, level) {
  var profiler = new Profiler(this, name, level);
  if(autoStart) {
    profiler.start();
  }
  return profiler;
};

Logger.prototype.getProfiler = function(name, level) {
  return new Profiler(this, name, level);
};

Logger.prototype.log = function(level) {
  this[level].apply(this, Array.prototype.slice.call(arguments, 1));
};

Logger.prototype.trace = Logger.prototype.debug = Logger.prototype.info = Logger.prototype.warn =
  Logger.prototype.error = Logger.prototype.fatal = 
    function() {};

//TODO add custom fields for profiler messages
/**
 *
 * @param logger
 * @param name
 * @param level
 * @constructor
 */
function Profiler(logger, name, level) {
  this.logger = logger;
  this.name = name;
  this.times = 0;
  this.diff = 0;
  this.paused = true;
  this.level = level || 'debug';
}

Profiler.prototype.start = function() {
  this.time = Date.now();
  this.times++;
  this.paused = false;
  this.logger[this.level]({profiler: this.name}, "Starting profiling");
};

Profiler.prototype.pause = function() {
  if(!this.paused) {
    this.diff += Date.now() - this.time;
    this.paused = true;
  }
};

Profiler.prototype.end = function() {
  if(!this.paused) {
    this.diff += Date.now() - this.time;
  }
  this.logger[this.level]({profiler: this.name}, "Profiler executed "+this.times+" time(s) in " +
    this.diff + "ms");
};



var rootBunyanLogger;
var cache = {};

function getConfig(name, defaultConfig) {
  name = name || 'root';
  var conf = config.get(['logger', name]);
  conf = extend(true, {}, defaultConfig, conf);
  
  _.each(conf.streams, function(stream) {
    var streamOptions = stream.streamOptions;
    if(stream.stream === 'process.stdout') {
      streamOptions = streamOptions || {prettyPrint: true};
      if(streamOptions.prettyPrint) {
        var prettyStdoutStream = new bunyanPrettystream(streamOptions);
        prettyStdoutStream.pipe(process.stdout);
        stream.stream = prettyStdoutStream;
        stream.type = 'raw';
      } else {
        stream.stream = process.stdout;
      }
      
      
    } else if(stream.stream === 'process.stderr') {
      streamOptions = streamOptions || {prettyPrint: true};
      if(streamOptions.prettyPrint) {
        var prettyStderrStream = new bunyanPrettystream(streamOptions);
        prettyStderrStream.pipe(process.stderr);
        stream.stream = prettyStderrStream;
        stream.type = 'raw';
      } else {
        stream.stream = process.stderr;
      }

     
    } else if(stream.stream === 'ringBuffer') {
      streamOptions = streamOptions || {limit: 100};
      stream.stream = new bunyan.RingBuffer(streamOptions);
      stream.type = 'raw';
    } else {
      //just load the specified file
      stream.stream = require(stream.stream);
    }
    //clean unneeded options
    delete stream.streamOptions;
  });

  var loggerConf = {level: conf.level};
  //now since our LoggerLevel might be different than the one from bunyan...
  if(conf.level && !_.contains(LEVELS, conf.level.toLowerCase())) {
    delete conf.level;
  }
  
  return {
    bunyanConfig: conf,
    loggerConfig: loggerConf
  }
}

logger.initialize = function() {
  var conf = getConfig(undefined, DEFAULT_ROOT_CONFIG);
  conf.bunyanConfig.name = 'particles';
  conf.bunyanConfig.component = '';
  rootBunyanLogger = bunyan.createLogger(conf.bunyanConfig);

  cache.root = new Logger(conf.loggerConfig.level, rootBunyanLogger);
};

/**
 *
 * @type {Function}
 */
function logger(name, defaultConfig) {
  if(!name) {
    return cache.root;
  }
  
  var parts = name.split('/');
  var currentLogger = cache.root;
  var currentComponent = [];
  while(parts.length) {
    var currentPart = parts.shift();
    currentComponent.push(currentPart);
    
    var currentComponentStr = currentComponent.join('/');
    if(cache[currentComponentStr] === void 0) {
      var conf = getConfig(currentComponentStr, defaultConfig);
      conf.bunyanConfig.component = currentPart;
      var level = conf.loggerConfig.level || currentLogger.level;
      
      cache[currentComponentStr] = new Logger(level, 
        currentLogger.bunyanLogger.child(conf.bunyanConfig));
    }
    currentLogger = cache[currentComponentStr];
  }
  return currentLogger;
}

module.exports = logger;
module.exports.__module = {
  type: 'object'
};
