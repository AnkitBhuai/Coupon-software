
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    DOB: {
        type: Date,
        required: true
    },
    aadhar_number: {
        type: String,
        required: true,
        unique: true
    },
    admission_number: { // Ensure this matches your form field
        type: String,
        required: true,
        unique: true
    }
});

module.exports = mongoose.model('User', userSchema);