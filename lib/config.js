var path = require('path'),
  fs = require('fs'),
  jm = require("./utils/json-minify"),
  objectPath = require('object-path'),
  extend = require('extend'),
  _ = require('lodash');


var self = module.exports = {
  data: {},

  templateProcess: function(tpl) {
    if(_.isString(tpl)) {
      return tpl.replace(/\${([\w\.\|]+)}/g, function(match, varname) {
        var vars = varname.split("|");
        for(var i = 0; i < vars.length; i++) {
          var val = self.get(vars[i]);
          if(val) {
            return val;
          }
        }
        
        throw new Error("Cannot replace config variable '" + varname +"' in '"+ tpl +"' because it is undefined");
      });
    } else if(_.isArray(tpl)) {
      var arr = [];
      _.each(tpl, function(val) {
        arr.push(self.templateProcess(val));
      });
      return arr;
    } else if(_.isObject(tpl)){
      var obj = {};
      _.each(tpl, function(val, key) {
        obj[key] = self.templateProcess(val);
      });
      return obj;
    }
    return tpl;
  },

  get: function(key) {
    return self.templateProcess(self.getRaw(key));
  },

  getRaw: function(key) {
    return objectPath.get(self.data, key);
  },

  set: function(key, val) {
    return objectPath.set(self.data, key, val);
  },

  persist: function(key, val, callback) {
    self.set(key, val);
    var overridesFile = path.join(self.get('configDir'), 'overrides.json');
    //persist into overrides
    //TODO save/flush on app close?

    //force creation
    fs.closeSync(fs.openSync(overridesFile, 'a'));

    fs.readFile(overridesFile, 'utf-8', function(err, data) {
      if(err) {
        return callback(err);
      }

      var obj = {};
      if(data) {
        obj = JSON.parse(data);
      }

      objectPath.set(obj, key, val);
      fs.writeFile(overridesFile, JSON.stringify(obj, null, "  "), callback);
    });
  },

  mergeChain: function(chain) {
    var args = [true, {}].concat(chain);
    args.push(self.data);

    self.data = extend.apply(null, args);
  },

  /**
   *
   * @param options
   * @returns config
   */
  initialize: function(options) {
    if(self.initialized) {
      return self;
    }
    self.initialized = true;
    options = options || {};

    var chain = [];

    chain.push(process.env);

    var isDev = process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : true;
    var isProd = process.env.NODE_ENV ? process.env.NODE_ENV === 'production' : false;
    var env = isDev ? "dev" : 'prod';

    chain.push({
      isDev: isDev,
      isProd: isProd,
      env: env
    });

    //save chain now to get some initial variables
    self.mergeChain(chain);
    chain = [];
    
    var cwd =  path.resolve(self.get('cwd') || process.cwd());
    process.chdir(cwd);

    var appRoot = options.appRoot ||  cwd;
    var configDir = options.configDir || path.join(appRoot, "config");

    chain.push({
      appRoot: appRoot,
      configDir: configDir,
      cwd: cwd
    });


    var next = path.join(configDir, 'defaults.json');
    while(next && fs.existsSync(next)) {
      var nextConfig = JSON.parse(jm.minify(fs.readFileSync(next, 'utf-8')));
      chain.push(nextConfig);

      //get next
      var nextName = nextConfig.next;
      if(nextName) {
        if(typeof nextName !== 'string') {
          nextName = nextName[env];
        }

        next = path.join(configDir, nextName);
      } else {
        next = null;
      }
    }

    var overrides = path.join(configDir, 'overrides.json');
    if(fs.existsSync(overrides)) {
      chain.push(JSON.parse(jm.minify(fs.readFileSync(overrides, 'utf-8'))));
    }

    self.mergeChain(chain);

    return self;
  },

  clear: function() {
    self.data = {};
    self.initialized = false;
  }
};