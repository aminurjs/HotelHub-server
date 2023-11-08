const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.port || 5000;

//MiddleWare
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sz2xe62.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const roomsCollection = client.db("hotelhub").collection("rooms");
const testimonialsCollection = client.db("hotelhub").collection("testimonials");
const bookingCollection = client.db("hotelhub").collection("booking");

// Data get functions
app.get("/api/v1/rooms", async (req, res) => {
  const rooms = await roomsCollection.find().toArray();
  res.send(rooms);
});
app.get("/api/v1/featured", async (req, res) => {
  const featured = await roomsCollection.find().skip(9).limit(3).toArray();
  res.send(featured);
});
app.get("/api/v1/testimonials", async (req, res) => {
  const testimonials = await testimonialsCollection.find().toArray();
  res.send(testimonials);
});
app.get("/api/v1/room/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const rooms = await roomsCollection.findOne(query);
  res.send(rooms);
});
app.get("/api/v1/booking/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const bookedRooms = await bookingCollection.find(query).toArray();
  res.send(bookedRooms);
});

// Data post functions
app.post("/api/v1/booking", async (req, res) => {
  const data = req.body;
  const result = await bookingCollection.insertOne(data);
  res.send(result);
});

// Data Delete functions
app.delete("/api/v1/booking/delete/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await bookingCollection.deleteOne(query);
  res.send(result);
});
// Data Update functions
app.patch("/api/v1/booking/updatedate/:id", async (req, res) => {
  const id = req.params.id;
  const newDate = req.body;
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };

  const updatedDate = {
    $set: {
      startDate: newDate.updatedStartDate,
      endDate: newDate.updatedEndDate,
      bookingDays: newDate.duration,
    },
  };
  const result = await bookingCollection.updateOne(query, updatedDate, options);
  res.send(result);
});
app.patch("/api/v1/review/:id", async (req, res) => {
  const id = req.params.id;
  const comment = req.body;
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const update = {
    $push: {
      reviews: comment,
    },
  };
  const result = await roomsCollection.updateOne(query, update, options);
  res.send(result);
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("HotelHub Server is running");
});

app.listen(port, () => {
  console.log(`Server running in the port: ${port}`);
});
