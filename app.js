const express = require('express');
const path = require("path");
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const app = express();

// Set the default view engine to EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Connect to the main MongoDB for user data
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, // Adjust based on your load
     })
  .then(() => console.log('Connected to main MongoDB'))
  .catch((err) => console.error('Failed to connect to main MongoDB:', err));

// Connect to the verification MongoDB
const verificationConnection = mongoose.createConnection(process.env.VERIFICATION_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

verificationConnection.once('open', () => {
  console.log('Connected to verification MongoDB');
});

verificationConnection.on('error', (err) => {
  console.error('Failed to connect to verification MongoDB:', err);
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});


// Define the main user model for user data
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  DOB: { type: Date, required: true },
  aadhar_number: { type: String, required: true },
  admission_number: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Define the schema and model for the verification database
const verifyUserSchema = new mongoose.Schema({
  username: String,
  password: String
});
const VerifyUser = verificationConnection.model('Verify', verifyUserSchema);

// Route for initial access
app.get('/', (req, res) => {
  res.render('index');
});

// POST route to save user data to main MongoDB
app.post('/', (req, res) => {
  const { name, DOB, aadhar_number, admission_number } = req.body;

  if (!name || !DOB || !aadhar_number || !admission_number) {
    return res.status(400).render('index', { message: 'All fields are required', error: true });
  }

  // Save user data to main database
  User.create({
    name: name,
    DOB: DOB,
    aadhar_number: aadhar_number,
    admission_number: admission_number
  })
    .then(() => {
      console.log('User data saved successfully');
      res.status(200).redirect('/verify');
    })
    .catch((err) => {
      console.error('Error saving user data:', err);
      res.status(500).render('index', { message: 'An error occurred while saving data', error: true });
    });
});

// Route for verification
app.get('/verify', (req, res) => {
  res.render('verify');
});

// POST route to verify user and insert data into verification MongoDB
app.post('/verify', async (req, res) => {
    const { admission_number: submittedUsername, password } = req.body;

    if (!password) {
        return res.status(400).send('Password is required');
    }

    try {
        // Search for the user in the verification database using the renamed variable
        const foundUser = await VerifyUser.findOne({ username: submittedUsername });

        if (foundUser) {
            // Compare the provided password with the password stored in the database
            if (password === foundUser.password) {
                // If the password is correct, delete the user document
                await VerifyUser.deleteOne({ username: submittedUsername });

                console.log(`User '${submittedUsername}' deleted from the verification database`);

                // Redirect to the dashboard
                res.redirect('/dashboard');
            } else {
                // If password is incorrect
                res.status(401).send('Incorrect username or password!');
            }
        } else {
            // If user is not found
            res.status(404).send('User not found or incorrect details');
        }
    } catch (error) {
        console.error('Error during verification:', error.message);
        res.status(500).send('Internal Server Error');
    }

    console.log('Submitted username:', submittedUsername);
});


// Route for dashboard
app.get('/dashboard', (req, res) =>{
    res.render('lucky');
});

// Utility function to hash password before saving it to the database

// Insert sample user data to verification database with hashed passwords

// Start the server and initialize sample data
app.listen(process.env.PORT, function () {
  console.log(`Server is running on port ${process.env.PORT}`);
});
