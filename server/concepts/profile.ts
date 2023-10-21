import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotFoundError } from "./errors";

export interface ProfileDoc extends BaseDoc {
  user: ObjectId;
  name: string;
  biography: string;
  following: Array<ObjectId>;
  followers: Array<ObjectId>;
}

export default class ProfileConcept {
  public readonly profiles = new DocCollection<ProfileDoc>("users");

  private async canCreate(name: string) {
    if (!name) {
      throw new BadValuesError("Name must be nonempty!");
    }
  }

  async create(user: ObjectId, name: string, biography: string | null) {
    await this.canCreate(name);
    const following = new Array<ObjectId>();
    const followers = new Array<ObjectId>();
    if (!biography) {
      const biography = "";
      const _id = await this.profiles.createOne({ user, name, biography, following, followers });
      return { msg: "Profile created successfully!", profile: await this.profiles.readOne({ _id }) };
    } else {
      const _id = await this.profiles.createOne({ user, name, biography, following, followers });
      return { msg: "Profile created successfully!", profile: await this.profiles.readOne({ _id }) };
    }
  }

  private async getProfile(u: ObjectId) {
    const profile = await this.profiles.readOne({ user: u });
    if (profile) {
      return profile;
    }
    throw new NotFoundError("Could not retrieve profile from user!");
  }

  async editName(user: ObjectId, newname: string) {
    await this.getProfile(user);
    const profile = await this.getProfile(user);
    await this.canCreate(newname);
    profile.name = newname;
    await this.profiles.updateOne({ _id: profile._id }, { name: profile.name });
    return { msg: "Successfully changed profile name!", profile: profile };
  }

  async editBiography(user: ObjectId, newbio: string) {
    await this.getProfile(user);
    const profile = await this.getProfile(user);
    profile.biography = newbio;
    await this.profiles.updateOne({ _id: profile._id }, { biography: profile.biography });
    return { msg: "Successfully changed profile biography!", profile: profile };
  }

  async addFriend(user: ObjectId, otheruser: ObjectId) {
    await this.getProfile(user);
    const profile = await this.getProfile(user);
    profile.following.push(otheruser);
    await this.profiles.updateOne({ _id: profile._id }, { ...profile, following: profile.following });
    return { msg: "Successfully added friend to following!", profile: profile };
  }

  private async remove(friends: Array<ObjectId>, other: ObjectId) {
    const lst = [];
    for (let i = 0; i < friends.length; i++) {
      if (!friends[i].equals(other)) {
        lst.push(friends[i]);
      }
    }
    return lst;
  }

  async removeFriend(user: ObjectId, otheruser: ObjectId) {
    await this.getProfile(user);
    const profile = await this.getProfile(user);
    const newlst = await this.remove(profile.following, otheruser);
    await this.profiles.updateOne({ _id: profile._id }, { following: newlst });
    return { msg: "Successfully removed friend from following!", profile: profile };
  }
}
