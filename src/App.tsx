import { useEffect, useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();
type Skill = Schema["Skill"]["type"];
type SwapRequest = Schema["InterestRequest"]["type"];
type Kind = "TEACH" | "LEARN";

function Board({ userId, email, signOut }: { userId: string; email: string; signOut?: () => void }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [tab, setTab] = useState<"board" | "inbox" | "sent">("board");
  const [filter, setFilter] = useState<"ALL" | Kind>("ALL");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [kind, setKind] = useState<Kind>("TEACH");

  useEffect(() => {
    const s1 = client.models.Skill.observeQuery().subscribe({ next: (d) => setSkills([...d.items]) });
    const s2 = client.models.InterestRequest.observeQuery().subscribe({ next: (d) => setRequests([...d.items]) });
    return () => { s1.unsubscribe(); s2.unsubscribe(); };
  }, []);

  const isMine = (owner?: string | null) => !!owner && owner.startsWith(userId);

  async function addSkill() {
    if (!title.trim()) return;
    await client.models.Skill.create({ title, description, course, kind, status: "OPEN" });
    setTitle(""); setDescription(""); setCourse("");
  }

  async function sendInterest(s: Skill) {
    if (!s.owner) return;
    await client.models.InterestRequest.create({
      skillId: s.id, skillTitle: s.title, skillOwner: s.owner,
      requesterEmail: email, message: "I'm interested!", status: "PENDING",
    });
  }

  const incoming = requests.filter((r) => isMine(r.skillOwner));
  const sent = requests.filter((r) => isMine(r.owner));
  const pending = incoming.filter((r) => r.status !== "ACCEPTED").length;

  const shown = skills.filter(
    (s) =>
      (filter === "ALL" || s.kind === filter) &&
      `${s.title} ${s.course ?? ""} ${s.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const offered = skills.filter((s) => s.kind === "TEACH" && s.status !== "CLOSED").length;
  const wanted = skills.filter((s) => s.kind === "LEARN" && s.status !== "CLOSED").length;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">Skill Swap</div>
          <div className="user">
            <span className="user-email">{email}</span>
            <div className="avatar">{email.charAt(0).toUpperCase()}</div>
            <button className="btn ghost small" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h2>Trade what you know for what you want to learn.</h2>
          <p>Post a skill you can teach or one you need help with, then connect with classmates who match.</p>
          <div className="stats">
            <div className="stat"><b>{offered}</b>skills offered</div>
            <div className="stat"><b>{wanted}</b>skills wanted</div>
            <div className="stat"><b>{pending}</b>requests waiting for you</div>
          </div>
        </div>
      </section>

      <div className="layout">
        <aside className="panel composer">
          <h3>Post a skill</h3>
          <div className="toggle">
            <button className={kind === "TEACH" ? "on" : ""} onClick={() => setKind("TEACH")}>I can teach</button>
            <button className={kind === "LEARN" ? "on" : ""} onClick={() => setKind("LEARN")}>I want to learn</button>
          </div>
          <label className="field">
            <span>Skill</span>
            <input placeholder="e.g. Python basics" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Course</span>
            <input placeholder="e.g. CS101" value={course} onChange={(e) => setCourse(e.target.value)} />
          </label>
          <label className="field">
            <span>Details</span>
            <textarea placeholder="What can you cover, or what do you need help with?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button className="btn full" onClick={addSkill} disabled={!title.trim()}>Post skill</button>
        </aside>

        <main>
          <div className="tabs">
            <button className={`tab ${tab === "board" ? "on" : ""}`} onClick={() => setTab("board")}>Skill board</button>
            <button className={`tab ${tab === "inbox" ? "on" : ""}`} onClick={() => setTab("inbox")}>
              Requests to me{pending > 0 && <span className="badge">{pending}</span>}
            </button>
            <button className={`tab ${tab === "sent" ? "on" : ""}`} onClick={() => setTab("sent")}>My requests</button>
          </div>

          {tab === "board" && (
            <>
              <div className="toolbar">
                <input className="search" placeholder="Search by skill or course" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="chips">
                  {(["ALL", "TEACH", "LEARN"] as const).map((f) => (
                    <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                      {f === "ALL" ? "All" : f === "TEACH" ? "Teaching" : "Learning"}
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 && (
                <div className="empty"><b>No skills found</b>Post the first one using the form, or clear your search.</div>
              )}

              {shown.map((s) => {
                const alreadySent = sent.some((r) => r.skillId === s.id);
                const count = incoming.filter((r) => r.skillId === s.id).length;
                const cls = s.kind === "TEACH" ? "teach" : "learn";
                return (
                  <article key={s.id} className={`card ${cls} ${s.status === "CLOSED" ? "closed" : ""}`}>
                    <div className="meta">
                      <span className={`pill ${cls}`}>{s.kind === "TEACH" ? "Teaches" : "Wants to learn"}</span>
                      {s.course && <span className="pill course">{s.course}</span>}
                      {s.status === "CLOSED" && <span className="pill done">Closed</span>}
                    </div>
                    <h3>{s.title}</h3>
                    {s.description && <p>{s.description}</p>}

                    <div className="actions">
                      {isMine(s.owner) ? (
                        <>
                          <span className="hint">Your post, {count} interested</span>
                          {s.status !== "CLOSED" && (
                            <button className="btn ghost small" onClick={() => client.models.Skill.update({ id: s.id, status: "CLOSED" })}>Close</button>
                          )}
                          <button className="btn danger small" onClick={() => client.models.Skill.delete({ id: s.id })}>Delete</button>
                        </>
                      ) : (
                        s.status !== "CLOSED" && (
                          <button className="btn small" disabled={alreadySent} onClick={() => sendInterest(s)}>
                            {alreadySent ? "Request sent" : "I'm interested"}
                          </button>
                        )
                      )}
                    </div>
                  </article>
                );
              })}
            </>
          )}

          {tab === "inbox" && (
            <>
              {incoming.length === 0 && (
                <div className="empty"><b>No requests yet</b>When someone is interested in one of your skills, it shows up here.</div>
              )}
              {incoming.map((r) => (
                <article key={r.id} className="card">
                  <div className="meta">
                    <span className={`pill ${r.status === "ACCEPTED" ? "done" : "wait"}`}>{r.status === "ACCEPTED" ? "Accepted" : "Waiting"}</span>
                  </div>
                  <h3>{r.skillTitle}</h3>
                  <p>{r.requesterEmail} wants to connect.</p>
                  {r.status !== "ACCEPTED" && (
                    <div className="actions">
                      <button className="btn small" onClick={() => client.models.InterestRequest.update({ id: r.id, status: "ACCEPTED" })}>Accept request</button>
                    </div>
                  )}
                </article>
              ))}
            </>
          )}

          {tab === "sent" && (
            <>
              {sent.length === 0 && (
                <div className="empty"><b>You haven't sent any requests</b>Open the skill board and press "I'm interested" on a skill you like.</div>
              )}
              {sent.map((r) => (
                <article key={r.id} className="card">
                  <div className="meta">
                    <span className={`pill ${r.status === "ACCEPTED" ? "done" : "wait"}`}>{r.status === "ACCEPTED" ? "Accepted" : "Waiting for a reply"}</span>
                  </div>
                  <h3>{r.skillTitle}</h3>
                  {r.status === "ACCEPTED" && <p>The owner accepted your request. Reach out to plan a session.</p>}
                </article>
              ))}
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Board userId={user?.userId ?? ""} email={user?.signInDetails?.loginId ?? ""} signOut={signOut} />
      )}
    </Authenticator>
  );
}