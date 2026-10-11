import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // A skill someone can teach or wants to learn
  Skill: a
    .model({
      title: a.string().required(),
      description: a.string(),
      course: a.string(), // course tag, e.g. CS101
      kind: a.enum(["TEACH", "LEARN"]),
      status: a.enum(["OPEN", "CLOSED"]),
    })
    .authorization((allow) => [
      allow.owner(), // creator can edit/delete
      allow.authenticated().to(["read"]), // every logged-in student can see
    ]),

  // An "I'm interested" request sent to a skill's owner
  InterestRequest: a
    .model({
      skillId: a.string().required(),
      skillTitle: a.string(),
      skillOwner: a.string().required(), // owner of the skill
      requesterEmail: a.string(),
      message: a.string(),
      status: a.enum(["PENDING", "ACCEPTED"]),
    })
    .authorization((allow) => [
      allow.owner(), // the student who sent the request
      allow.ownerDefinedIn("skillOwner").to(["read", "update"]), // skill owner can see and accept // skill owner can see and accept
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});