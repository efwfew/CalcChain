var express = require("express");
var router = express.Router();
var User = require("../models/user");
var util = require("../util");
var fs = require('fs')

// Index // 1
router.get("/", util.isLoggedin, function(req, res){
 User.find({})
 .sort({username:1})
 .exec(function(err, users){
  if(err) return res.json(err);
  res.render("users/index", {users:users});
 });
});

// New
router.get("/new", function(req, res){
    var user = req.flash("user")[0] || {};
    var errors = req.flash("errors")[0] || {};
    res.render("users/new", { user:user, errors:errors });
   });

// create
router.post("/", function(req, res){
    User.create(req.body, function(err, user){
     if(err){
      req.flash("user", req.body);
      req.flash("errors", util.parseError(err));
      return res.redirect("/users/new");
     }
    fs.mkdir(`uploads/${req.body.username}`, {recursive: true}, (err) => {
        if (err) throw err;
    });
     res.redirect("/login");
    });
   });

// show
router.get("/:username", util.isLoggedin, function(req, res){
 User.findOne({username:req.params.username}, function(err, user){
  if(err) return res.json(err);
  res.render("users/show", {user:user});
 });
});

// show account
router.get("/account/:username", util.isLoggedin, function(req, res){
    User.findOne({username:req.params.username}, function(err, user){
     if(err) return res.json(err);
     res.render("users/account", {user:user});
    });
   });



// managing privateKey
router.get("/privateKey/:username", util.isLoggedin, function(req, res){
    User.findOne({username:req.params.username}, function(err, user){
     if(err) return res.json(err);
     res.render("users/privateKey", {user:user});
    });
   });


// edit
router.get("/:username/edit", util.isLoggedin, checkPermission, function(req, res){
 var user = req.flash("user")[0];
 var errors = req.flash("errors")[0] || {};
 if(!user){
  User.findOne({username:req.params.username}, function(err, user){
   if(err) return res.json(err);
   res.render("users/edit", { username:req.params.username, user:user, errors:errors });
  });
 } else {
  res.render("users/edit", { username:req.params.username, user:user, errors:errors });
 }
});

// update // 2
router.put("/:username", util.isLoggedin, checkPermission, function(req, res, next){
    User.findOne({username:req.params.username})
    .select({password:1})
    .exec(function(err, user){
     if(err) return res.json(err);

  // update user object
  user.originalPassword = user.password;
  user.password = req.body.newPassword? req.body.newPassword : user.password; // 2-3
  for(var p in req.body){ // 2-4
   user[p] = req.body[p];
  }

  // save updated user
  user.save(function(err, user){
    if(err){
     req.flash("user", req.body);
     req.flash("errors", util.parseError(err));
     return res.redirect("/users/"+req.params.username+"/edit");
    }
    res.redirect("/users/"+user.username);  });
  });
});

module.exports = router;

//Functions
function parseError(errors){
    var parsed = {};
    if(errors.name == 'ValidationError'){
        for(var name in errors.errors){
            var validationError = errors.errors[name];
            parsed[name] = {message:validationError.message}}
    } else if(errors.code == "11000" && errors.errmsg.indexOf("username") > 0) {
        parsed.username = {message:"This username already exists!"};
    } else {
        parsed.unhandled = JSON.stringify(errors);
    }
    return parsed;
}

// private function 

function checkPermission(req, res, next){
    User.findOne({username:req.params.username}, function(err, user){
     if(err) return res.json(err);
     if(user.id != req.user.id) return util.noPermission(req, res);
   
     next();
    });
   }