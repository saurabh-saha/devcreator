"use client";
import { useState } from "react";

const TABS = [
  { id: "li", label: "LinkedIn" },
  { id: "yt", label: "YouTube" },
  { id: "sh", label: "Short" },
  { id: "ca", label: "Carousel" },
  { id: "ar", label: "Article" },
  { id: "th", label: "Thread" },
];

const CONTENT: Record<string, string> = {
  li: `I've shipped 12 AI agents.

11 of them didn't need LangChain.

Here's what I actually use instead — and why I think most developers are massively overcomplicating this:

→ A simple tool-calling loop in about 40 lines of Python
→ Direct API calls with structured outputs
→ State managed in a plain Postgres table
→ A queue (Redis or even cron) for orchestration

The agents that needed a framework were the ones with complex multi-agent handoffs and shared memory. That's maybe 1 in 12 use cases.

For everything else, a framework adds:
— Vendor lock-in on your AI layer
— Abstraction you'll need to debug through
— A new mental model that changes every 6 months

Three questions worth asking before adding a framework:
1. Do I need multi-agent coordination right now?
2. Am I building something I can maintain in 12 months?
3. Would a junior engineer understand this?

If the answer to all three is no → write the loop yourself first.

#AIEngineering #Agents #Backend`,
  yt: `[HOOK — 0:00–0:12]
I've shipped 12 AI agents. Only one of them actually needed an agentic framework. Here's everything I learned.

[SECTION 1 — The framework trap, 0:12–1:30]
When you're learning AI agents, frameworks feel like the obvious choice. LangChain, LlamaIndex, AutoGen — they abstract away the hard parts and let you prototype fast.

The problem is that "prototype fast" and "run in production" are very different goals.

[SECTION 2 — What I use instead, 1:30–4:00]
Here's my standard agent setup: a Python function that takes a prompt, calls a tool, gets the result, loops if needed, exits when done. Roughly 40 lines. No imports except the SDK.

State goes in Postgres. Queue goes in Redis. That's it.

[SECTION 3 — When you actually need a framework, 4:00–6:30]
True multi-agent orchestration with shared state and complex handoffs. Out of 12 agents, exactly one needed that.

[OUTRO — 6:30–7:00]
Before you add a framework, ask yourself three questions...`,
  sh: `[0:00–0:03] HOOK
"I've shipped 12 AI agents. 11 didn't need a framework."

[0:03–0:25] THE PROBLEM
Most developers add LangChain because it feels professional. But 90% of production agents are just: call a tool, check the result, loop.

[0:25–0:45] THE SETUP
What actually runs in production for me:
— 40-line Python function
— Direct API calls
— State in Postgres
— Redis queue

[0:45–0:58] THE LESSON
Frameworks are great for learning. Write the loop first. Add complexity only when you need it.`,
  ca: `Slide 1: COVER
"12 AI agents shipped. 11 didn't need LangChain."

Slide 2: THE TYPICAL APPROACH
→ Learn about agents → Add LangChain → Prototype works → Ship it → Debug for weeks

Slide 3: THE PROBLEM WITH FRAMEWORKS
• Abstraction over what you need to understand
• Vendor lock on your core AI layer
• Docs change every 3 months

Slide 4: WHAT MOST AGENTS ACTUALLY ARE
call_llm() → parse_output() → call_tool() → loop_or_exit()
That's it. 40 lines of Python.

Slide 5–7: [Visual comparison: framework vs. direct code]

Slide 8: WHEN TO USE A FRAMEWORK
Multi-agent systems with shared state. Rare. Build simple first.

Slide 9–10: THE 3 QUESTIONS + SWIPE TO SAVE`,
  ar: `## Why Most AI Agents Don't Need an Agentic Framework

I've shipped 12 AI agents in the past two years. Only one of them required what I'd call a proper agentic framework. The other 11 ran on something closer to a while loop and a Postgres table.

This isn't a contrarian take for its own sake. It's what I've learned shipping agents in production environments where the goal is maintainability, not demo impressiveness.

### What "agent" actually means in production

[Article continues…]`,
  th: `1/ I've shipped 12 AI agents.

Only 1 needed LangChain.

Here's what the other 11 run on →

2/ The typical path:
- Discover AI agents → Add LangChain immediately → Prototype works great → Ship it → Spend 3 weeks debugging the abstraction layer

3/ The thing nobody says: most "agents" are just a while loop.

call_tool() → check_result() → loop_or_exit()

That's it. 40 lines of Python.

4/ What actually runs in my production agents:
→ Direct API calls with structured outputs
→ State in a Postgres table
→ Redis or cron for the queue

5/ When DO you need a framework?
True multi-agent coordination. Complex handoffs.
Out of 12 agents: 1 needed this.

6/ RT if you've been burned by framework complexity in prod.`,
};

export function Studio() {
  const [activeTab, setActiveTab] = useState("li");

  return (
    <div className="page">
      <div className="ph"><div className="pt">Content Studio</div><div className="ps">One idea, every format, in your voice.</div></div>
      <div className="sto">
        <div className="stlbl">Creating from idea</div>
        <div className="sttitle">Why most AI agents don&apos;t need an agentic framework</div>
      </div>
      <div className="stabs">
        {TABS.map(t => (
          <button key={t.id} className={`stab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="stout">{CONTENT[activeTab]}</div>
      <div className="stmeta">
        <div className="stmi"><div className="stml">Voice match</div><div className="stmv" style={{ color: "var(--gn)" }}>94% ●</div></div>
        <div className="stmi"><div className="stml">Format</div><div className="stmv">{TABS.find(t => t.id === activeTab)?.label} post</div></div>
        <div className="stmi"><div className="stml">Est. reach</div><div className="stmv" style={{ color: "var(--gn)" }}>High</div></div>
      </div>
      <div className="stact">
        <button className="btn bp" onClick={() => navigator.clipboard.writeText(CONTENT[activeTab])}>Copy</button>
        <button className="btn bs">Save draft</button>
        <button className="btn bg-btn">Add to campaign</button>
      </div>
    </div>
  );
}
