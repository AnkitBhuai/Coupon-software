const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set the views directory and view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Check for environment variables
if (!process.env.MONGODB_URI || !process.env.VERIFICATION_DB_URI || !process.env.PORT) {
    console.error("Missing required environment variables. Please check .env file.");
    process.exit(1);
}

// Connect to main MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    poolSize: 5,
}).then(() => console.log('Connected to main MongoDB'))
  .catch(err => {
      console.error('Failed to connect to main MongoDB:', err);
      process.exit(1);
  });

// Connect to verification MongoDB
to verification MongoDB
const verificationConnection = mongoose.createConnection(process.env.VERIFICATION_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    poolSize: 5,
});

verificationConnection.once('open', () => {
    console.log('Connected to verification MongoDB');
});

verificationConnection.on('error', (err) => {
    console.error('Failed to connect to verification MongoDB:', err);
});

// User schema and model
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    DOB: { type: Date, required: true },
    aadhar_number: { type: String, required: true },
    admission_number: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

// Verification user schema and model
const VerifyUserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
});
const VerifyUser = verificationConnection.model('Verify', VerifyUserSchema);

// Route for the main page
app.get('/', (req, res) => {
    res.render('index');
});

// POST route to save user data to main MongoDB
app.post('/', async (req, res) => {
    const { name, DOB, aadhar_number, admission_number } = req.body;

    if (!name || !DOB || !aadhar_number || !admission_number) {
        return res.status(400).render('index', { message: 'All fields are required', error: true });
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
        res.status(500).render('index', { message: 'An error occurred while saving data', error: true });
    }
});

// Route for verification page
app.get('/verify', (req, res) => {
    res.render('verify');
});

// POST route for user verification
app.post('/verify', async (req, res) => {
    const { admission_number: username, password } = req.body;

    if (!password) {
        return res.status(400).send('Password is required');
    }

    try {
        const foundUser = await VerifyUser.findOne({ username });

        if (foundUser) {
            const isMatch = await bcrypt.compare(password, foundUser.password);
            if (isMatch) {
                await VerifyUser.deleteOne({ username });
                console.log(`User '${username}' deleted from the verification database`);
                res.redirect('/dashboard');
            } else {
                res.status(401).send('Incorrect username or password!');
            }
        } else {
            res.status(404).send('User not found or incorrect details');
        }
    } catch (err) {
        console.error('Error during verification:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// Route for the dashboard page
app.get('/dashboard', (req, res) => {
    res.render('lucky');
});

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
