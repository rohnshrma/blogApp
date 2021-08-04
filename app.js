require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require('mongoose');

// authentication & encryption (modules to be required)
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose");
const passportLocal = require("passport-local")
const session = require("express-session")
// ===================================================
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(express.static("public"));

// express-session

app.use(session({
    // secret: process.env.SECRET,
    secret: "helloworld",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ============================================ mongoose setup
mongoose.connect("mongodb+srv://Admin-Rohan:"+ process.env.ADMIN_PASS +"@cluster0.2vxj1.mongodb.net/blogUserDB",{ useNewUrlParser: true ,useUnifiedTopology:true});
// avoid warning caused by PLM
mongoose.set("useCreateIndex",true)

// mongoose schema
const blogUserSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String
});

// adding PLM plugin to the blogUserSchema
blogUserSchema.plugin(passportLocalMongoose);
blogUserSchema.plugin(findOrCreate);

const User = mongoose.model("User",blogUserSchema);

passport.use(User.createStrategy());
// passport serializer and deserializer

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

// ============================================================
passport.use(new GoogleStrategy({
  clientID: process.env.G_CLIENT_ID,
  clientSecret: process.env.G_CLIENT_SECRET,
  callbackURL: "https://problogsapp.herokuapp.com/auth/google/compose"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
// =============================================ROUTES
// HOME ROUTE
app.route("/")
.get((req,res)=>{
    res.render("home");
});
// ==========
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/compose', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect compose.
    res.redirect('/compose');
  });

// COMPOSE ROUTE
app.route("/compose")
.get((req,res)=>{
    if(req.isAuthenticated()){
        res.render("compose")
      }else{
        res.redirect("/login")
      }
})
.post((req,res)=>{

});
// ==============

// REGISTER ROUTE
app.route("/register")
.get((req,res)=>{
    res.render("register");
})
.post((req,res)=>{
    User.register({username:req.body.username},req.body.password,(err,user)=>{
        if(err){
          console.log(err);
          res.redirect("/register")
        }else{
          passport.authenticate("local")(req,res,()=>{
            res.redirect("/compose")
          })
        }
      })
});
// ==============

// LOGIN ROUTE
app.route("/login")
.get((req,res)=>{
    res.render("login");
})
.post((req,res)=>{
    const user =  new User({
        username: req.body.username,
        password: req.body.password
      })

      req.login(user,(err)=>{
      if(err){
        console.log(err)
        res.redirect("/login")
      }else{
        passport.authenticate("local")(req,res,()=>{
          res.redirect("/compose")
        })
      }
      })

});
// ==============

// LOGOUT ROUTE
app.route("/logout")
.get((req,res)=>{
    req.logout();
    res.redirect("/login")
});
// ============

// ===================================================

app.listen(process.env.PORT || 3000,()=>{
    console.log("server started on port : 3000");
});

