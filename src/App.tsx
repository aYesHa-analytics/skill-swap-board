import { useEffect, useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();
type Skill = Schema["Skill"]["type"];
type SwapRequest = Schema["InterestRequest"]["type"];

function Board({ userId, email, signOut }: { userId: string; email: string; signOut?: () => void }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [filter, setFilter] = useState<"ALL" | "TEACH" | "LEARN">("ALL");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [kind, setKind] = useState<"TEACH" | "LEARN">("TEACH");

  useEffect(() => {
    const s1 = client.models.Skill.observeQuery().subscribe({
      next: (d) => setSkills([...d.items]),
    });
    const s2 = client.models.InterestRequest.observeQuery().subscribe({
      next: (d) => setRequests([...d.items]),
    });
    return () => {
      s1.unsubscribe();
      s2.unsubscribe();
    };
  }, []);

  const isMine = (owner?: string | null) => !!owner && owner.startsWith(userId);

  async function addSkill() {
    if (!title.trim()) return;
    await client.models.Skill.create({
      title,
      description,
      course,
      kind,
      status: "OPEN",
    });
    setTitle("");
    setDescription("");
    setCourse("");
  }

  async function sendInterest(s: Skill) {
    if (!s.owner) return;
    await client.models.InterestRequest.create({
      skillId: s.id,
      skillTitle: s.title,
      skillOwner: s.owner,
      requesterEmail: email,
      message: "I'm interested!",
      status: "PENDING",
    });
  }

  const shown = skills.filter(
    (s) =>
      (filter === "ALL" || s.kind === filter) &&
      (`${s.title} ${s.course ?? ""} ${s.description ?? ""}`)
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const incoming = requests.filter((r) => isMine(r.skillOwner));
  const sent = requests.filter((r) => isMine(r.owner));

  const card: React.CSSProperties = {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 20 }}>
      <h1>🔄 Skill Swap Board</h1>
      <p>Signed in as {email}</p>

      <h3>Post a skill</h3>
      <select value={kind} onChange={(e) => setKind(e.target.value as "TEACH" | "LEARN")}>
        <option value="TEACH">I can teach</option>
        <option value="LEARN">I want to learn</option>
      </select>
      <br />
      <input placeholder="Skill (e.g. Python basics)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <br />
      <input placeholder="Course tag (e.g. CS101)" value={course} onChange={(e) => setCourse(e.target.value)} />
      <br />
      <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <br />
      <button onClick={addSkill}>Post</button>

      <h3>Board</h3>
      <input placeholder="🔍 Search skill or course" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        {(["ALL", "TEACH", "LEARN"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ marginRight: 8, fontWeight: filter === f ? "bold" : "normal" }}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.map((s) => {
        const alreadySent = sent.some((r) => r.skillId === s.id);
        const count = incoming.filter((r) => r.skillId === s.id).length;
        return (
          <div key={s.id} style={{ ...card, opacity: s.status === "CLOSED" ? 0.5 : 1 }}>
            <b>
              {s.kind === "TEACH" ? "🎓 TEACHES" : "🙋 WANTS TO LEARN"}: {s.title}
            </b>
            {s.course && <span> · 📚 {s.course}</span>}
            {s.status === "CLOSED" && " ✅ Closed"}
            <div>{s.description}</div>

            {isMine(s.owner) ? (
              <div style={{ marginTop: 8 }}>
                <span>👥 {count} interested</span>
                {s.status !== "CLOSED" && (
                  <button style={{ marginLeft: 8 }} onClick={() => client.models.Skill.update({ id: s.id, status: "CLOSED" })}>
                    Close
                  </button>
                )}
                <button style={{ marginLeft: 8 }} onClick={() => client.models.Skill.delete({ id: s.id })}>
                  Delete
                </button>
              </div>
            ) : (
              s.status !== "CLOSED" && (
                <button style={{ marginTop: 8 }} disabled={alreadySent} onClick={() => sendInterest(s)}>
                  {alreadySent ? "Request sent ✔" : "I'm interested"}
                </button>
              )
            )}
          </div>
        );
      })}

      <h3 style={{ marginTop: 30 }}>📥 Requests on my skills</h3>
      {incoming.length === 0 && <p>No requests yet.</p>}
      {incoming.map((r) => (
        <div key={r.id} style={card}>
          <b>{r.skillTitle}</b> — from {r.requesterEmail}
          <div>Status: {r.status}</div>
          {r.status !== "ACCEPTED" && (
            <button onClick={() => client.models.InterestRequest.update({ id: r.id, status: "ACCEPTED" })}>
              Accept
            </button>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: 30 }}>📤 My requests</h3>
      {sent.length === 0 && <p>You haven't sent any requests.</p>}
      {sent.map((r) => (
        <div key={r.id} style={card}>
          <b>{r.skillTitle}</b> — {r.status === "ACCEPTED" ? "✅ Accepted! Contact the teacher." : "⏳ Pending"}
        </div>
      ))}

      <br />
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Board
          userId={user?.userId ?? ""}
          email={user?.signInDetails?.loginId ?? ""}
          signOut={signOut}
        />
      )}
    </Authenticator>
  );
}import { useEffect, useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();
type Skill = Schema["Skill"]["type"];
type SwapRequest = Schema["InterestRequest"]["type"];

function Board({ userId, email, signOut }: { userId: string; email: string; signOut?: () => void }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [filter, setFilter] = useState<"ALL" | "TEACH" | "LEARN">("ALL");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [kind, setKind] = useState<"TEACH" | "LEARN">("TEACH");

  useEffect(() => {
    const s1 = client.models.Skill.observeQuery().subscribe({
      next: (d) => setSkills([...d.items]),
    });
    const s2 = client.models.InterestRequest.observeQuery().subscribe({
      next: (d) => setRequests([...d.items]),
    });
    return () => {
      s1.unsubscribe();
      s2.unsubscribe();
    };
  }, []);

  const isMine = (owner?: string | null) => !!owner && owner.startsWith(userId);

  async function addSkill() {
    if (!title.trim()) return;
    await client.models.Skill.create({
      title,
      description,
      course,
      kind,
      status: "OPEN",
    });
    setTitle("");
    setDescription("");
    setCourse("");
  }

  async function sendInterest(s: Skill) {
    if (!s.owner) return;
    await client.models.InterestRequest.create({
      skillId: s.id,
      skillTitle: s.title,
      skillOwner: s.owner,
      requesterEmail: email,
      message: "I'm interested!",
      status: "PENDING",
    });
  }

  const shown = skills.filter(
    (s) =>
      (filter === "ALL" || s.kind === filter) &&
      (`${s.title} ${s.course ?? ""} ${s.description ?? ""}`)
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const incoming = requests.filter((r) => isMine(r.skillOwner));
  const sent = requests.filter((r) => isMine(r.owner));

  const card: React.CSSProperties = {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 20 }}>
      <h1>🔄 Skill Swap Board</h1>
      <p>Signed in as {email}</p>

      <h3>Post a skill</h3>
      <select value={kind} onChange={(e) => setKind(e.target.value as "TEACH" | "LEARN")}>
        <option value="TEACH">I can teach</option>
        <option value="LEARN">I want to learn</option>
      </select>
      <br />
      <input placeholder="Skill (e.g. Python basics)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <br />
      <input placeholder="Course tag (e.g. CS101)" value={course} onChange={(e) => setCourse(e.target.value)} />
      <br />
      <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <br />
      <button onClick={addSkill}>Post</button>

      <h3>Board</h3>
      <input placeholder="🔍 Search skill or course" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        {(["ALL", "TEACH", "LEARN"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ marginRight: 8, fontWeight: filter === f ? "bold" : "normal" }}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.map((s) => {
        const alreadySent = sent.some((r) => r.skillId === s.id);
        const count = incoming.filter((r) => r.skillId === s.id).length;
        return (
          <div key={s.id} style={{ ...card, opacity: s.status === "CLOSED" ? 0.5 : 1 }}>
            <b>
              {s.kind === "TEACH" ? "🎓 TEACHES" : "🙋 WANTS TO LEARN"}: {s.title}
            </b>
            {s.course && <span> · 📚 {s.course}</span>}
            {s.status === "CLOSED" && " ✅ Closed"}
            <div>{s.description}</div>

            {isMine(s.owner) ? (
              <div style={{ marginTop: 8 }}>
                <span>👥 {count} interested</span>
                {s.status !== "CLOSED" && (
                  <button style={{ marginLeft: 8 }} onClick={() => client.models.Skill.update({ id: s.id, status: "CLOSED" })}>
                    Close
                  </button>
                )}
                <button style={{ marginLeft: 8 }} onClick={() => client.models.Skill.delete({ id: s.id })}>
                  Delete
                </button>
              </div>
            ) : (
              s.status !== "CLOSED" && (
                <button style={{ marginTop: 8 }} disabled={alreadySent} onClick={() => sendInterest(s)}>
                  {alreadySent ? "Request sent ✔" : "I'm interested"}
                </button>
              )
            )}
          </div>
        );
      })}

      <h3 style={{ marginTop: 30 }}>📥 Requests on my skills</h3>
      {incoming.length === 0 && <p>No requests yet.</p>}
      {incoming.map((r) => (
        <div key={r.id} style={card}>
          <b>{r.skillTitle}</b> — from {r.requesterEmail}
          <div>Status: {r.status}</div>
          {r.status !== "ACCEPTED" && (
            <button onClick={() => client.models.InterestRequest.update({ id: r.id, status: "ACCEPTED" })}>
              Accept
            </button>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: 30 }}>📤 My requests</h3>
      {sent.length === 0 && <p>You haven't sent any requests.</p>}
      {sent.map((r) => (
        <div key={r.id} style={card}>
          <b>{r.skillTitle}</b> — {r.status === "ACCEPTED" ? "✅ Accepted! Contact the teacher." : "⏳ Pending"}
        </div>
      ))}

      <br />
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Board
          userId={user?.userId ?? ""}
          email={user?.signInDetails?.loginId ?? ""}
          signOut={signOut}
        />
      )}
    </Authenticator>
  );
}