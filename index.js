const express = require('express');
const app = express();
const cors = require("cors");
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
//middleware
app.use(express.json());
app.use(cors());
//jwt verify function 
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true, message:"Unauthorized"});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token,process.env.JWT_TOKEN,(err,decoded)=>{
    if(err){
      return res.status(403).send({error:true, message:"Something went wrong"})
    }
    req.decoded = decoded;
    next();
  })
}
//mongodb code
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.inzz8jh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const InstructorCollection = client.db('MusicyDb').collection('Instructors')
    const ClassCollection = client.db('MusicyDb').collection('Class')
    const UserCollection = client.db('MusicyDb').collection('users')
    const SelectedClass = client.db('MusicyDb').collection('selectedClass')
    //verify isAdmin midleware
    const verifyAdmin = async (req,res,next) => {
      const decodedEmail = req.decoded.email;
      const query = {email: decodedEmail}
      const user = await UserCollection.findOne(query)
      if(user?.role !== 'admin'){
        res.status(403).send({error:true, message:"Foirbidden Access"})
      }
      next()
    }
    //jwt token access
    app.post('/jwt',(req,res) => {
      const user = req.body;
      const token = jwt.sign(user,process.env.JWT_TOKEN,{expiresIn:'1h'})
      res.send(token);
    })

    //users data save database
    app.get('/users',verifyJwt,verifyAdmin,async(req,res)=>{
      const result = await UserCollection.find().toArray();
      res.send(result);
    })
    app.put('/users/:email',async(req,res)=>{
      const email = req.params.email;
      console.log(email);
      const userInfo = req.body;
      const query = {email:email}
      const options = {upsert:true}
      const updateDoc = {
        $set:userInfo
      }
      const result = await UserCollection.updateOne(query,updateDoc,options)
      res.send(result)
    })
    //admin related api
    app.patch('/admin/:id',async(req,res)=>{
      const id = req.params.id
      const query = {_id:new ObjectId(id)}
      const updateDoc = {
        $set:{
          role:"admin",
        }
      }
      const result = await UserCollection.updateOne(query,updateDoc)
      res.send(result)

    })
    app.get('/admin/:email',verifyJwt,async(req,res)=>{
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if(email!==decodedEmail){
        res.send({admin:false})
      }
      const query = {email:email};
      const user = await UserCollection.findOne(query);
      const result = {admin:user?.role==='admin'}
      res.send(result)
    })
    app.patch('/instructor/:id',async(req,res)=>{
      const id = req.params.id;
      console.log(id);
      const query = {_id:new ObjectId(id)};
      const updateDoc = {
        $set:{
          role:"instructor",
        }
      }
      const result = await UserCollection.updateOne(query,updateDoc)
      res.send(result)
      
    })
    app.get('/instructor/:email',verifyJwt,async(req,res)=>{
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if(email!==decodedEmail){
        res.send({instructor:false})
      }
      const query = {email:email};
      const user = await UserCollection.findOne(query);
      const result = {instructor:user?.role==='instructor'}
      res.send(result)
    })
    //instructors related api
    app.get('/instructors',verifyJwt,async(req,res) => {
        const result = await InstructorCollection.find().toArray();
        res.send(result);
    })
    //Class collection
    app.post('/instructor/addClass',async(req,res) => {
      const classData = req.body;
      const result = await ClassCollection.insertOne(classData);
      res.send(result);
    })
    app.get('/instructor/myClass/:email',async(req,res) => {
      const email = req.params.email;
      const query = {instructorEmail: email};
      const result = await ClassCollection.find(query).toArray();
      res.send(result);
    })
    //update manageUsers role
    app.patch('/manageUsersRole/:id',async(req,res) =>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const options = {upsert:true};
      const updataDoc = {
        $set:{
          status:"approved"
        }
      }
      const result = await ClassCollection.updateOne(query,updataDoc,options);
      res.send(result)
    })
    app.patch('/manageUsersRoleDeny/:id',async(req,res) =>{
      const id = req.params.id;
      console.log(id);
      const query = {_id:new ObjectId(id)};
      const options = {upsert:true};
      const updataDoc = {
        $set:{
          status:"deny"
        }
      }
      const result = await ClassCollection.updateOne(query,updataDoc,options);
      res.send(result)
    })
    app.get('/class',verifyJwt,verifyAdmin,async(req,res)=>{
      const result = await ClassCollection.find().toArray()
      res.send(result)
    })
    //classCollection
    app.get('/approvedClass',verifyJwt,async(req,res)=>{
      const query = {status:'approved'}
      const result = await ClassCollection.find(query).toArray();
      res.send(result)
    })
    /************** Student dashboard APi ***************************/
    app.post('/selectedClass',async(req,res)=>{
      const user = req.body;
      const result = await SelectedClass.insertOne(user);
      res.send(result);
    })
    app.get('/selectedClass/:email', async(req, res)=>{
      const email = req.params.email
      console.log(email);
      const query = {instructorEmail:email};
      const result = await SelectedClass.find(query).toArray();
      res.send(result);
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send(`Welcome to our application`);
  });
  app.listen(port, () => {
    console.log(`server listening on${port}`);
  });
  