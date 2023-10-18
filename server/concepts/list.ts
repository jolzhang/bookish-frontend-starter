import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface ListDoc extends BaseDoc {
    listname: string;
    admin: ObjectId;
    books: Array<ObjectId>;
}

export default class ListConcept {
    public readonly lists = new DocCollection<ListDoc>("Lists");

    // Helper function that checks if list name input is nonempty string
    private async canCreate(name: string) {
        if (!name) {
            throw new BadValuesError("Name must be nonempty!");
        }
    }
    
    async newList(listname: string, admin: ObjectId) {
        await this.canCreate(listname);
        const books = new Array<ObjectId>();
        const _id = await this.lists.createOne( { listname, admin, books } );
        return { msg: "New List created!", list: await this.lists.readOne({ _id })};
    }

    // Helper function that gets ListDoc from list name
    private async getListfromName(name: string) {
        const list = await this.lists.readOne( { listname: name } );
        if (list) {
            return list;
        }
        throw new NotFoundError("List Not Found from Name");
    }

    // Helper function that checks if user is admin of list
    private async isAdmin(admin: ObjectId, list: ListDoc) {  
        if (list.admin.equals(admin)) {
            return true;
        }
        return false;
    }

    // Helper function that checks if book is in list
    private async inList(book: ObjectId, list: ListDoc) {
        const books = list.books;
        for (let i = 0; i < books.length; i ++ ) {
            if (books[i].equals(book)) {
                return true;
            }
        }
        return false;
    }

    async addIn(name: string, admin: ObjectId, book: ObjectId) {
        await this.getListfromName(name);
        const list = await this.getListfromName(name);
        const isAdmin = await this.isAdmin(admin, list);
        const inList = !(await this.inList(book, list));
        if (isAdmin && inList && list) {
            list.books.push(book);
            this.lists.updateOne({ _id: list._id}, {...list, books: list.books});
            return { msg: "Successfully added book to list", id: list };
        }
        throw new CouldNotAddBook;
    }

    async removeBook(list: Array<ObjectId>, book: ObjectId) {
        const lst = [];
        for (let i = 0; i < list.length; i ++) {
            if (!(list[i].equals(book))) {
                lst.push(list[i])
            }
        }
        return lst;
    }
    
    async removeFrom(name: string, admin: ObjectId, book: ObjectId) {
        await this.getListfromName(name);
        const list = await this.getListfromName(name);
        const isAdmin = await this.isAdmin(admin, list);
        const inList = await this.inList(book, list);
        if (isAdmin && inList && list) {
            list.books = await this.removeBook(list.books, book);
            this.lists.updateOne({_id: list._id}, {...list, books: list.books});
            return { msg: "Successfully removed book from list", id: list }
        }
        throw new CouldNotRemoveBook;
    }

    async deleteList(name: string, admin: ObjectId) {
        await this.getListfromName(name);
        const list = await this.getListfromName(name);
        const isAdmin = await this.isAdmin(admin, list);
        if (isAdmin && list) {
            this.lists.deleteOne({ _id: list._id });
            return { msg: "Successfully deleted list" };
        }
        throw new CouldNotDeleteList;
    }

    async getUserLists(user: ObjectId) {
        return await this.lists.readMany({ admin: { $eq: user }});
    }
}

export class CouldNotAddBook extends NotAllowedError {
    constructor() {
        super("Could not successfully add book to list!");
    }
}

export class CouldNotRemoveBook extends NotAllowedError {
    constructor() {
        super("Could not successfully remove book from list!");
    }
}

export class CouldNotDeleteList extends NotAllowedError {
    constructor() {
        super("Could not successfully delete list!");
    }
}