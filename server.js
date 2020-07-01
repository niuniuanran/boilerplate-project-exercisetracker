const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, required: true, unique: true }
});
const User = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, default: "" },
  duration: { type: Number, default: 30 },
  date: { type: Date, default: new Date() }
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", (req, res, next) => {
  const username = req.body.username;
  User.findOne({ username: username }, (err, result) => {
    if (err) next(err);
    if (!result) {
      new User({ username: username }).save((error, { _id }) => {
        if (error) next(err);
        else res.json({ username: username, _id: _id });
      });
    }
    if (result) res.send("Username already taken!");
  });
});

app.post("/api/exercise/add", (req, res, next) => {
  const userId = req.body.userId || res.send("You need to enter a user Id!");
  const description =
      req.body.description ||
      res.send("You need to enter a exercise description");
  const duration =
      Number(req.body.duration) ||
      res.send("You need to enter a valid number for the duration of exercise!");
  let date = req.body.date && new Date(req.body.date);
  date = isNaN(date) ? new Date() : date;

  User.findById(userId, (error, user) => {
    if (error) res.json(error);
    if (!user) res.send("Invalid user id");
    else {
      const exercise = new Exercise({
        userId: userId,
        description: description,
        duration: duration,
        date: date
      });
      exercise.save((err, newExercise) => {
        if (err) res.json(err);
        else
          res.json({
            _id: userId,
            username: user.username,
            date: newExercise.date.toDateString(),
            duration: duration,
            description: description
          });
      });
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find(null, (err, users) => {
    if (err) res.json(err);
    else res.json(users);
  });
});

app.get("/api/exercise/log", (req, res) => {
  // {userId}[&from][&to][&limit]
  const userId =
      req.query.userId || res.send("Need a user Id to query exercise logs");
  User.findById(userId, (err, user) => {
    if (err) res.json(err);
    if (!user) res.json("Not a valid user id");
    else {
      let filter = { userId: userId };
      const from = new Date(req.query.from);
      const filteringFrom = from instanceof Date && !isNaN(from);
      if (filteringFrom) filter.date = { $gte: from };

      const to = new Date(req.query.to);
      const filteringTo = to instanceof Date && !isNaN(to);
      if (filteringTo) {
        if (filter.date) filter.date.$lte = to;
        else filter.date = { $lte: to };
      }

      const limit = Number(req.query.limit);
      let query = Exercise.find(filter);
      query = isNaN(limit) ? query:query.limit(limit);
      query.exec((error, exercises) => {
        if (error) res.json(error);
        else
          res.json({
            userId: userId,
            username: user.username,
            count: exercises.length,
            log: exercises
          });
      });
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
      .status(errCode)
      .type("txt")
      .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
