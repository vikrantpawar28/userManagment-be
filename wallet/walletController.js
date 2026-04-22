const User = require('../user/userModel');
const Transaction = require('../transaction/transactionModel');

exports.transfer = async (req, res) => {
  try {
    const { receiverId, amount } = req.body;
    const senderId = req.user.id;

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ msg: 'Receiver not found' });
    }

    // Permission check:
    // User/Owner can credit to their NEXT-LEVEL users only.
    // Admin can credit to ANY user in the hierarchy (but deduction comes from parent).
    
    if (req.user.role === 'ADMIN') {
      // Admin credits receiver, deduction from receiver's immediate parent
      if (!receiver.parent) {
        return res.status(400).json({ msg: 'Receiver has no parent to deduct from' });
      }
      
      const parent = await User.findById(receiver.parent);
      if (parent.balance < amount) {
        return res.status(400).json({ msg: 'Parent has insufficient balance' });
      }
      
      parent.balance -= Number(amount);
      receiver.balance += Number(amount);
      
      await parent.save();
      await receiver.save();
      
      await Transaction.create({
        sender: parent._id,
        receiver: receiverId,
        amount,
        type: 'ADMIN_TRANSFER',
        admin: senderId // track who initiated
      });
      
    } else {
      // Owner/User case: must be direct parent
      if (receiver.parent.toString() !== senderId) {
        return res.status(403).json({ msg: 'You can only transfer to your next-level users' });
      }

      if (sender.balance < amount) {
        return res.status(400).json({ msg: 'Insufficient balance' });
      }

      sender.balance -= Number(amount);
      receiver.balance += Number(amount);

      await sender.save();
      await receiver.save();

      await Transaction.create({
        sender: senderId,
        receiver: receiverId,
        amount,
        type: 'TRANSFER'
      });
    }

    res.json({ msg: 'Transfer successful' });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.statement = async (req, res) => {
  const userId = req.user.id;

  const tx = await Transaction.find({
    $or: [{ sender: userId }, { receiver: userId }]
  }).populate('sender receiver');

  res.json(tx);
};