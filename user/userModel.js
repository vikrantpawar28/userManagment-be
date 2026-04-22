const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,

  role: {
    type: String,
    enum: ['OWNER', 'ADMIN', 'USER'],
    default: 'USER'
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  balance: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);