export function Campaigns({ navigate }: { navigate: (s: string) => void }) {
  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Campaigns</div>
        <div className="ps">Multi-week content strategies around a single goal.</div>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "56px 20px", color: "var(--t3)", fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗓</div>
        <div style={{ fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>Coming soon</div>
        <div style={{ marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
          Plan multi-week content series, track drafts across formats, and schedule from one place.
        </div>
        <button className="btn bp" onClick={() => navigate("ideas")}>Generate ideas in the meantime →</button>
      </div>
    </div>
  );
}
