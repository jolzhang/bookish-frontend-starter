import BookConcept from "./concepts/book";
import CommentConcept from "./concepts/comment";
import FriendConcept from "./concepts/friend";
import GroupConcept from "./concepts/group";
import ListConcept from "./concepts/list";
import PostConcept from "./concepts/post";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Comment = new CommentConcept();
export const Group = new GroupConcept();
export const Book = new BookConcept();
export const List = new ListConcept();