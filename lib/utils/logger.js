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
      stream: "process.stdout"
    }
  ]
};

var LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];



function Logger(name, level, bunyanLogger) {
  this.name = name;
  this.bunyanLogger = bunyanLogger;
  
  level = level.toLowerCase();
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
  this.logger.log(this.level, "Starting profiling ["+this.name+"]");
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
  this.logger.log(this.level, "Profiler ["+this.name+"] executed "+this.times+" time(s) in " +
    this.diff + "ms");
};



var rootLogger;
var cache = {};

function getConfig(name, defaultConfig) {
  name = name || 'root';
  defaultConfig = defaultConfig || {};
  var conf = config.get('logger.'+name);
  conf = extend(true, {}, defaultConfig, conf);
  
  conf.component = name;
  
  conf.streams.forEach(function(stream) {
    var streamOptions = stream.streamOptions;
    if(stream.stream === 'process.stdout') {
      streamOptions = streamOptions || {prettyPrint: true};
      if(streamOptions.prettyPrint) {
        var prettyStdoutStream = new bunyanPrettystream();
        prettyStdoutStream.pipe(process.stdout);
      }
      
      stream.stream = prettyStdoutStream;
      stream.type = 'raw';
    } else if(stream.stream === 'process.stderr') {
      streamOptions = streamOptions || {prettyPrint: true};
      if(streamOptions.prettyPrint) {
        var prettyStderrStream = new bunyanPrettystream();
        prettyStderrStream.pipe(process.stderr);
      }

      stream.stream = prettyStderrStream;
      stream.type = 'raw';
    } else if(stream.stream === 'ringBuffer') {
      streamOptions = streamOptions || {limit: 100};
      stream.stream = new bunyan.RingBuffer(streamOptions);
      stream.type = 'raw';
    }
    //clean unneeded options
    delete stream.streamOptions;
  });
}

logger.initialize = function() {
  var conf = getConfig(undefined, DEFAULT_ROOT_CONFIG);
  conf.name = 'particles';
  rootLogger = bunyan.createLogger(conf);

  cache[conf.component] = new Logger(conf.component, conf.level, rootLogger);
};

/**
 *
 * @type {Function}
 */
function logger(name, defaultConfig) {
  var conf = getConfig(name, defaultConfig);
  name = conf.component;
  if(cache[name] === void 0) {
    cache[name] = new Logger(name, conf.level, new rootLogger.child(conf));
  }
  return cache[name];
}

module.exports = logger;
module.exports.__module = {
  type: 'object'
};
