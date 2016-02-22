//PREAMBLE STUFF
var assert = require('assert');
var ldap = require('./config/ldap.js');
var mail = require('./config/mail.js');

var log = require('./config/logger');

var config = require('./config/config.json');
var jwt    = require('jsonwebtoken');

var ldap_top_dn = 'o=aegee, c=eu';//TODO what to do with it? where to put?


ldap.bindSuper();


//API DEFINITION

//v0.0.6 middleware
exports.verifyToken = function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.params.token || req.query.token || req.headers['x-access-token'];

  if (token) {

    jwt.verify(token, config.secret, function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        req.decoded = decoded;    
        next();
      }
    });

  } else {
    // return error if no token
    return res.send(403, { success: false, message: 'No token provided.' });
  }
};

//v0.0.6
exports.authenticate = function(req, res, next) {

  var uid = req.params.username;
  var password = req.params.password;
  
  log.info(uid, 'User is requesting a token');

  // find the user  
  ldap.bindUser('uid='+uid+',ou=services,o=aegee,c=eu', password, function(err) {
    if(err){
      log.info({err: err}, 'LDAP service binding');
      return res.json({ success: false, message: 'Authentication failed. ' });
    }
    
    var searchDN = 'ou=services, ' + ldap_top_dn;
    var filter = '(uid='+uid+')';
    ldap.searchLDAP(filter, searchDN, res, generateToken)
  });

  //console.log("done2");
};

function createFilter(queryParam){
  //eg; users?name=fab&local=ljubljana -- NO! filter /antennae/lju/members?name=fab if you want that
  //eg; users?name=paul&memberSince=2013-1-2
  var filter = '';
  var fullFilter = "(&(objectClass=aegeePersonFab){{filter}})";
  if(queryParam['name']){
    filter += "(cn=*"+queryParam['name']+"*)";
  }
  if(queryParam['active']){
    if(queryParam['active'] === 'false'){
      //there are 3 types of non-active members
      filter += "(|(memberType=Suspended)(memberType=Expired)(memberType=Ancien))";
    }else{
      //same as above, but with "NOT" operator beforehand
      filter += "(!(|(memberType=Suspended)(memberType=Expired)(memberType=Ancien)))";
    }
  }
  if(queryParam['memberSince']){
    var inputDate = queryParam['memberSince'];
    //TODO: sanitize
    filter += "(memberSinceDate>="+inputDate+")";
  }
  if(queryParam['memberUntil']){
    var inputDate = queryParam['memberUntil'];
    //TODO: sanitize
    filter += "(memberUntilDate<="+inputDate+")";
  }

  return fullFilter.replace('{{filter}}', filter);
}

