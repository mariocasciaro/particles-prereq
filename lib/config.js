var nconf = require('nconf'),
  path = require('path'),
  _ = require('lodash');


var self = module.exports = {
  templateProcess: function(tpl) {
    if(_.isString(tpl)) {
      return tpl.replace(/\${([\w:]+)}/g, function(match, varname) {
        var val = self.get(varname);
        if(!val) {
          throw new Error("Cannot replace config variable '" + varname +"' in '"+ tpl +"' because it is undefined");
        }
        return val;
      });
    } else if(_.isArray(tpl)){
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

  get: function() {
    return self.templateProcess(nconf.get.apply(nconf, arguments));
  },

  getRaw: function() {
    return nconf.get.apply(nconf, arguments);
  },

  /**
   *
   * @param options
   * @returns config
   */
  initialize: function(options) {
    if(self.initialized) {
      return;
    }
    self.initialized = true;
    options = options || {};
    
    // '::' is the separator for nested properties
    nconf.env('::');
    nconf.argv();
    
    var isDev = nconf.get('NODE_ENV') ? nconf.get('NODE_ENV') === 'development' : true;
    var isProd = nconf.get('NODE_ENV') ? nconf.get('NODE_ENV') === 'production' : false;
    var env = isDev ? "dev" : 'prod';
    
    nconf.overrides({
      isDev: isDev,
      isProd: isProd,
      env: env
    });
    
    var cwd =  nconf.get('cwd') ?  nconf.get('cwd') : process.cwd();
    
    var appRoot = _.isEmpty(options.appRoot) ?  cwd : options.appRoot;
    var configDir = _.isEmpty(options.configDir) ? path.join(appRoot, "config") : options.configDir;

    //load defaults file
    nconf.file('defaults', path.join(configDir, '/defaults.json'));

    //load defaults for env mode file
    nconf.file('defaults-env', path.join(configDir, '/defaults-'+env+'.json'));

    var locals;
    if(locals = nconf.get('local-conf')) {
      //load local file
      nconf.file('locals', path.join(configDir, '/' + locals + '-'+env+'.json'));
    }

    //Some defaults
    nconf.set('appRoot', appRoot);
    nconf.set('configDir', configDir);
    nconf.set('cwd', cwd);

    return self;
  },

  reset: function() {
    nconf.reset();
    self.initialized = false;
  }
};