#  Skill Swap Board

A full-stack web application where students post skills they can **teach** or want to **learn**, tag them with a course (e.g. `CS101`), and send an **"I'm interested"** request to the skill's owner. Built with React and deployed on **AWS Amplify (Gen 2)**.

> Can be embedded in any LMS (Moodle, Canvas, Blackboard, Google Classroom) by adding the live URL as an external link or `<iframe>`.

---

## Features

- Secure sign up and login (email + confirmation code)
- Post a skill: **I can teach** or **I want to learn**
- Course tags, search, and filter (All / Teach / Learn)
- Send an **"I'm interested"** request to a skill owner
- Skill owners see incoming requests and can **Accept** them
- Students track the status of requests they sent (Pending / Accepted)
- Owners can close or delete their own skills
- Real-time updates (no page refresh needed)

---

##  Tech Stack and AWS Services

| Layer | Technology / Service | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Vite | User interface |
| Auth | **Amazon Cognito** | Sign up, login, user identity |
| API | **AWS AppSync** (GraphQL) | Queries, mutations, real-time subscriptions |
| Database | **Amazon DynamoDB** | Stores skills and requests |
| Hosting | **AWS Amplify Hosting** | Build, deploy, CI/CD from GitHub |
| Storage | **Amazon S3** | Stores the built static files |
| CDN | **Amazon CloudFront** | Fast global content delivery |
| Source control | GitHub | Triggers automatic deployments |


##  Data Model

| Model | Fields | Notes |
|---|---|---|
| **Skill** | `title`, `description`, `course`, `kind` (TEACH / LEARN), `status` (OPEN / CLOSED) | Stored in a DynamoDB table |
| **InterestRequest** | `skillId`, `skillTitle`, `skillOwner`, `requesterEmail`, `message`, `status` (PENDING / ACCEPTED) | Stored in a DynamoDB table |

### Authorization rules

| Model | Who | Permission |
|---|---|---|
| Skill | Creator (owner) | Create, read, update, delete |
| Skill | Any logged-in student | Read only |
| InterestRequest | Sender (owner) | Create, read, delete |
| InterestRequest | Skill owner (`skillOwner` field) | Read, update (accept) |

---

##  Project Structure

```
amplify-react-app/
├── amplify/
│   ├── auth/
│   │   └── resource.ts      # Cognito (email login)
│   ├── data/
│   │   └── resource.ts      # Data models + AppSync + DynamoDB + auth rules
│   └── backend.ts           # Combines auth and data into one backend
├── src/
│   ├── main.tsx             # Amplify.configure() and React entry point
│   └── App.tsx              # Skill Swap Board UI
├── amplify_outputs.json     # Auto-generated on deploy (not committed)
├── package.json
└── README.md
```

---

##  Getting Started

### Prerequisites

- Node.js 20 or higher
- Git and a GitHub account
- VS Code (or any text editor)
- An AWS account

### 1. Clone and install

```bash
git clone https://github.com/aYesHa-analytics/skill-swap-board.git
cd skill-swap-board
npm install
```

### 2. Deploy to AWS Amplify

1. Open the **AWS Console → AWS Amplify → Create new app**.
2. Choose **GitHub**, authorize AWS, and select this repository and the `main` branch.
3. Keep the default build settings and click **Save and deploy**.
4. Wait for **Provision → Build → Deploy → Verify** to finish (5 to 10 minutes).
5. Open the generated domain link, `https://main.xxxx.amplifyapp.com`.

Every `git push` to `main` redeploys the app automatically.

### 3. Try it

1. Create an account and confirm it with the emailed code.
2. Post a skill, for example **"Python basics" (CS101)**.
3. In an incognito window, sign up as a second user and click **I'm interested**.
4. Back on the first account, open **Requests on my skills** and click **Accept**.

---

##  Security Notes

- All API calls require a valid Cognito token (`userPool` authorization).
- Row-level access is enforced by AppSync using owner-based rules.
- No AWS keys are stored in this repository. `amplify_outputs.json` is generated during deployment and is git-ignored.

---

##  Cleanup

To avoid charges after you finish:

1. **Amplify → your app → App settings → General settings → Delete app**.
2. Confirm that the Cognito, AppSync, and DynamoDB resources are removed.
3. Check the **Billing** dashboard the next day.

---

##  Future Improvements

- Official LMS integration through LTI
- Student / Teacher roles using Cognito groups
- Scheduling a session after a request is accepted
- Reputation points and a leaderboard
- Teacher dashboard with swap statistics

---

##  Author

**Ayesha Farhan**
GitHub: [aYesHa-analytics](https://github.com/aYesHa-analytics)

Built as part of an AWS Amplify hands-on assignment.