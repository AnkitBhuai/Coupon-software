const express = require('express');
const path = require("path");
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');

const app = express();

// Set the default view engine to EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Connect to the main MongoDB for user data
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Adjusted connection pool size
  })
  .then(() => console.log('Connected to main MongoDB'))
  .catch((err) => console.error('Failed to connect to main MongoDB:', err));

// Connect to the verification MongoDB
const verificationConnection = mongoose.createConnection(process.env.VERIFICATION_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Adjusted connection pool size
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

// Define the main user model for user data
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  DOB: { type: Date, required: true },
  aadhar_number: { type: String, required: true },
  admission_number: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

// Define the schema and model for the verification database
const VerifyUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true }, // Password stored as plain text
});
const VerifyUser = verificationConnection.model('Verify', VerifyUserSchema);

// Route for initial access
app.get('/', (req, res) => {
  res.render('index', { message: null }); // Explicitly define `message` as null or an empty string
});

// POST route to save user data to main MongoDB
app.post('/', async (req, res) => {
  const { name, DOB, aadhar_number, admission_number } = req.body;

  if (!name || !DOB || !aadhar_number || !admission_number) {
    return res.status(400).render('index', {
      message: 'All fields are required',
      error: true,
    });
  }

  try {
    await User.create({
      name,
      DOB,
      aadhar_number,
      admission_number,
    });

    console.log('User data saved successfully');
    res.status(200).redirect('/verify');
  } catch (err) {
    console.error('Error saving user data:', err);
    res.status(500).render('index', {
      message: 'An error occurred while saving data',
      error: true,
    });
  }
});

// Route for verification
app.get('/verify', (req, res) => {
  res.render('verify');
});

// POST route to verify user and insert data into verification MongoDB
app.post('/verify', async (req, res) => {
  const { admission_number: submittedUsername, password } = req.body;

  if (!submittedUsername || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    // Search for the user in the verification database
    const foundUser = await VerifyUser.findOne({ username: submittedUsername });

    if (foundUser) {
      // Compare the provided password with the stored password
      if (password === foundUser.password) {
        // Delete the user document after successful verification
        await VerifyUser.deleteOne({ username: submittedUsername });

        console.log(`User '${submittedUsername}' deleted from the verification database`);
        res.redirect('/dashboard');
      } else {
        // If the password is incorrect
        console.log('Password mismatch');
        res.status(401).send('Incorrect username or password!');
      }
    } else {
      // If the user is not found
      console.log('User not found');
      res.status(404).send('User not found or incorrect details');
    }
  } catch (error) {
    console.error('Error during verification:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Route for dashboard
app.get('/dashboard', (req, res) => {
  res.render('lucky');
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
