const { User, Book } = require("../models");
//With apollo-server-express, you can define your GraphQL schema and resolvers, and then attach them to your Express app as middleware
// In a GraphQL resolver, you can throw an instance of AuthenticationError to indicate that the current user is not authenticated. This will cause the GraphQL server to return an error to the client with an HTTP status code of 401 (Unauthorized).
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    // Retrieves the user data for the currently authenticated user. If there is no authenticated user, an AuthenticationError is thrown.
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
        // .select('-__v -password') is a Mongoose query method that specifies which fields of the retrieved document to exclude from the result. The minus sign before the __v field indicates that it should be excluded from the result.   
        // The password field is also being excluded from the result using the same method because the password field should not be returned to the client for security reasons
        // .select("-__v -password")
          .populate("books");

        return userData;
  }
  throw new AuthenticationError("Not logged in");
},
},

  Mutation: {
    // Creates a new user and returns a JWT token and the new user data.
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);
      return { token, user };
    },
    // Loggs in a user with the specified email and password (i.e args), and returns a JWT token and the user data if the credentials are valid. 
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError("Incorrect email");
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Incorrect password");
      }

      const token = signToken(user);
      return { token, user };
    },
    // Adds a new book to the list of saved books for the current signed in user.
    saveBook: async (_, { newBook }, context) => {
      try {
        // req.session.user_id = userID
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $push: { savedBooks: newBook } },
          { new: true, runValidators: true }
        );
        return updatedUser;
        
      } catch (err) {
        console.log(err);
        return err;
      }
    },
    // Removes a book with the specified bookId from the list of saved books for the current signed in user.
    removeBook: async (_, { bookId }, context) => {
      try {
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { savedBooks: { bookId: bookId } } },
          { new: true }
        );
        return updatedUser;
      } catch (err) {
        console.log(err);
      };
    }
  }
};

module.exports = resolvers;
