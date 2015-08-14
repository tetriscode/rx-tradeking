'use strict';

var oauth = require('oauth');
var configuration = require('./config');
var Rx = require('rx');
var _ = require('lodash');

// Setup the OAuth Consumer
var format = '.json';

var tkConsumer = new oauth.OAuth(
    'https://developers.tradeking.com/oauth/request_token',
    'https://developers.tradeking.com/oauth/access_token',
    configuration.consumerKey,
    configuration.consumerSecret,
    '1.0',
    'http://mywebsite.com/tradeking/callback',
    'HMAC-SHA1');

var get = function(endpoint,res) {
    var url = configuration.apiUrl + '/' + endpoint;
    tkConsumer.get(url,configuration.accessToken, configuration.accessSecret,res);
};

 var post = function(endpoint,postBody,postContentType,res) {
     tkConsumer.post(configuration.apiUrl + '/' + endpoint + format,
         configuration.accessToken, configuration.accessSecret, postBody, postContentType);
 };

var toUrl = function(paths,getParams) {
    var pathsUrlStr = _.map(paths).reduce(function(iteratee,path) {
      if (_.isNull(iteratee)) {
          iteratee += '/';
      }
      return iteratee + '/' + path;
    },'');
    var keys = _.keys(getParams);
    var paramsUrlStr = keys.reduce(function(iteratee,param) {
        if (_.isEqual(iteratee,'')) {
            iteratee += '?';
        } else {
            iteratee += '&';
        }
        iteratee += (param + '=' + getParams[param]);
        return iteratee;
    },'');
    return pathsUrlStr + format + paramsUrlStr;
};

var reqToStream = function(method,url,delay) {
  var rate = Rx.Observable.interval(delay).timeInterval();
  var request = Rx.Observable.fromCallback(method)(url).map(function(r) {
      // var e = r[0];
      var data = r[1];
      // var res = r[2];
      return JSON.parse(data);
  });
  return Rx.Observable.zip(request,rate,function(request){
    return request;
  });
};

module.exports = {
    account : {
        accounts : function() {
            return reqToStream(get,toUrl(['accounts']),60*1000/180);
        },
        balances : function () {
            return reqToStream(get,toUrl(['accounts','balances']),60*1000/180);
        },
        id : function(id) {
            return reqToStream(get,toUrl(['accounts',id]),60*1000/180);
        },
        balance : function(id) {
            return reqToStream(get,toUrl(['accounts',id,'balances']),60*1000/180);
        },
        history : function(id,range,transactions) {
            var payload = {
                range : range,
                transactions : transactions
            };
            return reqToStream(get,toUrl(['accounts',id,'history'],payload),60*1000/180);
        },
        holdings : function(id) {
            return reqToStream(get,toUrl(['accounts',id,'holdings']),60*1000/180);
        }
    },
    //Market Calls
    market : {
        clock : function() {
          return reqToStream(get,toUrl(['market','clock']),60*1000/60);
        },
        quotes : function(symbols) {
            var tickers = {
                symbols : symbols
            };
            return reqToStream(get,toUrl(['market/ext/quotes'],tickers),60*1000/60);
        },
        historical : function(symbols, interval, startdate, enddate) {
            var payload = {
                startdate : startdate,
                enddate : enddate,
                symbols : symbols,
                interval : interval
            };
            return reqToStream(get,toUrl(['market','historical','search'],payload),60*1000/60);
        },
        search : function(keywords, startdate, enddate, symbols, maxhits) {
            if (_.isEmpty(maxhits)) {
                maxhits = 10;
            }
            if (_.isEmpty(symbols)) {
                symbols = {};
            }
            var payload = {
                keywords : keywords,
                startdate : startdate,
                enddate : enddate,
                symbols : symbols,
                maxhits : maxhits
            };
            return reqToStream(get,toUrl(['market','news','search'],payload),60*1000/60);
        },
        article : function(id) {
            return reqToStream(get,toUrl(['market','news',id]),60*1000/60);
        }
    },
    utility : {
        status : function() {
            return reqToStream(get,toUrl(['utility','status']),60*1000/180);
        },
        version : function() {
            return reqToStream(get,toUrl(['utility','version']),60*1000/180);
        }
    },
    member : {
        profile : function() {
            return reqToStream(get,toUrl(['member','profile']),60*1000/180);
        }
    },
    orders : {
      buyEquity : function(accountNumber,symbol,quantity) {
        var fixml = '<FIXML xmlns="http://www.fixprotocol.org/FIXML-5-0-SP2">' +
		    '<Order TmInForce="0" Typ="1" Side="1" Acct="' + accountNumber + '">' +
			'<Instrmt SecTyp="CS" Sym="' + symbol + '"/>'+
            '<OrdQty Qty="' + quantity + '"/>'+
		    '</Order></FIXML>';
        return Rx.Observable.fromCallback(post)(toUrl(['accounts',accountNumber,'orders']),60*10000/20);
      },
      sellEquity : function(accountNumber,symbol,quantity) {
          var fixml = '<FIXML xmlns="http://www.fixprotocol.org/FIXML-5-0-SP2">' +
			    '<Order TmInForce="0" Typ="1" Side="2" Acct="' + accountNumber + '">' +
  			'<Instrmt SecTyp="CS" Sym="' + symbol + '"/>'+
              '<OrdQty Qty="' + quantity + '"/>'+
			    '</Order></FIXML>';
          return Rx.Observable.fromCallback(post)(toUrl(['accounts',accountNumber,'orders']),60*1000/20);
      }
    },
    watchlists : {

    },
};
