const User = require('../user/userModel');

async function getDownline(userId) {
  const children = await User.find({ parent: userId });

  let result = [];

  for (let child of children) {
    result.push(child);
    const sub = await getDownline(child._id);
    result = result.concat(sub);
  }

  return result;
}

module.exports = { getDownline };