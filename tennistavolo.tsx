import { useState, useEffect } from "react";

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const KEYS = {
  users: "tt_users",
  bookings: "tt_bookings",
  currentUser: "tt_currentUser",
};

const load = async (key) => {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
};

const save = async (key, val) => {
  try {
    await window.storage.set(key, JSON.stringify(val), true);
  } catch {}
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const TABLES = [1, 2, 3, 4, 5];
const SLOTS = ["17:00–18:30", "18:30–20:00"];
const DAYS = ["Lunedì", "Mercoledì", "Venerdì"];
const ADMIN_CODE = "TTV";

// Genera le prossime 3 settimane di date valide (lun/mer/ven)
function getUpcomingDates() {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d = new Date(today);
  while (dates.length < 12) {
    const dow = d.getDay(); // 0=dom 1=lun 3=mer 5=ven
    if (dow === 1 || dow === 3 || dow === 5) {
      dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDate(date) {
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: #0f1a14;
    color: #e8f0eb;
    min-height: 100vh;
  }

  .app { max-width: 960px; margin: 0 auto; padding: 0 16px 80px; }

  /* ── HEADER ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0 16px;
    border-bottom: 1px solid #1e3028;
  }
  .logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.6rem; font-weight: 800;
    color: #4cde80; letter-spacing: 0.5px;
  }
  .logo span { color: #e8f0eb; }
  .user-pill {
    display: flex; align-items: center; gap: 10px;
    background: #1a2b20; border-radius: 999px;
    padding: 6px 14px 6px 10px;
    font-size: 0.82rem; color: #9dbfa8;
  }
  .user-pill .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #4cde80;
  }
  .btn-logout {
    background: none; border: 1px solid #2a3d2e;
    color: #9dbfa8; border-radius: 6px;
    padding: 4px 10px; font-size: 0.78rem;
    cursor: pointer; transition: all .15s;
  }
  .btn-logout:hover { border-color: #4cde80; color: #4cde80; }

  /* ── TABS ── */
  .tabs {
    display: flex; gap: 4px;
    padding: 16px 0 0;
  }
  .tab {
    background: none; border: none;
    padding: 8px 18px; border-radius: 8px 8px 0 0;
    font-size: 0.88rem; font-weight: 600;
    color: #5c7a63; cursor: pointer; transition: all .15s;
    border-bottom: 2px solid transparent;
  }
  .tab.active { color: #4cde80; border-bottom-color: #4cde80; }
  .tab:hover:not(.active) { color: #9dbfa8; }

  /* ── DATE SELECTOR ── */
  .date-strip {
    display: flex; gap: 8px; overflow-x: auto;
    padding: 16px 0 8px;
    scrollbar-width: none;
  }
  .date-strip::-webkit-scrollbar { display: none; }
  .date-btn {
    flex-shrink: 0;
    background: #1a2b20; border: 1px solid #2a3d2e;
    border-radius: 10px; padding: 8px 14px;
    cursor: pointer; transition: all .15s;
    text-align: center;
  }
  .date-btn .day-name {
    font-size: 0.68rem; text-transform: uppercase;
    letter-spacing: 1px; color: #5c7a63; font-weight: 600;
  }
  .date-btn .day-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.3rem; font-weight: 800; color: #9dbfa8;
    line-height: 1.1;
  }
  .date-btn.active {
    background: #4cde80; border-color: #4cde80;
  }
  .date-btn.active .day-name,
  .date-btn.active .day-num { color: #0f1a14; }

  /* ── SLOT TOGGLE ── */
  .slot-toggle {
    display: flex; gap: 8px; margin: 12px 0;
  }
  .slot-btn {
    flex: 1; padding: 10px;
    border: 1px solid #2a3d2e; border-radius: 8px;
    background: #1a2b20; color: #5c7a63;
    font-size: 0.88rem; font-weight: 600;
    cursor: pointer; transition: all .15s;
  }
  .slot-btn.active {
    background: #1a3d28; border-color: #4cde80; color: #4cde80;
  }

  /* ── TABLE GRID ── */
  .table-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px; margin-top: 8px;
  }
  .table-card {
    border-radius: 14px; padding: 18px 16px;
    border: 1.5px solid #2a3d2e;
    transition: all .2s; position: relative;
    cursor: default;
  }
  .table-card.free {
    background: #0f1a14; border-color: #2d5c3c;
    cursor: pointer;
  }
  .table-card.free:hover {
    border-color: #4cde80; transform: translateY(-2px);
    box-shadow: 0 8px 24px #4cde8022;
  }
  .table-card.pending { background: #1a2208; border-color: #6b7c14; }
  .table-card.full { background: #1a0e0e; border-color: #5c2a2a; }
  .table-card.mine { background: #0a1f30; border-color: #2a7a9d; }

  .table-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 2rem; font-weight: 800; line-height: 1;
    margin-bottom: 4px;
  }
  .table-card.free .table-num { color: #4cde80; }
  .table-card.pending .table-num { color: #c9d11c; }
  .table-card.full .table-num { color: #de4c4c; }
  .table-card.mine .table-num { color: #4cbdde; }

  .table-label {
    font-size: 0.7rem; text-transform: uppercase;
    letter-spacing: 1px; font-weight: 700; margin-bottom: 8px;
  }
  .table-card.free .table-label { color: #3a8a50; }
  .table-card.pending .table-label { color: #8a8a1a; }
  .table-card.full .table-label { color: #8a3a3a; }
  .table-card.mine .table-label { color: #2a7a9d; }

  .table-players {
    font-size: 0.8rem; color: #9dbfa8; line-height: 1.4;
  }
  .table-players .name { font-weight: 600; color: #e8f0eb; }

  .btn-book {
    margin-top: 10px; width: 100%;
    background: #4cde80; color: #0f1a14;
    border: none; border-radius: 8px;
    padding: 8px; font-size: 0.82rem; font-weight: 700;
    cursor: pointer; transition: all .15s;
  }
  .btn-book:hover { background: #3aca6e; }

  .btn-cancel {
    margin-top: 10px; width: 100%;
    background: none; color: #de4c4c;
    border: 1px solid #5c2a2a; border-radius: 8px;
    padding: 8px; font-size: 0.82rem; font-weight: 700;
    cursor: pointer; transition: all .15s;
  }
  .btn-cancel:hover { background: #2a0a0a; }

  /* ── MODAL ── */
  .overlay {
    position: fixed; inset: 0;
    background: #00000099; backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 16px;
  }
  .modal {
    background: #141f18; border: 1px solid #2a3d2e;
    border-radius: 18px; padding: 28px 24px;
    width: 100%; max-width: 420px;
  }
  .modal h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.5rem; font-weight: 800;
    color: #4cde80; margin-bottom: 16px;
  }
  .modal p { font-size: 0.88rem; color: #9dbfa8; margin-bottom: 16px; }

  .modal label {
    display: block; font-size: 0.78rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: #5c7a63; margin-bottom: 6px;
  }
  .modal input, .modal select {
    width: 100%; background: #0f1a14;
    border: 1px solid #2a3d2e; border-radius: 8px;
    padding: 10px 12px; color: #e8f0eb;
    font-size: 0.9rem; margin-bottom: 14px;
    outline: none; transition: border-color .15s;
  }
  .modal input:focus, .modal select:focus { border-color: #4cde80; }

  .modal-actions { display: flex; gap: 8px; margin-top: 4px; }
  .btn-primary {
    flex: 1; background: #4cde80; color: #0f1a14;
    border: none; border-radius: 10px;
    padding: 12px; font-size: 0.9rem; font-weight: 700;
    cursor: pointer; transition: all .15s;
  }
  .btn-primary:hover { background: #3aca6e; }
  .btn-secondary {
    flex: 1; background: none; color: #9dbfa8;
    border: 1px solid #2a3d2e; border-radius: 10px;
    padding: 12px; font-size: 0.9rem; font-weight: 600;
    cursor: pointer; transition: all .15s;
  }
  .btn-secondary:hover { border-color: #4cde80; color: #4cde80; }

  /* ── AUTH ── */
  .auth-wrap {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 24px;
  }
  .auth-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 2.4rem; font-weight: 800;
    color: #4cde80; margin-bottom: 8px;
  }
  .auth-logo span { color: #e8f0eb; }
  .auth-sub {
    font-size: 0.88rem; color: #5c7a63; margin-bottom: 32px;
    text-align: center;
  }
  .auth-card {
    background: #141f18; border: 1px solid #2a3d2e;
    border-radius: 18px; padding: 28px 24px;
    width: 100%; max-width: 380px;
  }
  .auth-card h2 {
    font-size: 1.1rem; font-weight: 700;
    color: #e8f0eb; margin-bottom: 20px;
  }
  .auth-toggle {
    text-align: center; margin-top: 16px;
    font-size: 0.82rem; color: #5c7a63;
  }
  .auth-toggle button {
    background: none; border: none; color: #4cde80;
    font-size: 0.82rem; font-weight: 600;
    cursor: pointer; text-decoration: underline;
  }
  .error-msg {
    background: #2a0a0a; border: 1px solid #5c2a2a;
    border-radius: 8px; padding: 10px 12px;
    font-size: 0.82rem; color: #de4c4c;
    margin-bottom: 14px;
  }
  .success-msg {
    background: #0a2a14; border: 1px solid #2a5c3c;
    border-radius: 8px; padding: 10px 12px;
    font-size: 0.82rem; color: #4cde80;
    margin-bottom: 14px;
  }

  /* ── ADMIN ── */
  .admin-section { margin-top: 20px; }
  .admin-section h3 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.2rem; font-weight: 800; color: #4cde80;
    margin-bottom: 12px;
  }
  .admin-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.82rem;
  }
  .admin-table th {
    text-align: left; padding: 8px 10px;
    color: #5c7a63; font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.8px;
    border-bottom: 1px solid #1e3028;
  }
  .admin-table td {
    padding: 10px 10px; border-bottom: 1px solid #1a2b20;
    color: #9dbfa8;
  }
  .admin-table td strong { color: #e8f0eb; }
  .badge {
    display: inline-block; padding: 2px 8px;
    border-radius: 999px; font-size: 0.72rem; font-weight: 700;
  }
  .badge-free { background: #0a2a14; color: #4cde80; }
  .badge-pending { background: #1a2208; color: #c9d11c; }
  .badge-full { background: #2a0a0a; color: #de4c4c; }
  .badge-mine { background: #0a1f30; color: #4cbdde; }

  .btn-danger {
    background: none; border: 1px solid #5c2a2a;
    color: #de4c4c; border-radius: 6px;
    padding: 4px 10px; font-size: 0.75rem;
    cursor: pointer; transition: all .15s;
  }
  .btn-danger:hover { background: #2a0a0a; }

  .pending-badge {
    position: absolute; top: 10px; right: 10px;
    font-size: 0.65rem; font-weight: 700;
    background: #6b7c14; color: #0f1a14;
    border-radius: 999px; padding: 2px 7px;
  }

  .section-title {
    font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 1px; color: #5c7a63; font-weight: 600;
    margin: 20px 0 8px;
  }

  .empty-state {
    text-align: center; padding: 40px 20px;
    color: #3a5040;
    font-size: 0.9rem;
  }

  .my-bookings-list { display: flex; flex-direction: column; gap: 10px; }
  .booking-row {
    background: #141f18; border: 1px solid #2a3d2e;
    border-radius: 12px; padding: 14px 16px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .booking-row .info { font-size: 0.82rem; color: #9dbfa8; }
  .booking-row .info strong { color: #e8f0eb; display: block; font-size: 0.9rem; }
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [tab, setTab] = useState("prenota"); // prenota | miei | admin
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [modal, setModal] = useState(null); // {tableNum, date, slot}
  const [inviteMode, setInviteMode] = useState("open"); // open | specific
  const [inviteTarget, setInviteTarget] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", adminCode: "" });
  const [authError, setAuthError] = useState("");

  const dates = getUpcomingDates();

  const DEFAULT_ADMIN = {
    id: "admin-alessandro",
    name: "Alessandro",
    email: "alessandro.chellini7@gmail.com",
    password: "Tacchino",
    isAdmin: true,
  };

  useEffect(() => {
    (async () => {
      const u = await load(KEYS.users);
      const b = await load(KEYS.bookings);
      const cu = await load(KEYS.currentUser);
      let userList = u || [];
      if (!userList.find(x => x.id === "admin-alessandro")) {
        userList = [{
          id: "admin-alessandro",
          name: "Alessandro",
          email: "alessandro.chellini7@gmail.com",
          password: "Tacchino",
          isAdmin: true,
        }, ...userList];
        await save(KEYS.users, userList);
      }
      setUsers(userList);
      setBookings(b || []);
      setCurrentUser(cu || null);
      setLoading(false);
    })();
  }, []);

  // ── PERSISTENZA ──
  const updateUsers = async (u) => { setUsers(u); await save(KEYS.users, u); };
  const updateBookings = async (b) => { setBookings(b); await save(KEYS.bookings, b); };
  const updateCurrentUser = async (u) => { setCurrentUser(u); await save(KEYS.currentUser, u); };

  // ── AUTH ──
  const handleAuth = async () => {
    setAuthError("");
    if (authMode === "register") {
      if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
        setAuthError("Compila tutti i campi."); return;
      }
      if (users.find(u => u.email === form.email.trim().toLowerCase())) {
        setAuthError("Email già registrata."); return;
      }
      const isAdmin = form.adminCode === ADMIN_CODE;
      const newUser = {
        id: Date.now().toString(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        isAdmin,
      };
      const newUsers = [...users, newUser];
      await updateUsers(newUsers);
      await updateCurrentUser(newUser);
    } else {
      const found = users.find(
        u => u.email === form.email.trim().toLowerCase() && u.password === form.password
      );
      if (!found) { setAuthError("Email o password errati."); return; }
      await updateCurrentUser(found);
    }
  };

  const handleLogout = async () => {
    await updateCurrentUser(null);
    setTab("prenota");
  };

  // ── BOOKING LOGIC ──
  const getBooking = (tableNum, dateStr, slot) =>
    bookings?.find(b => b.table === tableNum && b.date === dateStr && b.slot === slot);

  const handleBook = async () => {
    const dateStr = dateKey(dates[selectedDate]);
    const existing = getBooking(modal.tableNum, dateStr, selectedSlot);
    if (existing) return;

    const newBooking = {
      id: Date.now().toString(),
      table: modal.tableNum,
      date: dateStr,
      slot: selectedSlot,
      player1: currentUser.id,
      player2: inviteMode === "specific" && inviteTarget ? inviteTarget : null,
      status: "pending", // pending = 1 giocatore / confirmed = 2 giocatori
      openInvite: inviteMode === "open",
    };
    const updated = [...bookings, newBooking];
    await updateBookings(updated);
    setModal(null);
  };

  const handleJoin = async (booking) => {
    const updated = bookings.map(b =>
      b.id === booking.id
        ? { ...b, player2: currentUser.id, status: "confirmed", openInvite: false }
        : b
    );
    await updateBookings(updated);
  };

  const handleCancel = async (bookingId) => {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;
    // Se sono player2, mi rimuovo
    if (b.player2 === currentUser.id) {
      const updated = bookings.map(x =>
        x.id === bookingId
          ? { ...x, player2: null, status: "pending", openInvite: true }
          : x
      );
      await updateBookings(updated);
    } else {
      // player1 cancella tutto
      await updateBookings(bookings.filter(x => x.id !== bookingId));
    }
  };

  const getUserName = (id) => {
    if (!id) return null;
    const u = users.find(x => x.id === id);
    return u ? u.name : "Utente";
  };

  // ── RENDER ──
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#4cde80", fontFamily: "Inter, sans-serif" }}>
      Caricamento…
    </div>
  );

  if (!currentUser) return <AuthScreen {...{ authMode, setAuthMode, form, setForm, authError, handleAuth }} />;

  const dateStr = dateKey(dates[selectedDate]);
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const myBookings = bookings.filter(b => b.player1 === currentUser.id || b.player2 === currentUser.id);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="logo">TT<span> Valdarno</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="user-pill">
              <div className="dot" />
              {currentUser.name}
              {currentUser.isAdmin && <span style={{ fontSize: "0.7rem", color: "#c9d11c" }}>★ Admin</span>}
            </div>
            <button className="btn-logout" onClick={handleLogout}>Esci</button>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          <button className={`tab ${tab === "prenota" ? "active" : ""}`} onClick={() => setTab("prenota")}>Prenota</button>
          <button className={`tab ${tab === "miei" ? "active" : ""}`} onClick={() => setTab("miei")}>Le mie</button>
          {currentUser.isAdmin && (
            <button className={`tab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>Admin</button>
          )}
        </div>

        {/* TAB: PRENOTA */}
        {tab === "prenota" && (
          <>
            {/* Date strip */}
            <div className="date-strip">
              {dates.map((d, i) => (
                <button key={i} className={`date-btn ${selectedDate === i ? "active" : ""}`} onClick={() => setSelectedDate(i)}>
                  <div className="day-name">{DAYS[["lun","mer","ven"].indexOf(d.toLocaleDateString("it-IT",{weekday:"short"}).slice(0,3))] || d.toLocaleDateString("it-IT",{weekday:"short"})}</div>
                  <div className="day-num">{d.getDate()}/{d.getMonth()+1}</div>
                </button>
              ))}
            </div>

            {/* Slot toggle */}
            <div className="slot-toggle">
              {SLOTS.map((s, i) => (
                <button key={i} className={`slot-btn ${selectedSlot === i ? "active" : ""}`} onClick={() => setSelectedSlot(i)}>
                  {s}
                </button>
              ))}
            </div>

            <div className="section-title">Tavoli disponibili – {formatDate(dates[selectedDate])} – {SLOTS[selectedSlot]}</div>

            {/* Table grid */}
            <div className="table-grid">
              {TABLES.map(tableNum => {
                const bk = getBooking(tableNum, dateStr, selectedSlot);
                const isMine = bk && (bk.player1 === currentUser.id || bk.player2 === currentUser.id);
                const canJoin = bk && bk.status === "pending" && bk.openInvite && !isMine;

                let state = "free";
                if (bk) {
                  if (isMine) state = "mine";
                  else if (bk.status === "confirmed") state = "full";
                  else state = "pending";
                }

                const labels = { free: "Libero", pending: "In attesa", full: "Occupato", mine: "Mia prenotaz." };

                return (
                  <div key={tableNum} className={`table-card ${state}`} onClick={state === "free" ? () => setModal({ tableNum }) : undefined}>
                    {state === "pending" && <div className="pending-badge">1/2</div>}
                    <div className="table-num">{tableNum}</div>
                    <div className="table-label">Tavolo {tableNum} · {labels[state]}</div>
                    {bk && (
                      <div className="table-players">
                        <span className="name">{getUserName(bk.player1)}</span>
                        {bk.player2
                          ? <><br /><span className="name">{getUserName(bk.player2)}</span></>
                          : bk.openInvite ? <><br /><span style={{color:"#5c7a63"}}>Posto aperto</span></> : <><br /><span style={{color:"#5c7a63"}}>In attesa risposta</span></>
                        }
                      </div>
                    )}
                    {state === "free" && <button className="btn-book">+ Prenota</button>}
                    {canJoin && <button className="btn-book" onClick={(e) => { e.stopPropagation(); handleJoin(bk); }}>Unisciti</button>}
                    {isMine && <button className="btn-cancel" onClick={(e) => { e.stopPropagation(); handleCancel(bk.id); }}>Cancella</button>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB: LE MIE */}
        {tab === "miei" && (
          <div className="admin-section">
            <h3>Le mie prenotazioni</h3>
            {myBookings.length === 0 ? (
              <div className="empty-state">Nessuna prenotazione ancora.<br />Vai su "Prenota" per iniziare!</div>
            ) : (
              <div className="my-bookings-list">
                {myBookings.map(b => {
                  const d = new Date(b.date + "T12:00:00");
                  const partner = b.player1 === currentUser.id ? b.player2 : b.player1;
                  return (
                    <div key={b.id} className="booking-row">
                      <div className="info">
                        <strong>Tavolo {b.table} · {SLOTS[b.slot]}</strong>
                        {formatDate(d)}<br />
                        {partner ? <>Partner: <strong style={{color:"#e8f0eb"}}>{getUserName(partner)}</strong></> : b.openInvite ? "Posto aperto" : "In attesa risposta"}
                        <span style={{marginLeft:8}} className={`badge badge-${b.status === "confirmed" ? "mine" : "pending"}`}>
                          {b.status === "confirmed" ? "Confermata" : "In attesa"}
                        </span>
                      </div>
                      <button className="btn-cancel" style={{fontSize:"0.75rem"}} onClick={() => handleCancel(b.id)}>Cancella</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: ADMIN */}
        {tab === "admin" && currentUser.isAdmin && (
          <div className="admin-section">
            <h3>Pannello Admin</h3>

            <div className="section-title" style={{marginTop:0}}>Utenti registrati ({users.length})</div>
            <table className="admin-table">
              <thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.isAdmin ? "badge-mine" : "badge-free"}`}>{u.isAdmin ? "Admin" : "Membro"}</span></td>
                    <td>
                      {u.id !== currentUser.id && (
                        <button className="btn-danger" onClick={async () => {
                          await updateUsers(users.filter(x => x.id !== u.id));
                          await updateBookings(bookings.filter(b => b.player1 !== u.id && b.player2 !== u.id));
                        }}>Rimuovi</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="section-title">Tutte le prenotazioni ({bookings.length})</div>
            {bookings.length === 0 ? <div className="empty-state">Nessuna prenotazione.</div> : (
              <table className="admin-table">
                <thead><tr><th>Tavolo</th><th>Data</th><th>Turno</th><th>Giocatori</th><th>Stato</th><th></th></tr></thead>
                <tbody>
                  {[...bookings].sort((a,b) => a.date.localeCompare(b.date)).map(b => (
                    <tr key={b.id}>
                      <td><strong>{b.table}</strong></td>
                      <td>{new Date(b.date+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})}</td>
                      <td style={{whiteSpace:"nowrap"}}>{SLOTS[b.slot]}</td>
                      <td>
                        {getUserName(b.player1)}
                        {b.player2 ? <> · {getUserName(b.player2)}</> : " · —"}
                      </td>
                      <td>
                        <span className={`badge badge-${b.status === "confirmed" ? "mine" : "pending"}`}>
                          {b.status === "confirmed" ? "Confermata" : "In attesa"}
                        </span>
                      </td>
                      <td>
                        <button className="btn-danger" onClick={async () => {
                          await updateBookings(bookings.filter(x => x.id !== b.id));
                        }}>Cancella</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL PRENOTAZIONE */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Prenota Tavolo {modal.tableNum}</h2>
            <p>{formatDate(dates[selectedDate])} · {SLOTS[selectedSlot]}</p>

            <label>Come vuoi giocare?</label>
            <div className="slot-toggle" style={{marginBottom:14}}>
              <button className={`slot-btn ${inviteMode === "open" ? "active" : ""}`} onClick={() => setInviteMode("open")}>
                Posto aperto
              </button>
              <button className={`slot-btn ${inviteMode === "specific" ? "active" : ""}`} onClick={() => setInviteMode("specific")}>
                Invita qualcuno
              </button>
            </div>

            {inviteMode === "specific" && (
              <>
                <label>Scegli il partner</label>
                <select value={inviteTarget} onChange={e => setInviteTarget(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {otherUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <p style={{fontSize:"0.78rem",marginTop:-8}}>
                  Il tavolo resterà "In attesa" finché il partner non conferma unendosi.
                </p>
              </>
            )}

            {inviteMode === "open" && (
              <p style={{fontSize:"0.78rem"}}>Il posto sarà visibile come "aperto" e chiunque potrà unirsi.</p>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button className="btn-primary" onClick={handleBook}
                disabled={inviteMode === "specific" && !inviteTarget}>
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ authMode, setAuthMode, form, setForm, authError, handleAuth }) {
  const css2 = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f1a14; font-family: 'Inter', sans-serif; }
  `;

  return (
    <>
      <style>{css2}</style>
      <div className="auth-wrap" style={{fontFamily:"Inter,sans-serif",background:"#0f1a14",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"2.4rem",fontWeight:800,color:"#4cde80",marginBottom:4}}>
          TT<span style={{color:"#e8f0eb"}}> Valdarno</span>
        </div>
        <div style={{fontSize:"0.88rem",color:"#5c7a63",marginBottom:32,textAlign:"center"}}>
          Prenotazioni tavoli — Tennistavolo
        </div>

        <div style={{background:"#141f18",border:"1px solid #2a3d2e",borderRadius:18,padding:"28px 24px",width:"100%",maxWidth:380}}>
          <h2 style={{fontSize:"1.1rem",fontWeight:700,color:"#e8f0eb",marginBottom:20}}>
            {authMode === "login" ? "Accedi" : "Registrati"}
          </h2>

          {authError && <div className="error-msg" style={{background:"#2a0a0a",border:"1px solid #5c2a2a",borderRadius:8,padding:"10px 12px",fontSize:"0.82rem",color:"#de4c4c",marginBottom:14}}>{authError}</div>}

          {authMode === "register" && (
            <Field label="Nome" value={form.name} onChange={v => setForm(f=>({...f,name:v}))} placeholder="Mario Rossi" />
          )}
          <Field label="Email" value={form.email} onChange={v => setForm(f=>({...f,email:v}))} placeholder="mario@email.com" type="email" />
          <Field label="Password" value={form.password} onChange={v => setForm(f=>({...f,password:v}))} type="password" />
          {authMode === "register" && (
            <Field label="Codice admin (opzionale)" value={form.adminCode} onChange={v => setForm(f=>({...f,adminCode:v}))} placeholder="Solo se sei il gestore" />
          )}

          <button onClick={handleAuth} style={{width:"100%",background:"#4cde80",color:"#0f1a14",border:"none",borderRadius:10,padding:12,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",marginTop:4}}>
            {authMode === "login" ? "Entra" : "Crea account"}
          </button>

          <div style={{textAlign:"center",marginTop:16,fontSize:"0.82rem",color:"#5c7a63"}}>
            {authMode === "login" ? "Non hai un account? " : "Hai già un account? "}
            <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              style={{background:"none",border:"none",color:"#4cde80",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>
              {authMode === "login" ? "Registrati" : "Accedi"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",color:"#5c7a63",marginBottom:6}}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{width:"100%",background:"#0f1a14",border:"1px solid #2a3d2e",borderRadius:8,padding:"10px 12px",color:"#e8f0eb",fontSize:"0.9rem",marginBottom:14,outline:"none",fontFamily:"Inter,sans-serif"}}
      />
    </div>
  );
}