//v0.1.0 - remember to bump version numbers
exports.findAllUsers = function(req, res , next) {
    req.log.debug({req: req}, 'findAllUsers request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = createFilter(req.params);

    ldap.searchLDAP(filter, searchDN, res);
};

//v0.1.0 - remember to bump version numbers
exports.findUser = function(req, res , next) {
    req.log.debug({req: req}, 'findUser request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(&(uid=' + req.params.userId + ')(objectClass=aegeePersonFab))';

    ldap.searchLDAP(filter, searchDN, res);
};

//this finds the membership *of a person*
//v0.1.0 - remember to bump version numbers
exports.findMemberships = function(req, res , next) {
    req.log.debug({req: req}, 'findMemberships request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'uid=' + req.params.userId + ', ou=people, ' + ldap_top_dn;
    var filter = '(&(objectClass=aegeePersonMembership)!(memberType=Applicant))';

    ldap.searchLDAP(filter, searchDN, res);
};

//this finds the membership *of a person*
//v0.1.0 - remember to bump version numbers
exports.findApplicationsOfMember = function(req, res , next) {
    req.log.debug({req: req}, 'findApplicationsOfMember request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'uid=' + req.params.userId + ', ou=people, ' + ldap_top_dn;
    var filter = '(&(objectClass=aegeePersonMembership)(memberType=Applicant))';

    ldap.searchLDAP(filter, searchDN, res);
};

//this finds the applications *to a body*
//v0.1.0 - remember to bump version numbers
exports.findApplications = function(req, res , next) { //cannot do "find all applications" method because of API call routes
    req.log.debug({req: req}, 'findApplications request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(&(&(objectClass=aegeePersonMembership)(memberType=Applicant))(bodyCode=' + req.params.bodyCode + '))';

    ldap.searchLDAP(filter, searchDN, res);
};

//this finds the members *of a body*
//v0.1.0 - remember to bump version numbers
exports.findMembers = function(req, res , next) { //cannot do "find all applications" method because of API call routes
    req.log.debug({req: req}, 'findMembers request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(&(&(objectClass=aegeePersonMembership)(memberType=Member))(bodyCode=' + req.params.bodyCode + '))';

    ldap.searchLDAP(filter, searchDN, res);
};

//v0.1.0 - remember to bump version numbers
exports.findAllAntennae = function(req, res , next) {
    req.log.debug({req: req}, 'findAllAntennae request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=bodies, ' + ldap_top_dn;
    var filter = '(&(objectClass=aegeeBodyFab)(bodyCategory=Local))';

    ldap.searchLDAP(filter, searchDN, res);
};

//v0.1.0 - remember to bump version numbers
exports.findAntenna = function(req, res , next) {
    req.log.debug({req: req}, 'findAntenna request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=bodies, ' + ldap_top_dn;
    var filter = '(&(bodyCode=' + req.params.bodyCode + ')(objectClass=aegeeBodyFab))';

    ldap.searchLDAP(filter, searchDN, res);
};

//v0.0.6 - remember to bump version numbers
exports.createUser = function(req, res , next) {
    req.log.debug({req: req}, 'createUser request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'ou=people, ' + ldap_top_dn;

    var entry = {
      sn: req.params.sn,
      givenName: req.params.givenName,
      cn: req.params.cn,
      uid: req.params.givenName + '.' + req.params.sn, //TODO: check clashes between existing UIDs  (#2)
      mail: req.params.mail,
      userPassword: req.params.userPassword,
      birthDate: req.params.birthDate,
      objectclass: 'aegeePersonFab'
    };

    //TODO: add a voice "date registered" to see "effectively" how long one is member of aegee

    ldap.addEntry(entry, 'uid=' + entry.uid + ',' + baseDN);    

    res.send(201, entry);

    //TRIGGER: apply to body registered with
};

//v0.0.6 - remember to bump version numbers
exports.createAntenna = function(req, res , next) {
    req.log.debug({req: req}, 'createAntenna request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'ou=bodies, ' + ldap_top_dn;

    var entry = {
      bodyCategory: req.params.bodyCategory,
      bodyCode: req.params.bodyCode, //TODO: check clashes between existing UIDs
      bodyNameAscii: req.params.bodyNameAscii,
      mail: req.params.mail,
      supervisor: req.params.netcom,
      bodyStatus: 'C',                //if newly created, automatically is Contact
      objectclass: 'aegeeBodyFab'
    };


    ldap.addEntry('bodyCode=' + entry.bodyCode + ',' + baseDN, entry);

    res.send(201, entry);

    //TRIGGER: create local groups (e.g. board) entries

};

//v0.0.6 - remember to bump version numbers
exports.createApplication = function(req, res , next) { 
    req.log.debug({req: req}, 'createApplication request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'uid=' + req.params.userId + ', ou=people, ' + ldap_top_dn;

    //TODO: check if UID already existing

    var entry = {
      bodyCategory: req.params.bodyCategory,
      bodyCode: req.params.bodyCode, //TODO: check clashes between existing UIDs (#2)
      bodyNameAscii: req.params.bodyNameAscii,
      mail: req.params.mail,
      uid: req.params.uid,
      cn: req.params.cn,
      memberSinceDate: req.params.memberSinceDate,
      memberUntilDate: req.params.memberUntilDate,
      memberType: 'Applicant',
      objectclass: 'aegeePersonMembership'
    };

    ldap.addEntry('bodyCode=' + entry.bodyCode + ',' + baseDN, entry);

    res.send(201, entry);

    //TRIGGER: send email to board of applied body

};

//v0.0.8 - remember to bump version numbers
exports.modifyMembership = function(req, res , next) {
    req.log.debug({req: req}, 'modifyMembership request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'bodyCode=' + req.params.bodyCode + ',uid=' + req.params.userId + ', ou=people, ' + ldap_top_dn;
    var searchDN = 'uid=' + req.params.userId + ',ou=people, ' + ldap_top_dn;
    var filter = '(&(bodyCode=' + req.params.bodyCode + ')(objectClass=aegeePersonMembership))';

    ldap.modifyMembership(baseDN, req.params.memberType, function(filter, searchDN, res) {
      
      ldap.searchLDAP(filter,searchDN,res, function(res, data){
                  
                  //send mail accordingly
                  var mailmessage = {
                     to:      data[0].cn+" <"+data[0].mail+">",
                     subject: "Your membership has changed",
                     text:    "Hi "+data[0].cn+", \n your membership has changed to "+data[0].memberType
                  };
                  mail.sendMail(mailmessage);

                  //send a response
                  res.send(200,data);
                });
    }(filter,searchDN,res) ); //FIXME: The function is called twice, probably: once after declared and once invoked

    //TODO: membership should begin from acceptance date, not from application date (maybe)
    //
    //if changed to "suspended", the system won't remember what was before that
    
};


//HELPER or INTERNAL METHODS


//v0.1.0
function generateToken(res, user){ 

  user = user[0]; //The query always returns an array

  var token = jwt.sign(user, config.secret);

  //after all is well, before returning the token 
  // re-bind with privileged user
  ldap.bindSuper(function(err) { 
      log.info({err: err}, 'LDAP client binding SU after generating token');
      assert.ifError(err);

      // return the information including token as JSON
      res.json({
        success: true,
        message: 'Enjoy your token!',
        token: token    
      });
    });

};

