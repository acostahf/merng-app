const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { UserInputError } = require("apollo-server");

const {
  ValidateRegisterInput,
  validateLoginInput
} = require("../../Util/validators");
const { SECRET_KEY } = require("../../config");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
}

module.exports = {
  Mutation: {
    async login(_, { username, password }) {
      const { errors, valid } = validateLoginInput(username, password);

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ username });

      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("User not found", { errors });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        errors.general = "Wrong Credetials";
        throw new UserInputError("Wrong credetials", { errors });
      }
      const token = generateToken(user);
      return {
        ...user._doc,
        id: user._id,
        token
      };
    },

    async register(
      _,
      { registerInput: { username, email, password, confirmPassword } }
    ) {
      //TODO Validate user data
      const { valid, errors } = ValidateRegisterInput(
        username,
        email,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }
      //TODO Make sure user doesnt already exist
      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError("Username is taken", {
          errors: {
            username: "This username is taken"
          }
        });
      }
      //TODO hash the password and create an auth token
      password = await bcrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString
      });

      const res = await newUser.save();
      const token = generateToken(res);

      return {
        ...res._doc,
        id: res._id,
        token
      };
    }
  }
};
