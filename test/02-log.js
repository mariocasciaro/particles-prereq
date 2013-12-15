var expect = require('chai').expect,
  _ = require('lodash'),
  testStream = require('./02-log/testStream.js'),
  config = require('../').config,
  logger = require('../').logger;

var FIXTURES = __dirname + "/02-log/";


var BASE_CONF = {
  appRoot: __dirname,
  logger: {
    root: {
      level: "info",
      streams: [
        {
          level: "error",
          stream: "${appRoot}/02-log/testStream",
          type: "raw"
        }
      ]
    }
  }
};

describe('Logger',function() {
  describe('root levels', function() {
    beforeEach(function() {
      config.clear();
      config.initialize(BASE_CONF);
      logger.initialize();
    });

    it('should stream messages when level > logger > stream level', function(done) {
      testStream.callback = function(data) {
        expect(data.msg).to.be.equal("Hello");
        expect(data.level).to.be.equal(50);
        done();
      };
      logger().error("Hello");
    });


    it('should not stream messages when level < logger > stream level', function(done) {
      testStream.callback = function(data) {
        done(new Error("Should not output messages"));
      };
      logger().info("Hello");
      setTimeout(done, 200);
    });

    it('should not stream messages when level > logger < stream level', function(done) {
      testStream.callback = function(data) {
        done(new Error("Should not output messages"));
      };
      logger().warn("Hello");
      setTimeout(done, 200);
    });
  });


  describe('child levels', function() {
    beforeEach(function() {
      config.clear();
      var c = _.cloneDeep(BASE_CONF);
      c.logger.test = {
        level: "debug"
      };
      config.initialize(c);
      logger.initialize();
    });

    it('should stream messages when level > root logger > child level', function(done) {
      testStream.callback = function(data) {
        expect(data.msg).to.be.equal("Hello");
        expect(data.component).to.be.equal("test");
        expect(data.level).to.be.equal(50);
        done();
      };
      logger("test").error("Hello");
    });


    it('should stream messages when level < root logger > child level', function(done) {
      testStream.callback = function(data) {
        expect(data.msg).to.be.equal("Hello");
        expect(data.level).to.be.equal(20);
        done();
      };
      logger("test").debug("Hello");
    });
  });
});