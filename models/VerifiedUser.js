
const mongoose = require('mongoose');

const verifySchema = new mongoose.Schema({
    registration_number: {
        type: String,
        required: true
    },
    password: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('verify', verifySchema);