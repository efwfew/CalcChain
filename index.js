var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var session = require("express-session");
var passport = require("./config/passport");
var mongo_db = "mongodb+srv://gkskanj:djfudnsqlalfqjsgh@cluster0-vb9pr.mongodb.net/test?retryWrites=true&w=majority"
var fs = require("fs")
var app = express();

// DB setting
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(mongo_db);
var db = mongoose.connection;
db.once("open", function(){
  console.log("DB connected");
});
db.on("error", function(err){
  console.log("DB ERROR : ", err);
});

// Other settings
app.set("view engine", "ejs");
app.use(express.static(__dirname+"/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(flash());

//session password
app.use(session({secret:"myopinion", resave: true, saveUninitialized: true}))

//passport setting
app.use(passport.initialize());
app.use(passport.session());

//custom middlewares - req.local contains below two things, params can be used to ejs
app.use(function(req, res, next){ 
  res.locals.isAuthenticated = req.isAuthenticated(); // login check; ture and false
  res.locals.currentUser = req.user; // pull user information
  next();
})

// Routes
app.use("/", require("./routes/home"));
app.use("/posts", require("./routes/posts"));
app.use("/users", require("./routes/users"));
app.use("/wallet", require("./routes/wallets"));
app.use("/uploads", require("./routes/uploads"));

// Port setting
var port = 3000
app.listen(port, function(){
  console.log("server on! http://localhost:"+port); //
});