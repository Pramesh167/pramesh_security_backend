require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const fs = require('fs');
const https = require('https');

const app = require('./app');

const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri); // Add this line to verify the URI is being loaded

if (!uri) {
  console.error('MongoDB URI is not defined. Check your .env file.');
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Failed to connect to the database:', error.message);
    process.exit(1);
  });


const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`Server is running on port ${port}`));
