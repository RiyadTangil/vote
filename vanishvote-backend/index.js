const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5001;

// In-memory database as fallback
let inMemoryPolls = [];
let inMemoryVotes = [];
let inMemoryComments = [];
let isUsingInMemoryDB = false;

// MongoDB connection
const uri = "mongodb+srv://fund:Ri11559988@cluster0.oq5xc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
let db;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected to MongoDB Atlas!");
    
    // Get the database
    db = client.db("vote");
    isUsingInMemoryDB = false;
    
    // Create collections if they don't exist
    if (!(await db.listCollections({ name: "polls" }).hasNext())) {
      await db.createCollection("polls");
    }
    if (!(await db.listCollections({ name: "votes" }).hasNext())) {
      await db.createCollection("votes");
    }
    if (!(await db.listCollections({ name: "comments" }).hasNext())) {
      await db.createCollection("comments");
    }
  } catch (err) {
    console.error("Could not connect to MongoDB", err);
    console.log("Falling back to in-memory database. Data will not persist after server restart.");
    isUsingInMemoryDB = true;
  }
}

// Connect to MongoDB
connectToMongoDB();

// Middleware
app.use(cors());
app.use(express.json());

// Create a new poll
app.post('/polls', async (req, res) => {
  try {
    const { question, options, expirationTime, isPrivate, hideResults } = req.body;
    
    // Initialize results array with zeros for each option
    const results = new Array(options.length).fill(0);
    
    if (isUsingInMemoryDB) {
      // Use in-memory database
      const poll = {
        _id: Date.now().toString(),
        question,
        options,
        expirationTime,
        isPrivate,
        hideResults: hideResults || false,
        results,
        trending: false,
        likes: 0,
        createdAt: new Date()
      };
      
      inMemoryPolls.push(poll);
      res.status(201).json(poll);
    } else {
      // Use MongoDB
      const poll = {
        question,
        options,
        expirationTime,
        isPrivate,
        hideResults: hideResults || false,
        results,
        trending: false,
        likes: 0,
        createdAt: new Date()
      };
      
      const result = await db.collection("polls").insertOne(poll);
      poll._id = result.insertedId;
      res.status(201).json(poll);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch poll details and results
app.get('/polls/:id', async (req, res) => {
  try {
    if (isUsingInMemoryDB) {
      // Use in-memory database
      const poll = inMemoryPolls.find(p => p._id === req.params.id);
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      // Check if poll has expired
      const hasExpired = new Date(poll.expirationTime) < new Date();
      
      // If poll is private and has expired, don't return it
      if (poll.isPrivate && hasExpired) {
        return res.status(404).json({ error: 'Poll has expired' });
      }
      
      // Get comments for this poll
      const comments = inMemoryComments
        .filter(c => c.pollId === poll._id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Return poll with comments
      res.json({
        ...poll,
        comments,
        hasExpired
      });
    } else {
      // Use MongoDB
      let pollId;
      try {
        pollId = new ObjectId(req.params.id);
      } catch (error) {
        return res.status(404).json({ error: 'Invalid poll ID' });
      }
      
      const poll = await db.collection("polls").findOne({ _id: pollId });
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      // Check if poll has expired
      const hasExpired = new Date(poll.expirationTime) < new Date();
      
      // If poll is private and has expired, don't return it
      if (poll.isPrivate && hasExpired) {
        return res.status(404).json({ error: 'Poll has expired' });
      }
      
      // Get comments for this poll
      const comments = await db.collection("comments")
        .find({ pollId: pollId })
        .sort({ createdAt: -1 })
        .toArray();
      
      // Return poll with comments
      res.json({
        ...poll,
        comments,
        hasExpired
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Submit a vote
app.post('/polls/:id/vote', async (req, res) => {
  try {
    const { option } = req.body;
    
    if (isUsingInMemoryDB) {
      // Use in-memory database
      const poll = inMemoryPolls.find(p => p._id === req.params.id);
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      // Check if poll has expired
      if (new Date(poll.expirationTime) < new Date()) {
        return res.status(400).json({ error: 'Poll has expired' });
      }
      
      const vote = {
        _id: Date.now().toString(),
        pollId: poll._id,
        option,
        createdAt: new Date()
      };
      
      inMemoryVotes.push(vote);
      
      // Find the index of the option and increment the result
      const optionIndex = poll.options.indexOf(option);
      if (optionIndex !== -1) {
        poll.results[optionIndex] += 1;
      }
      
      // Update trending status based on vote count
      const totalVotes = poll.results.reduce((sum, count) => sum + count, 0);
      if (totalVotes > 5) {
        poll.trending = true;
      }
      
      res.status(201).json(vote);
    } else {
      // Use MongoDB
      let pollId;
      try {
        pollId = new ObjectId(req.params.id);
      } catch (error) {
        return res.status(404).json({ error: 'Invalid poll ID' });
      }
      
      const poll = await db.collection("polls").findOne({ _id: pollId });
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      // Check if poll has expired
      if (new Date(poll.expirationTime) < new Date()) {
        return res.status(400).json({ error: 'Poll has expired' });
      }
      
      const vote = {
        pollId: pollId,
        option,
        createdAt: new Date()
      };
      
      const result = await db.collection("votes").insertOne(vote);
      vote._id = result.insertedId;
      
      // Find the index of the option and increment the result
      const optionIndex = poll.options.indexOf(option);
      if (optionIndex !== -1) {
        poll.results[optionIndex] += 1;
      }
      
      // Update trending status based on vote count
      const totalVotes = poll.results.reduce((sum, count) => sum + count, 0);
      if (totalVotes > 5) {
        poll.trending = true;
      }
      
      await db.collection("polls").updateOne(
        { _id: pollId },
        { $set: { results: poll.results, trending: poll.trending } }
      );
      
      res.status(201).json(vote);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add a comment to a poll
app.post('/polls/:id/comments', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (isUsingInMemoryDB) {
      // Use in-memory database
      const poll = inMemoryPolls.find(p => p._id === req.params.id);
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      // Check if poll has expired
      if (new Date(poll.expirationTime) < new Date()) {
        return res.status(400).json({ error: 'Poll has expired' });
      }
      
      const comment = {
        _id: Date.now().toString(),
        pollId: poll._id,
        text,
        createdAt: new Date()
      };
      
      inMemoryComments.push(comment);
      res.status(201).json(comment);
    } else {
      // Use MongoDB
      let pollId;
      try {
        pollId = new ObjectId(req.params.id);
      } catch (error) {
        return res.status(404).json({ error: 'Invalid poll ID' });
      }
      
      const poll = await db.collection("polls").findOne({ _id: pollId });
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      // Check if poll has expired
      if (new Date(poll.expirationTime) < new Date()) {
        return res.status(400).json({ error: 'Poll has expired' });
      }
      
      const comment = {
        pollId: pollId,
        text,
        createdAt: new Date()
      };
      
      const result = await db.collection("comments").insertOne(comment);
      comment._id = result.insertedId;
      
      res.status(201).json(comment);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Like a poll
app.post('/polls/:id/like', async (req, res) => {
  try {
    if (isUsingInMemoryDB) {
      // Use in-memory database
      const poll = inMemoryPolls.find(p => p._id === req.params.id);
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      poll.likes += 1;
      res.status(200).json({ likes: poll.likes });
    } else {
      // Use MongoDB
      let pollId;
      try {
        pollId = new ObjectId(req.params.id);
      } catch (error) {
        return res.status(404).json({ error: 'Invalid poll ID' });
      }
      
      const result = await db.collection("polls").findOneAndUpdate(
        { _id: pollId },
        { $inc: { likes: 1 } },
        { returnDocument: 'after' }
      );
      
      if (!result.value) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      res.status(200).json({ likes: result.value.likes });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get trending polls
app.get('/trending', async (req, res) => {
  try {
    if (isUsingInMemoryDB) {
      // Use in-memory database
      const trendingPolls = inMemoryPolls.filter(p => p.trending && !p.isPrivate);
      res.json(trendingPolls);
    } else {
      // Use MongoDB
      const trendingPolls = await db.collection("polls")
        .find({ trending: true, isPrivate: false })
        .toArray();
      
      res.json(trendingPolls);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
