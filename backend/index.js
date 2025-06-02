require("dotenv").config();
const config = require("./config.json");
const mongoose = require("mongoose");

// Use environment variable for MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || config.connectionString;
mongoose.connect(MONGODB_URI);

const User = require("./models/user.modal");
const Note = require("./models/note.modal");

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

app.use(express.json());

app.use(cors({ origin: "*" }));

// Set port
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.json({ data: "Hello Anand" });
});

// create Account

app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName) {
    return res
      .status(400)
      .json({ error: true, message: "Full Name id required" });
  }
  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }
  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Password is required" });
  }

  const isUser = await User.findOne({ email: email });

  if (isUser) {
    return res.json({ error: true, message: "User already exists" });
  }

  const user = new User({
    fullName,
    email,
    password
  });
  await user.save();

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m"
  });

  return res.json({
    error: false,
    user,
    message: "Regitration successfully",
    accessToken
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const userInfo = await User.findOne({ email: email });

  if (!userInfo) {
    return res.status(400).json({ message: "User not found" });
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo };

    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "36000m"
    });

    return res.json({
      error: false,
      message: "Login Sucessful",
      email,
      accessToken
    });
  } else {
    return res.status(400).json({
      error: true,
      message: "Invalid credentials"
    });
  }
});

app.get("/get-user", authenticateToken, async (req, res) => {
  const { user } = req.user;

  const isUser = await User.findOne({ _id: user._id });

  if (!isUser) {
    return res.status(401);
  }

  return res.json({
    user: {
      fullName: isUser.fullName,
      email: isUser.email,
      _id: isUser.id,
      createdOn: isUser.createdOn
    },
    message: ""
  });
});

app.post("/add-note", authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body;
  const { user } = req.user;

  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }

  try {
    const note = new Note({
      title,
      content,
      tags: tags || [],
      userId: user._id,
      createdOn: new Date()
    });
    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note Added Successfully"
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error"
    });
  }
});

app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { user } = req.user;
  const { title, content, tags, isPinned } = req.body;

  if (!title && !content && !tags) {
    return res
      .status(400)
      .json({ error: true, message: "No Changes provided." });
  }

  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found." });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note updated successfully."
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error." });
  }
});

app.get("/get-all-notes", authenticateToken, async (req, res) => {
  const { user } = req.user;

  try {
    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });
    return res.json({
      error: false,
      notes,
      message: "All notes received successfully"
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error" });
  }
});

app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
  const { user } = req.user;
  const noteId = req.params.noteId;

  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }

    await Note.deleteOne({ _id: noteId, userId: user._id });
    return res.json({ error: false, message: "Note Deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error" });
  }
});

app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { user } = req.user;
  const { isPinned } = req.body;

  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found." });
    }

    note.isPinned = isPinned || false;

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note updated successfully."
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error." });
  }
});

app.get("/search-notes/", authenticateToken, async (req, res) => {
  const { user } = req.user;
  const {query} = req.query;

  if(!query) return res.status(400).json({error:true,message:"Search query is required."});

  try{
    const matchingNotes = await Note.find({
      userId: user._id,
      $or:[
        {title:{$regex: new RegExp(query,"i")}},
        {content:{$regex: new RegExp(query,"i")}}
      ]
    })
    return res.json({
      error:false,
      notes:matchingNotes,
      message:"Note matching the search query retrieved successfully"
    })
  }catch(error){
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
