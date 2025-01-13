const express = require('express');
const mongoose = require('mongoose');
const Database = require('./database/database');
const dotenv = require('dotenv');
const cors = require('cors')
const fileUpload = require('express-fileupload');
const { options } = require('./routes/userRoutes');
const app = express();


const corsOptions ={
    origin : true,
    credentials : true,
    optionSuccessStatus : 200
 }

app.use(cors(corsOptions))


app.use(express.json())

app.use(fileUpload());

app.use(express.static('./public'));



dotenv.config()

Database()


const PORT = process.env.PORT;

app.get('/Robsell',(req,res)=>{
    res.send('Test API is Working!....')
}) 


app.use('/api/user', require('./routes/userRoutes'))



app.listen(PORT, ()=>{
    console.log(`Server is Running on port ${PORT} !`)
}) 


module.exports = app;

