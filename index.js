const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.port || 5000;

//MiddleWare
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://hotelhube.web.app",
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

// middlewares
//verify token and  access
const verifyToken = (req, res, next) => {
  const { token } = req.cookies;
  //if client does not send token
  if (!token) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }

  // verify a token
  jwt.verify(token, process.env.SECRETE, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access" });
    }
    // attach decoded user so that others can get it
    req.user = decoded;
    next();
  });
};

app.post("/api/v1/auth/access-token", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.SECRETE);
  res.send({ success: true, token });
});

// Data get functions
app.get("/api/v1/rooms", async (req, res) => {
  const bookings = await bookingCollection.find().toArray();

  const currentDate = new Date();

  bookings.forEach(async (booking) => {
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const query = { _id: new ObjectId(booking._id) };

    if (currentDate > endDate && booking.status !== "complete") {
      await bookingCollection.updateOne(query, { $set: { status: "complete" } });
      const query2 = { _id: new ObjectId(booking.id) };
      const updatedDate = {
        $set: {
          availability: true,
        },
      };
      await roomsCollection.updateOne(query2, updatedDate);
    } else if (currentDate > startDate && currentDate < endDate && booking.status === "pending") {
      await bookingCollection.updateOne(query, { $set: { status: "processing" } });
    }
  });

  const sortValue = parseInt(req.query.sort);
  if (sortValue) {
    const rooms = await roomsCollection.find().sort({ price: sortValue }).toArray();
    res.send(rooms);
  } else {
    const rooms = await roomsCollection.find().toArray();
    res.send(rooms);
  }
});
app.get("/api/v1/featured", async (req, res) => {
  const bookings = await bookingCollection.find().toArray();

  const currentDate = new Date();

  bookings.forEach(async (booking) => {
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const query = { _id: new ObjectId(booking._id) };

    if (currentDate > endDate && booking.status !== "complete") {
      await bookingCollection.updateOne(query, { $set: { status: "complete" } });
      const query2 = { _id: new ObjectId(booking.id) };
      const updatedDate = {
        $set: {
          availability: true,
        },
      };
      await roomsCollection.updateOne(query2, updatedDate);
    } else if (currentDate > startDate && currentDate < endDate && booking.status === "pending") {
      await bookingCollection.updateOne(query, { $set: { status: "processing" } });
    }
  });
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
app.get("/api/v1/booking/:email", verifyToken, async (req, res) => {
  const bookings = await bookingCollection.find().toArray();

  const currentDate = new Date();

  bookings.forEach(async (booking) => {
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const query = { _id: new ObjectId(booking._id) };

    if (currentDate > endDate && booking.status !== "complete") {
      await bookingCollection.updateOne(query, { $set: { status: "complete" } });
      const query2 = { _id: new ObjectId(booking.id) };
      const updatedDate = {
        $set: {
          availability: true,
        },
      };
      await roomsCollection.updateOne(query2, updatedDate);
    } else if (currentDate > startDate && currentDate < endDate && booking.status === "pending") {
      await bookingCollection.updateOne(query, { $set: { status: "processing" } });
    }
  });
  const userEmail = req.params.email;
  const tokenEmail = req.user.email;

  if (tokenEmail !== userEmail) {
    return res.status(403).send({ message: "Forbidden access" });
  }

  const query = { email: userEmail };
  const bookedRooms = await bookingCollection.find(query).toArray();
  res.send(bookedRooms);
});

// Data post functions
app.post("/api/v1/booking", async (req, res) => {
  const data = req.body;
  const result = await bookingCollection.insertOne(data);
  const query = { _id: new ObjectId(data.id) };
  const options = { upsert: true };
  const updatedDate = {
    $set: {
      availability: false,
    },
  };
  const result2 = await roomsCollection.updateOne(query, updatedDate, options);
  res.send({ result, result2 });
});

// Data Delete functions
app.delete("/api/v1/booking/delete/", async (req, res) => {
  const { _id, id, type, currentDate } = req.query;
  const find = { _id: new ObjectId(_id) };
  let result;
  if (type === "cancel") {
    result = await bookingCollection.updateOne(find, { $set: { status: "canceled" } });
  } else if (type === "checkout") {
    result = await bookingCollection.updateOne(find, {
      $set: { endDate: currentDate, status: "canceled" },
    });
  }

  const query = { _id: new ObjectId(id) };
  const updatedDate = {
    $set: {
      availability: true,
    },
  };
  const result2 = await roomsCollection.updateOne(query, updatedDate);
  res.send({ result, result2 });
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
    await client.connect();
    await client.db("admin").command({ ping: 1 });
  } catch (err) {
    console.log(err);
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("HotelHub Server is running");
});

app.listen(port, () => {
  console.log(`Server running in the port: ${port}`);
});
