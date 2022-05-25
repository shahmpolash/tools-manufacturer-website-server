const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.t8opn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
  }

async function run() {

    try {
        await client.connect();
        const itemCollection = client.db('powerTool').collection('item');
        const userCollection = client.db('powerTool').collection('user');
        const orderCollection = client.db('powerTool').collection('order');
        const reviewCollection = client.db('powerTool').collection('review');

        app.get('/item', async (req, res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

        app.get('/item/:id', async(req, res) =>{
            const id = req.params.id;
            const query ={_id: ObjectId(id)};
            const item = await itemCollection.findOne(query);
            res.send(item);
        });

        app.post('/item', async(req, res) =>{
            const newItem = req.body;
            const result = await itemCollection.insertOne(newItem);
            res.send(result);
        });

      

        app.delete('/item/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await itemCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/user', verifyJWT,  async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);

        });

        app.get('/admin/:email', async(req, res)=>{
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin})
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester =  req.decoded.email;
            const requesterAccount = await userCollection.findOne({email: requester});
            if(requesterAccount.role === 'admin'){
                const filter = { email: email };
                const updateDoc = {
                  $set: {role: 'admin'},
                };
            }
            else{
                res.status(403).send({message: 'forbidden'});
            }
           
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
          });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
            res.send({ result, token });
          });

        app.get('/order', verifyJWT, async(req, res) => {
            const email = req.query.email;
            const authorization = req.headers.authorization;
            console.log('auth', authorization)
            const query = {email: email};
            const orders = await orderCollection.find(query).toArray();
            
            res.send(orders);
        });

        app.post('/order', async(req, res) =>{
            const neworder = req.body;
            const result = await orderCollection.insertOne(neworder);
            res.send(result);
        });

        app.get('/order/:id', verifyJWT, async(req,res) =>{
          const id =req.params.id;
          const query = {_id: ObjectId(id)};
          const order = await orderCollection.findOne(query);
          res.send(order);
        });

        app.get('/review', async(req, res)=>{
          const query = {};
          const cursor = reviewCollection.find(query);
          const reviews = await cursor.toArray();
          res.send(reviews);
        });

        app.post('/review', async(req, res) =>{
          const newReview = req.body;
          const result = await reviewCollection.insertOne(newReview);
          res.send(result);
      });

      
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server is Running');
});

app.listen(port, () => {
    console.log('Server is working', port);
})