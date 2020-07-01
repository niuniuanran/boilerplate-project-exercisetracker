const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useNewUrlParser: true, useUnifiedTopology: true } )

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: {type: String, required: true}
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  userId: {type: String, required: true, unique: true},
  description:{type:String, default:""},
  duration:{type: Number, default:30},
  date:{type:Date, default: new Date()}
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req, res, next)=>{
  const username = req.body.username;
  User.findOne({"username":username}, (err, result)=>{
    if(err) next(err);
    if(!result) {
      new User({"username":username}).save((error, {_id})=>{
        if(error) next(err);
        else res.json({"username":username, "_id":_id})
      })
    }
    if(result) res.send("Username already taken!")
  })

})

app.get("/api/exercise/log", (req,res)=>{
  res.json({"query":req.query})
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
      .send(errMessage)
})




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
