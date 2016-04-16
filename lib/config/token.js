//token.js

var assert = require('assert');
var restify = require('restify');

var config = require('../config/config.json');

// Creates a REST client talking JSON to tokenmaster
var restClient = restify.createJsonClient({
  url: config.rest_token.url
});

// INTERNAL methods 


//EXPOSED Methods 

var API_TOKEN = null;

//logging in to the profiles microservice
function requestAPIToken(credentials){

    restClient.post('/authenticate', credentials, function(resterr, restreq, restres, restobj) {
      //check if error
      if(resterr){
        assert.ifError(resterr);
      }

      console.log('response token and other: \n %j \n', restobj); 

      API_TOKEN = restobj.token;
      exports.API_TOKEN = API_TOKEN;

    });
};

//Expose stuff
exports.requestAPIToken = requestAPIToken;