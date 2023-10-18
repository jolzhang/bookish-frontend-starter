import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Book, Comment, Friend, Group, List, Post, User, WebSession } from "./app";
import { NotAllowedError } from "./concepts/errors";
import { PostDoc, PostOptions } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string, email: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password, email);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    // Remove User from All Groups 
    const groups = await Group.getAllUserGroups(user);
    for (let i = 0; i < groups.length; i ++) {
      await Group.removeSelf(user, groups[i].groupname);
    }
    // Delete all lists created by User
    const lists = await List.getUserLists(user);
    for (let i = 0; i < lists.length; i ++) {
      await List.deleteList(lists[i].listname, user);
    }
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  // Creating a new group
  @Router.post("/groups")
  async newGroup(session: WebSessionDoc, groupname: string) {
    const user = WebSession.getUser(session);
    return await Group.newGroup(user, groupname);
  }

  @Router.get("/groups/name/:name")
  async getGroup(name: string) {
    return await Group.getGroupfromName(name);
  }
  
  @Router.post("/groups/name/:name")
  async joinGroup(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await Group.joinGroup(user, name);
  }

  @Router.patch("/groups")
  async removeSelf(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    // Remove all Comments from User in Group
    const group = await Group.getGroupfromName(name);
    const userComments = await Comment.getUserCommentsfromGroup(group._id, user);
    for (let i = 0; i < userComments.length; i ++) {
      await Comment.removeComment(userComments[i], user)
    }
    return await Group.removeSelf(user, name);
  }
  
  @Router.patch("/groups/remove")
  async removeUser(session: WebSessionDoc, name: string, otheruser: string) {
    const user = WebSession.getUser(session);
    const other = await User.getUserByUsername(otheruser);
    const group = await Group.getGroupfromName(name);
    // Remove all Comments from Other User in Group
    const userComments = await Comment.getUserCommentsfromGroup(group._id, other._id);
    for (let i = 0; i < userComments.length; i ++) {
      await Comment.removeComment(userComments[i], user);
    }
    return await Group.removeOtherUser(user, other._id, name);
  }

  @Router.delete("/groups")
  async deleteGroup(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    const group = await Group.getGroupfromName(name);
    // Remove all Comments from Group
    const allComments = await Comment.getComments(group._id);
    for (let i = 0; i < allComments.length; i ++) {
      await Comment.removeComment(allComments[i]._id, user);
    }
    return await Group.removeGroup(user, name);
  }

  @Router.patch("/groups/admin")
  async updateAdmin(session: WebSessionDoc, name: string, newuser: string) {
    const user = WebSession.getUser(session);
    const other = await User.getUserByUsername(newuser);
    return await Group.changeAdmin(user, other._id, name);
  }

  @Router.patch("/groups/group")
  async updateName(session: WebSessionDoc, name: string, newname: string) {
    const user = WebSession.getUser(session);
    return await Group.changeName(user, name, newname);
  }

  @Router.get("/groups")
  async getAllGroups( ){
    return await Group.getAllGroups();
  }

  @Router.get("/groups/:session")
  async getUserGroups(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Group.getAllUserGroups(user);
  }

  // Comment Concept
  @Router.post("/comments")
  async createComment(session: WebSessionDoc, body: string, group: string) {
    const user = WebSession.getUser(session);
    const group_obj = await Group.getGroupfromName(group);
    const comment = (await Comment.create(user, body, group_obj._id));
    // Add Comment to Group 
    if (comment.comment) {
      await Group.addComment(group, comment.comment._id);
    }
    return comment;
  }

  @Router.delete("/comments")
  async deleteComment(session: WebSessionDoc, id: ObjectId) {
    const user = WebSession.getUser(session);
    const allChildren = await Comment.getAllChildren(id);
    const group_obj = await Comment.getGroup(id);
    // Remove Comment from Group
    for (let i = 0; i < allChildren.length; i ++) {
      await Group.deleteComment(group_obj, allChildren[i]);
    }
    return await Comment.removeComment(id, user);
  }

  @Router.post("/comments/reply")
  async replyComment(session: WebSessionDoc, body: string, parent: ObjectId, group: string) {
    const user = WebSession.getUser(session);
    const group_obj = await Group.getGroupfromName(group);
    const comment = await Comment.reply(user, body, parent, group_obj._id);
    // Add Comment to Group
    if (comment.comment) {
      await Group.addComment(group, comment.comment._id);
    }
    return comment;
  }

  @Router.get("/comments")
  async getComments(group: string) {
    const group_obj = await Group.getGroupfromName(group);
    return await Comment.getComments(group_obj._id);
  }

  @Router.get("/comments/user")
  async getUserComments(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Comment.getUserComments(user);
  }

  // Book Concept
  @Router.post("/book")
  async newBook(title: string, author: string, summary: string, review: string) {
    return await Book.newBook(title, author, summary, review);
  }

  @Router.get("/book")
  async getBooks() {
    return await Book.getAllBooks();
  }
  
  @Router.patch("/book/add/:title/group/:chat")
  async addGroup(session: WebSessionDoc, title: string, chat: string) {
    const user = WebSession.getUser(session);
    const group = await Group.getGroupfromName(chat);
    const isAdmin = await Group.isAdmin(user, group);
    // Add Group to Book only if User is admin of Group
    if (group && isAdmin) {
      return await Book.addGroup(title, group._id);
    }
    throw new NotAllowedError("Could Not Successfully Add Group");
  }

  @Router.patch("/book/remove/:title/group/:chat")
  async removeGroup(session: WebSessionDoc, title: string, chat: string) {
    const user = WebSession.getUser(session);
    const group = await Group.getGroupfromName(chat);
    const isAdmin = await Group.isAdmin(user, group);
    // Remove Group from Book only if User is admin of Group
    if (group && isAdmin) {
      return await Book.removeGroup(title, group._id);
    }
    throw new NotAllowedError ("Not Allowed to Remove Group!");
  }

  @Router.get("/book/title/:title")
  async getBook(title: string) {
    return await Book.getBookfromTitle(title);
  }

  @Router.get("/book/recommend/")
  async getRecommendations() {
    return await Book.bookRecommend();
  }
  
  // List Concept
  @Router.post("/list")
  async createList(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await List.newList(name, user);
  }

  @Router.patch("/list/add/:book/")
  async addToList(session: WebSessionDoc, name: string, book: string) {
    const user = WebSession.getUser(session);
    const enter = (await Book.getBookfromTitle(book))._id;
    return await List.addIn(name, user, enter);
  }

  @Router.patch("/list/remove/:book")
  async removeList(session: WebSessionDoc, name: string, book: string) {
    const user = WebSession.getUser(session);
    const enter = (await Book.getBookfromTitle(book))._id;
    return await List.removeFrom(name, user, enter);
  }

  @Router.delete("/list")
  async deleteList(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await List.deleteList(name, user);
  }

  @Router.get("/list")
  async getUserLists(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await List.getUserLists(user);
  }
  
}

export default getExpressRouter(new Routes());
