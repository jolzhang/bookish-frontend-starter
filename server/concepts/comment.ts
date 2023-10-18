import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface CommentDoc extends BaseDoc {
    author: ObjectId;
    body: string;
    parent: ObjectId | null;
    group: ObjectId;
}

export default class CommentConcept {
    public readonly comments = new DocCollection<CommentDoc>("comments");

    // Helper function that checks if comment string is not empty
    private async canCreate(com: string) {
        if (!com) {
            throw new BadValuesError("Name must be nonempty!");
        }
    }

    async create(author: ObjectId, body: string, group: ObjectId) {
        await this.canCreate(body);
        const parent = null;
        const _id = await this.comments.createOne({ author, body, parent, group });
        return { msg: "Comment successfully created!", comment: await this.comments.readOne({ _id })};
    }

    async commentExists(_id: ObjectId) {
        const comment = await this.comments.readOne({ _id });
        if (!comment) {
            throw new NotFoundError(`Comment ${_id} does not exist`);
        }
        return comment
    }

    private async directChild(id: ObjectId) {
        const allComments = await this.comments.readMany({});
        const child = [];
        for (let i = 0; i < allComments.length; i ++) {
            const comment = allComments[i];
            if (comment && comment.parent && id == comment.parent) {
                child.push(comment);
            }
        }
        return child;
    }

    async getAllChildren(id: ObjectId) {
        await this.commentExists(id);
        const queue = [id];
        const lst = [id];
        while (queue.length > 0) {
            let popped = queue.pop();
            if (popped) {
                const directChildren = await this.directChild(popped);
                for (let i = 0; i < directChildren.length; i ++ ) {
                    queue.push(directChildren[i]._id);
                    lst.push(directChildren[i]._id);
                }
            }
        }
        return lst;
    }

    private async isAuthor(_id: ObjectId, user: ObjectId) {
        await this.commentExists(_id);
        const comment = await this.commentExists(_id);
        if (comment.author.equals(user)) {
            return true;
        }
        throw new CommentAuthorError(user, _id);
    }

    async getGroup(_id: ObjectId) {
        await this.commentExists(_id);
        const comment = await this.commentExists(_id);
        return comment.group;
    }
    
    async removeComment(_id: ObjectId, user: ObjectId) {
        await this.commentExists(_id);
        await this.isAuthor(_id, user);
        const allChildren = await this.getAllChildren(_id); // a list of comments and all their children
        for (let i = 0; i < allChildren.length; i ++) {
            this.comments.deleteOne( {_id: allChildren[i]});
        }
        return { msg: "Comment and Children Comments successfully deleted!" };
    }

    async reply(author: ObjectId, body: string, parent: ObjectId, group: ObjectId) {
        await this.canCreate(body);
        await this.commentExists(parent);
        const _id = await this.comments.createOne({ author, body, parent, group});
        return { msg: "Comment successfully replied to!", comment: await this.comments.readOne({ _id })};
    }

    async getComments(group: ObjectId) {
        return await this.comments.readMany({ group: { $eq: group }});
    }

    async getUserCommentsfromGroup(group: ObjectId, user: ObjectId) {
        const lst = [];
        const comm = await this.getComments(group);
        for (let i = 0; i < comm.length; i++) {
            if (comm[i].author.equals(user)) {
                lst.push(comm[i]._id);
            }
        }
        return lst;
    }

    async getUserComments(user: ObjectId) {
        const lst = [];
        const comm = await this.comments.readMany({});
        for (let i = 0; i < comm.length; i++) {
            if (comm[i].author.equals(user)) {
                lst.push(comm[i]._id);
            }
        }
        return lst;
    }
}

export class CommentAuthorError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,) {
      super("{0} is not the author of comment {1}!", author, _id);
    }
}

export class CouldNotRemoveComment extends NotAllowedError {
    constructor() {
    super("Could not successfully remove comment");
    }
}