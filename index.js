import  express  from "express";
import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config'
import bodyParser from "body-parser";
import cros from "cors";
import bcrypt from "bcrypt";
import  jwt from "jsonwebtoken";
import { auth } from "./middleware/auth.js";
const app = express()
app.use(cros())
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL

async function createConnection(){
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("MONGO_CONNECTED");
    return client;
}
const client = await createConnection();

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

const userData = client.db("users").collection("details");

app.get("/",(req,res)=>{
    res.send("Hello World");
})

app.post("/login", async (req,res)=>{
    let data = req.body
    let emailid=data.email;
    let password = data.pass
    let userExist = await userData.findOne({"emailId":emailid});
    if(!userExist){
        return res.json({message:"Invalid mailId or Password"}).status(400)
    }

    try {
        const match = await bcrypt.compare(password.toString(), userExist.password);
        if(match){
            const token = jwt.sign({id:userExist._id},process.env.SECRET_KEY)
            return res.json({message:"login successfully",token:token, userId:userExist.userId, favItems:userExist.favItems}).status(200);
        }
        else{
            return res.json({message:"Invalid mailId or Password"}).status(400);
        }
    } catch (error) {
        return res.json({Error: "Error in comparison"}).status(500);
    }

})

app.post("/register", async (req,res) => {
    try{
        let data = req.body
        let emailid=data.email
        
        let userExist = await userData.findOne({"emailId":emailid})
        if(userExist){
            return res.json({error:"User already exits"}).status(400)
        }
        
        const date = Date.now().toString() 
        const hashPassword = async (password) => {
            return new Promise((resolve, reject) => {
                bcrypt.hash(password, 10, (err, hash) => {
                    if (err) reject(err);
                    resolve(hash);
                });
            });
        };
        
        const hashedPassword = await hashPassword(data.pass.toString());
        const dataToInsert = {
            "userId": date,
            "emailId": data.email,
            "password": hashedPassword,
            "favItems": []
        };

        let registerUser = await userData.insertOne(dataToInsert)
    
        res.status(200).json({message:"User Registered Successfully",userId:date})
    }catch(error){
        res.status(500).json({ error: "Internal Server Error" });
    } 
})
app.post("/setfav/:userId",async (req,res)=>{
    const userId = req.params.userId
    let data = req.body;
    let resp = await userData.updateOne({userId:userId},{$set:{favItems:data.favItems}});
    res.send("Favirate item saved").status(201);
})
app.get("/getfav/:userId", auth, async (req,res)=>{
    const userId = req.params.userId
    let resp = await userData.findOne({userId:userId});
    if(!resp){
        return res.send("NO Favirote item found").status(200);
    }
    return res.json(resp.favItems).status(200); 
})
app.listen(PORT,()=>{
    console.log("SERVER LISTENING ON ",PORT);
})