
var expect = require('chai').expect,
  Scatter = require('scatter');


var ROOT_DIRS = [
  __dirname + '/../lib'
];

var CONFIG = "../lib/config";
var FIXTURES = __dirname + "/01-config/";

describe('Config',function() {
  describe('[uder from require()]', function() {
    beforeEach(function() {
      delete require.cache[require.resolve(CONFIG)];
      delete require.cache[require.resolve('nconf')];
    });

    it('should be empty if not initialized', function() {
      var config = require(CONFIG);
      expect(config.get()).to.be.empty;
    });

    it('should NOT be empty if initialized', function() {
      var config = require(CONFIG);
      expect(config.get()).to.be.empty;
      config.initialize();
      expect(config.get()).not.to.be.empty;
    });

    it('check cache cleaning', function() {
      var config = require(CONFIG);
      expect(config.get()).to.be.empty;
    });

    it('should contain env variables', function() {
      var config = require(CONFIG).initialize();
      expect(config.get('HOME')).to.be.equal(process.env.HOME);
    });

    it('should load default.json contents', function() {
      var config = require(CONFIG);
      config.initialize({appRoot: __dirname, configDir: FIXTURES+'/basic'});

      expect(config.get('flat')).to.be.equal("helloFlat!");
      expect(config.get('level:val')).to.be.equal("helloLevel!");
      expect(config.get('appRoot')).to.be.equal(__dirname);
    });

    it('should load default.json contents, from default named config dir', function() {
      var config = require(CONFIG);
      config.initialize({appRoot: FIXTURES});

      expect(config.get('flat')).to.be.equal("helloFlat!");
      expect(config.get('level:val')).to.be.equal("helloLevel!");
      expect(config.get('appRoot')).to.be.equal(FIXTURES);
    });

    it('should replace templates', function() {
      var config = require(CONFIG);
      config.initialize({appRoot: __dirname, configDir: FIXTURES+'/templates'});

      expect(config.get('hello')).to.be.equal("hello");
      expect(config.get('helloWorld')).to.be.equal("hello world!");
      expect(config.get('helloWorldExt')).to.be.equal("hello world!!!");
    });

    it('should handle undefined values', function() {
      var config = require(CONFIG);
      config.initialize({appRoot: __dirname, configDir: FIXTURES+'/templates'});

      expect(config.get('helloWrong')).to.not.exist;
    });
  });


  describe('used from Scatter', function() {
    var scatter;
    beforeEach(function() {
      scatter = new Scatter();
      scatter.registerParticles(ROOT_DIRS);
      require(CONFIG).initialize({appRoot: __dirname, configDir: FIXTURES+'/templates'});
    });

    it('should be empty if not initialized', function(done) {
      scatter.load('config').then(function(config){
        expect(config.get('hello')).to.be.equal("hello");
        expect(config.get('helloWorld')).to.be.equal("hello world!");
        expect(config.get('helloWorldExt')).to.be.equal("hello world!!!");
        done();
      });
    });
  });
});
