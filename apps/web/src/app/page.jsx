"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Music,
  Plus,
  TrendingUp,
  Trophy,
  Timer,
  LogOut,
  Lock,
  Sparkles,
  Check,
  Video,
  Film,
  Calendar,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Trash2,
  Upload,
  Search,
  RotateCcw,
  Guitar,
  GraduationCap,
  MapPin,
  KeyRound,
  Award,
  Mic,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ADMIN = { name: "Ohila", role: "admin" };

const HARDCODED_SONGS = ["Photograph", "Fistful of Pesos", "Hungry Ghost"];

const LEVELS = [
  "L1 Basic",
  "L2 Basic",
  "L1 Intermediate",
  "L2 Intermediate",
  "Advance L1",
  "Alumni",
];

const SECURITY_QUESTIONS = [
  "What's your favorite pizza topping?",
  "If you were a guitar, what brand would you be?",
  "What's the worst song you secretly love?",
  "What's your go-to karaoke song?",
  "What's your pet's name? (or dream pet)",
];

/** Normalize a security answer: lowercase, trim, collapse internal spaces */
function fuzzyNormalize(s) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────
export default function PracticeTracker() {
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [loginModal, setLoginModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);   // for forgot-password flow
  const [createModal, setCreateModal] = useState(false);
  const [logPracticeModal, setLogPracticeModal] = useState(false);
  const [addSongsModal, setAddSongsModal] = useState(false);
  const [viewStudentModal, setViewStudentModal] = useState(null);

  useEffect(() => {
    loadData();
    const saved = localStorage.getItem("practiceTrackerUser");
    if (saved) setCurrentUser(JSON.parse(saved));

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setLoginModal(null);
        setResetModal(null);
        setCreateModal(false);
        setLogPracticeModal(false);
        setAddSongsModal(false);
        setViewStudentModal(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const loadData = async () => {
    try {
      const [studentsRes, sessionsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/sessions"),
      ]);
      const studentsData = await studentsRes.json();
      const sessionsData = await sessionsRes.json();
      setStudents(studentsData.students || []);
      setSessions(sessionsData.sessions || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem("practiceTrackerUser", JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("practiceTrackerUser");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Guitar className="w-12 h-12 text-[#D4AF37] animate-pulse" />
          <p className="text-[#D4AF37] font-playfair text-xl">Loading…</p>
        </div>
      </div>
    );
  }

  if (currentUser?.role === "admin") {
    return (
      <AdminDashboard
        students={students}
        sessions={sessions}
        logout={logout}
        adminPassword={currentUser.password}
        setViewStudentModal={setViewStudentModal}
        viewStudentModal={viewStudentModal}
      />
    );
  }

  if (currentUser?.role === "student") {
    return (
      <StudentDashboard
        student={students.find((s) => s.id === currentUser.id)}
        logout={logout}
        loadData={loadData}
        logPracticeModal={logPracticeModal}
        setLogPracticeModal={setLogPracticeModal}
        addSongsModal={addSongsModal}
        setAddSongsModal={setAddSongsModal}
      />
    );
  }

  return (
    <>
      <HomePage
        students={students}
        setLoginModal={setLoginModal}
        setCreateModal={setCreateModal}
      />

      {loginModal && (
        <LoginModal
          user={loginModal}
          onClose={() => setLoginModal(null)}
          onLogin={login}
          onForgotPassword={() => {
            setResetModal(loginModal);
            setLoginModal(null);
          }}
        />
      )}

      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
          onSuccess={() => setResetModal(null)}
        />
      )}

      {createModal && (
        <CreateProfileModal
          onClose={() => setCreateModal(false)}
          onSuccess={(newStudent) => {
            login({ ...newStudent, role: "student" });
            setCreateModal(false);
            loadData();
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Public Home Page
// ─────────────────────────────────────────────
function HomePage({ students, setLoginModal, setCreateModal }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cardModal, setCardModal] = useState(null); // student card tapped

  const leaderboard = [...students].sort((a, b) =>
    b.total_minutes !== a.total_minutes
      ? b.total_minutes - a.total_minutes
      : a.name.localeCompare(b.name)
  );

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#0F0F0F] to-[#050505] flex flex-col">
      {/* ── Top nav bar ── */}
      <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Guitar className="w-5 h-5 text-[#D4AF37]" />
            <span className="font-playfair font-bold text-white text-sm">Guitar Practice Logs</span>
          </div>
          <div className="flex items-center gap-2 text-[#606060] text-xs">
            <span className="hidden sm:inline text-xs">CVPA · RV University</span>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* ── Hero branding ── */}
          <div className="text-center mb-16">
            {/* Institution badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5 mb-8">
              <span className="text-[#D4AF37] text-xs font-semibold tracking-wider uppercase">
                Center of Visual and Performing Arts, RV University
              </span>
            </div>


            <h1
              className="text-5xl md:text-7xl font-playfair font-bold mb-4 leading-tight"
              style={{
                background: "linear-gradient(135deg, #F4E4C1 0%, #D4AF37 50%, #F4E4C1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Guitar Practice Logs
            </h1>

            <p className="text-[#A0A0A0] text-lg mb-2 font-light">
              Play daily · Log your practice · Improve
            </p>
            <p className="text-[#606060] text-sm italic">
              Made for better earning
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 justify-center mt-10">
              <button
                onClick={() => setCreateModal(true)}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold transition-all"
                style={{
                  background: "linear-gradient(to right, #D4AF37, #F4E4C1)",
                  color: "#000",
                  boxShadow: "0 0 30px rgba(212,175,55,0.35)",
                }}
              >
                <Plus className="w-4 h-4" />
                Create Your Profile
              </button>
              <button
                onClick={() => setLoginModal(ADMIN)}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold border border-white/10 text-[#A0A0A0] hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Crown className="w-4 h-4 text-[#D4AF37]" />
                Instructor Login
              </button>
            </div>
          </div>

          {/* ── Main grid: Cards + Leaderboard ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Left: Student cards */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="text-xl font-playfair font-bold text-white">
                    Students
                  </h2>
                  <span className="text-[#606060] text-sm">({students.length})</span>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
                  <input
                    type="text"
                    placeholder="Search students…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-sm placeholder-[#404040] focus:border-[#D4AF37]/50 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Admin card */}
                <AdminSquareCard onClick={() => setLoginModal(ADMIN)} />

                {/* Student cards */}
                {filteredStudents.map((student) => (
                  <StudentSquareCard
                    key={student.id}
                    student={student}
                    onClick={() => setCardModal(student)}
                  />
                ))}

                {/* New profile card */}
                <div
                  onClick={() => setCreateModal(true)}
                  className="rounded-2xl border-2 border-dashed border-[#D4AF37]/25 bg-[#0A0A0A]/60 cursor-pointer hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-4"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#D4AF37]/40 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-[#D4AF37]/60" />
                  </div>
                  <p className="text-[#A0A0A0] font-semibold text-sm text-center leading-tight">
                    Join Us
                  </p>
                  <p className="text-[#505050] text-xs text-center">Create profile</p>
                </div>
              </div>

              {filteredStudents.length === 0 && searchQuery && (
                <div className="text-center py-12 text-[#606060]">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No students match "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Right: Leaderboard */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-xl font-playfair font-bold text-white">
                  Top Performers
                </h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 backdrop-blur-sm p-5 space-y-4">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-10">
                    <Trophy className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-[#505050] text-sm">No rankings yet</p>
                  </div>
                ) : (
                  leaderboard.map((student, i) => (
                    <div key={student.id} className="flex items-center gap-3">
                      <RankBadge rank={i + 1} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{student.name}</p>
                        <p className="text-[#606060] text-xs">{student.total_minutes} min</p>
                      </div>
                      {i === 0 && <Trophy className="w-4 h-4 text-[#FFD700] flex-shrink-0" />}
                    </div>
                  ))
                )}
              </div>

              {/* Stats panel */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#111]/60 p-5 space-y-3">
                <p className="text-[#606060] text-xs font-semibold uppercase tracking-wider">Overall Stats</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0] text-sm">Students</span>
                    <span className="text-white font-bold text-sm">{students.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0] text-sm">Total minutes</span>
                    <span className="text-white font-bold text-sm">
                      {students.reduce((s, st) => s + (st.total_minutes || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0] text-sm">Sessions</span>
                    <span className="text-white font-bold text-sm">
                      {students.reduce((s, st) => s + (st.session_count || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>

    {cardModal && (
      <CardActionModal
        student={cardModal}
        onClose={() => setCardModal(null)}
        onLogin={() => { setCardModal(null); setLoginModal(cardModal); }}
      />
    )}
    </>
  );
}

// ─────────────────────────────────────────────
// Card action popup — View Profile / Login as
// ─────────────────────────────────────────────
function CardActionModal({ student, onClose, onLogin }) {
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const isPublic = student.is_public !== 0;

  if (showPublicProfile) {
    return <PublicProfileModal student={student} onClose={onClose} />;
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/40 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-playfair font-bold text-[#D4AF37]">{student.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-xl font-playfair font-bold text-white">{student.name}</h2>
          {student.level && <p className="text-[#606060] text-xs mt-0.5 uppercase tracking-wide">{student.level}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            if (isPublic) setShowPublicProfile(true);
          }}
          className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all text-left ${
            isPublic
              ? "border-white/10 bg-[#111] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 cursor-pointer"
              : "border-white/5 bg-[#0A0A0A] cursor-default opacity-60"
          }`}
        >
          <Globe className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">View Profile</p>
            <p className="text-[#505050] text-xs">
              {isPublic ? "See practice stats, sessions and videos" : `${student.name}'s account is private`}
            </p>
          </div>
        </button>

        <button
          onClick={onLogin}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-white/10 bg-[#111] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all text-left"
        >
          <KeyRound className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Login as {student.name}</p>
            <p className="text-[#505050] text-xs">Enter password to access your dashboard</p>
          </div>
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Public read-only profile modal
// ─────────────────────────────────────────────
function PublicProfileModal({ student, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/student/${student.id}`)
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [student.id]);

  const songSummary = {};
  sessions.forEach(s => s.songs?.forEach(song => { songSummary[song] = (songSummary[song] || 0) + 1; }));
  const songSummaryArray = Object.entries(songSummary).map(([song, count]) => ({ song, count })).sort((a, b) => b.count - a.count);

  return (
    <Modal onClose={onClose} large>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/50 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-playfair font-bold text-[#D4AF37]">{student.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-2xl font-playfair font-bold text-white">{student.name}</h2>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {student.level && <span className="text-[#606060] text-xs uppercase tracking-wide">{student.level}</span>}
            <span className="flex items-center gap-1 text-[#505050] text-xs"><Timer className="w-3 h-3" />{student.total_minutes} min</span>
            <span className="flex items-center gap-1 text-[#505050] text-xs"><Trophy className="w-3 h-3" />{student.session_count} sessions</span>
          </div>
        </div>
      </div>

      {songSummaryArray.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[#A0A0A0] mb-3 uppercase tracking-wider">Songs Practiced</h3>
          <div className="flex flex-wrap gap-2">
            {songSummaryArray.map(({ song, count }) => (
              <span key={song} className="px-3 py-1 rounded-full text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
                {song} <span className="opacity-60">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#A0A0A0] mb-3 uppercase tracking-wider">Practice Sessions</h3>
        {loading ? (
          <p className="text-[#505050] text-sm text-center py-6">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-[#505050] text-sm text-center py-6">No sessions yet</p>
        ) : (
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {sessions.map(session => (
              <div key={session.id} className="border border-white/10 rounded-xl p-4 bg-[#111]/40">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-sm font-semibold">
                    {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <span className="flex items-center gap-1 text-[#D4AF37] text-sm font-bold"><Timer className="w-3.5 h-3.5" />{session.minutes} min</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {session.songs?.map(song => (
                    <span key={song} className="px-2 py-0.5 rounded-full text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">{song}</span>
                  ))}
                </div>
                {session.videos?.map(video => (
                  <div key={video.id} className="mt-2 rounded-xl bg-black/30 border border-white/10 p-3">
                    <p className="text-xs text-[#505050] flex items-center gap-1 mb-2"><Film className="w-3 h-3" />{video.original_name || video.filename}</p>
                    <video controls className="w-full rounded-lg max-h-48 bg-black" src={`/api/videos/${video.id}`} preload="metadata" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onClose} className="w-full px-5 py-3 rounded-xl font-bold transition-all mt-2"
        style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}>
        Close
      </button>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Square cards for public view
// ─────────────────────────────────────────────
function AdminSquareCard({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="group rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#1A1A1A]/80 to-[#0A0A0A]/80 cursor-pointer hover:border-[#D4AF37]/60 hover:shadow-[0_0_25px_rgba(212,175,55,0.2)] transition-all duration-300 flex flex-col overflow-hidden"
      style={{ aspectRatio: "1 / 1" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-2">
        <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center mb-1 group-hover:bg-[#D4AF37]/30 transition-all">
          <Crown className="w-7 h-7 text-[#D4AF37]" />
        </div>
        <h3 className="text-base font-playfair font-bold text-white leading-tight">{ADMIN.name}</h3>
        <div className="flex items-center gap-1 text-[#A0A0A0]">
          <Lock className="w-3 h-3" />
          <span className="text-xs">Instructor</span>
        </div>
      </div>
      <div className="border-t border-[#D4AF37]/15 py-2 text-center">
        <span className="text-[#D4AF37] text-xs font-semibold">Admin</span>
      </div>
    </div>
  );
}

function StudentSquareCard({ student, onClick }) {
  const lastSongs = student.last_songs || [];
  const isPublic = student.is_public !== 0;

  return (
    <div
      onClick={onClick}
      className="group rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A1A]/80 to-[#0A0A0A]/80 cursor-pointer hover:border-[#D4AF37]/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.12)] transition-all duration-300 flex flex-col overflow-hidden"
      style={{ aspectRatio: "1 / 1" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-2">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-[#1A1A1A] border-2 border-white/10 flex items-center justify-center mb-1 group-hover:border-[#D4AF37]/40 transition-all">
          <span
            className="text-xl font-playfair font-bold"
            style={{ color: "#D4AF37" }}
          >
            {student.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <h3 className="text-sm font-playfair font-bold text-white leading-tight">
          {student.name}
        </h3>
        {student.level && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-[#A0A0A0] uppercase tracking-wide">
            {student.level}
          </span>
        )}
        {!isPublic && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-[#505050]">
            <Lock className="w-2.5 h-2.5" /> Private
          </span>
        )}

        {/* Last practiced songs */}
        {lastSongs.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {lastSongs.slice(0, 2).map((song) => (
              <span
                key={song}
                className="px-2 py-0.5 rounded-full text-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] truncate max-w-[80px]"
              >
                {song}
              </span>
            ))}
            {lastSongs.length > 2 && (
              <span className="text-[10px] text-[#505050]">+{lastSongs.length - 2}</span>
            )}
          </div>
        ) : (
          <p className="text-[#505050] text-[10px]">No sessions yet</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="border-t border-white/5 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[#606060]">
          <Timer className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{student.total_minutes}m</span>
        </div>
        <div className="flex items-center gap-1 text-[#606060]">
          <Trophy className="w-3 h-3" />
          <span className="text-[10px]">{student.session_count}</span>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const styles = {
    1: { bg: "#FFD700", color: "#000" },
    2: { bg: "#C0C0C0", color: "#000" },
    3: { bg: "#CD7F32", color: "#000" },
  };
  const s = styles[rank] || { bg: "rgba(255,255,255,0.08)", color: "#707070" };
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {rank}
    </div>
  );
}

// ─────────────────────────────────────────────
// Login modal
// ─────────────────────────────────────────────
function LoginModal({ user, onClose, onLogin, onForgotPassword }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isAdmin = user.role === "admin";

  const handleLogin = async () => {
    if (!password) { setError("Please enter your password"); return; }
    setLoading(true);
    setError("");
    try {
      if (isAdmin) {
        const res = await fetch("/api/auth/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) { setError("Incorrect password. Try again."); return; }
        onLogin({ ...user, password });
        onClose();
      } else {
        const res = await fetch(`/api/students/${user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) { setError("Incorrect password. Try again."); return; }
        const data = await res.json();
        onLogin({ ...data.student, role: "student" });
        onClose();
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      {isAdmin ? (
        <Crown className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-playfair font-bold text-[#D4AF37]">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <h2 className="text-2xl font-playfair font-bold text-white text-center mb-1">
        Welcome back
      </h2>
      <p className="text-[#A0A0A0] text-center mb-6">{user.name}</p>

      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError(""); }}
        onKeyPress={(e) => e.key === "Enter" && handleLogin()}
        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all mb-3"
        autoFocus
      />

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isAdmin && (
        <button
          onClick={onForgotPassword}
          className="flex items-center gap-1 text-[#D4AF37] text-sm hover:underline mb-5"
        >
          <KeyRound className="w-3 h-3" />
          Forgot your password?
        </button>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-5 py-3 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] font-bold border border-white/10 hover:border-white/20 transition-all">
          Cancel
        </button>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex-1 px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000", boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}
        >
          {loading ? "…" : "Login"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Reset Password modal (2-step)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Delete Profile confirmation modal (student)
// ─────────────────────────────────────────────
function DeleteProfileModal({ student, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to delete profile.");
        return;
      }
      onDeleted();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-900/20 border-2 border-red-700/40 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-playfair font-bold text-white mb-2">Delete Profile?</h2>
        <p className="text-[#A0A0A0] text-sm mb-1">
          This will permanently delete <span className="text-white font-semibold">{student.name}</span>'s account,
          all practice sessions, and uploaded videos.
        </p>
        <p className="text-red-400 text-xs font-semibold mb-6">This cannot be undone.</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-xl font-bold border border-white/10 bg-[#1A1A1A] text-[#A0A0A0] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-5 py-3 rounded-xl font-bold bg-red-700 hover:bg-red-600 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onSuccess }) {
  const [step, setStep] = useState(1);         // 1 = security Q, 2 = new password
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const handleVerify = async () => {
    if (!answer.trim()) { setError("Please enter your answer"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityAnswer: answer }),
      });
      if (!res.ok) {
        setError("That answer doesn't match our records. Try different capitalization or spelling.");
        return;
      }
      setStep(2);
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword) { setError("Please enter a new password"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    if (newPassword.length < 4) { setError("Password must be at least 4 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityAnswer: answer, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to reset password");
        return;
      }
      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch {
      setError("Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <p className="text-white text-xl font-playfair font-bold">Password reset!</p>
          <p className="text-[#A0A0A0] text-sm mt-2">You can now log in with your new password.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <RotateCcw className="w-10 h-10 text-[#D4AF37]" />
        <div>
          <h2 className="text-2xl font-playfair font-bold text-white">Reset Password</h2>
          <p className="text-[#606060] text-sm">{user.name}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${step >= s ? "bg-[#D4AF37]" : "bg-white/10"}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <>
          <p className="text-[#A0A0A0] text-sm mb-2">Security question:</p>
          <p className="text-white font-semibold mb-4 p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            {user.security_question}
          </p>
          <p className="text-[#606060] text-xs mb-2 italic">
            Don't worry about capital letters, extra spaces, or punctuation — we're flexible.
          </p>
          <input
            type="text"
            placeholder="Your answer…"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setError(""); }}
            onKeyPress={(e) => e.key === "Enter" && handleVerify()}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all mb-3"
            autoFocus
          />
          {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-3"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {/* Always-visible admin tip */}
          <div className="mb-3 p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-sm">
            <p className="text-[#D4AF37] font-semibold mb-0.5">Can't remember your answer?</p>
            <p className="text-[#A0A0A0]">Ask your instructor <span className="text-white font-semibold">Ohila</span> — she can share your password from the admin dashboard.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-5 py-3 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] font-bold border border-white/10 transition-all">Cancel</button>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-bold disabled:opacity-60"
              style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}
            >
              {loading ? "…" : "Verify"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-green-400 text-sm flex items-center gap-1 mb-5">
            <CheckCircle className="w-4 h-4" /> Answer verified! Now set a new password.
          </p>
          <div className="space-y-3 mb-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all"
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              onKeyPress={(e) => e.key === "Enter" && handleReset()}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all"
            />
          </div>
          {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-3"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 px-5 py-3 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] font-bold border border-white/10 transition-all">Back</button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-bold disabled:opacity-60"
              style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}
            >
              {loading ? "Saving…" : "Set Password"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Create Profile modal
// ─────────────────────────────────────────────
function CreateProfileModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ name: "", password: "", securityQuestion: "", securityAnswer: "", level: "" });
  const [customLevel, setCustomLevel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [customSongs, setCustomSongs] = useState([]);
  const [newSongInput, setNewSongInput] = useState("");
  const [error, setError] = useState("");

  const allSongs = [...HARDCODED_SONGS, ...customSongs];

  const toggleSong = (song) => {
    setSelectedSongs((prev) =>
      prev.includes(song) ? prev.filter((s) => s !== song) : [...prev, song]
    );
  };

  const addCustomSong = () => {
    if (newSongInput.trim()) {
      const s = newSongInput.trim();
      setCustomSongs((prev) => [...prev, s]);
      setSelectedSongs((prev) => [...prev, s]);
      setNewSongInput("");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) { setError("Please enter your name"); return; }
    if (!formData.password) { setError("Please enter a password"); return; }
    if (!formData.securityQuestion || formData.securityQuestion === "") { setError("Please select a security question"); return; }
    if (!formData.securityAnswer) { setError("Please enter a security answer"); return; }
    if (selectedSongs.length < 1) { setError("Select at least 1 song to get started"); return; }
    const levelValue = formData.level === "Other" ? customLevel.trim() : formData.level;
    if (!levelValue) { setError("Please select your batch/level"); return; }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, level: formData.level === "Other" ? customLevel.trim() : formData.level, is_public: isPublic, songs: selectedSongs }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create profile");
      }
      const { student } = await res.json();
      onSuccess(student);
    } catch (err) {
      setError(err.message || "Failed to create profile. Please try again.");
    }
  };

  return (
    <Modal onClose={onClose} large>
      <Sparkles className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
      <h2 className="text-3xl font-playfair font-bold text-white text-center mb-6">Create Your Profile</h2>

      <div className="mb-4 p-3 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20">
        <p className="text-[#A0A0A0] text-sm">
          Remember your password and security answer! Your tutor can reset it for you if needed.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-[#A0A0A0] text-sm mb-1.5">Your Name</label>
          <input type="text" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all" />
        </div>
        <div>
          <label className="block text-[#A0A0A0] text-sm mb-1.5">Password</label>
          <input type="password" value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all" />
        </div>
        <div>
          <label className="block text-[#A0A0A0] text-sm mb-1.5">Security Question</label>
          <select value={formData.securityQuestion}
            onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all">
            <option disabled value="">Choose a question…</option>
            {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[#A0A0A0] text-sm mb-1.5">Your Answer</label>
          <input type="text" value={formData.securityAnswer}
            onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all" />
        </div>
        <div>
          <label className="block text-[#A0A0A0] text-sm mb-1.5">Your Batch / Level</label>
          <select value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all mb-2">
            <option disabled value="">Select your batch…</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="Other">Other (type below)</option>
          </select>
          {formData.level === "Other" && (
            <input
              type="text"
              placeholder="Type your level…"
              value={customLevel}
              onChange={(e) => setCustomLevel(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all"
            />
          )}
        </div>
      </div>

      {/* Account Visibility */}
      <div
        onClick={() => setIsPublic((p) => !p)}
        className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:border-white/20 transition-all mb-4 select-none"
      >
        <div>
          <p className="text-white text-sm font-semibold mb-0.5">
            {isPublic ? <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-[#D4AF37] inline" /> Account Visibility — Public</span>
                      : <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-[#606060] inline" /> Account Visibility — Private</span>}
          </p>
          <p className="text-[#505050] text-xs">
            {isPublic
              ? "Anyone can see your practice details and uploaded videos"
              : "Only you and the instructor can see your profile"}
          </p>
        </div>
        <div className={`w-11 h-6 rounded-full transition-all flex-shrink-0 ml-4 flex items-center px-0.5 ${isPublic ? "bg-[#D4AF37]" : "bg-[#303030]"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-playfair font-bold text-white mb-1">Pick Your Songs</h3>
        <p className="text-[#606060] text-xs mb-3">Select what you're practicing — you can add more later</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {allSongs.map((song) => {
            const sel = selectedSongs.includes(song);
            return (
              <button key={song} onClick={() => toggleSong(song)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${sel ? "bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37]" : "bg-[#1A1A1A] border border-white/10 text-[#A0A0A0]"}`}>
                {song}{sel && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mb-2">
          <input type="text" placeholder="Add your own song…" value={newSongInput}
            onChange={(e) => setNewSongInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCustomSong()}
            className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none text-sm" />
          <button onClick={addCustomSong} className="px-4 py-2 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}>
            Add
          </button>
        </div>
        <p className={`text-sm ${selectedSongs.length >= 1 ? "text-[#D4AF37]" : "text-red-500"}`}>
          {selectedSongs.length} song{selectedSongs.length !== 1 ? "s" : ""} selected{" "}
          {selectedSongs.length < 1 && "(select at least 1)"}
        </p>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-5 py-3 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] font-bold border border-white/10 transition-all">Cancel</button>
        <button onClick={handleSubmit} className="flex-1 px-5 py-3 rounded-xl font-bold transition-all"
          style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000", boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}>
          Create Profile
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Student Dashboard
// ─────────────────────────────────────────────
function StudentDashboard({ student, logout, loadData, logPracticeModal, setLogPracticeModal, addSongsModal, setAddSongsModal }) {
  const [richSessions, setRichSessions] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    if (student?.id) {
      fetch(`/api/sessions/student/${student.id}`)
        .then((r) => r.json())
        .then((d) => setRichSessions(d.sessions || []))
        .catch(console.error);
    }
  }, [student?.id]);

  if (!student) return null;

  const sessions = richSessions;
  const totalMinutes = student.total_minutes || 0;
  const sessionCount = student.session_count || 0;
  const songCount = student.songs?.length || 0;

  const songSummary = {};
  sessions.forEach((session) => session.songs?.forEach((song) => { songSummary[song] = (songSummary[song] || 0) + 1; }));
  const songSummaryArray = Object.entries(songSummary).map(([song, count]) => ({ song, count })).sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#0F0F0F] to-[#050505] flex flex-col">
        {/* Nav */}
        <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Guitar className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-playfair font-bold text-white text-sm">Guitar Practice Logs</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#606060] text-sm hidden md:block">{student.name}</span>
              <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-[#A0A0A0] border border-white/10 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-8">
          {/* Welcome */}
          <div>
            <h1 className="text-3xl md:text-5xl font-playfair font-bold mb-1"
              style={{ background: "linear-gradient(to right, #F4E4C1, #D4AF37, #F4E4C1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Welcome back, {student.name}
            </h1>
            <p className="text-[#606060] text-sm">Keep up the practice!</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Timer} label="Minutes" value={totalMinutes} />
            <StatCard icon={Trophy} label="Sessions" value={sessionCount} />
            <StatCard icon={Music} label="Songs" value={songCount} />
          </div>

          {/* Log practice CTA */}
          <button
            onClick={() => setLogPracticeModal(true)}
            className="w-full px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000", boxShadow: "0 0 30px rgba(212,175,55,0.4)" }}
          >
            <Plus className="w-5 h-5" />
            Log Practice Today
          </button>

          {/* Song summary */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 p-6">
            <h2 className="text-xl font-playfair font-bold text-white mb-4">Song Practice Summary</h2>
            {songSummaryArray.length === 0 ? (
              <div className="text-center py-10">
                <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-[#505050]">No practice logged yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-[#606060] text-sm pb-3">Song</th>
                    <th className="text-right text-[#606060] text-sm pb-3">Times</th>
                  </tr>
                </thead>
                <tbody>
                  {songSummaryArray.map(({ song, count }) => (
                    <tr key={song} className="border-b border-white/5">
                      <td className="py-3 text-white text-sm">{song}</td>
                      <td className="py-3 text-right text-[#D4AF37] font-bold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* My songs */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 p-6">
            <h2 className="text-xl font-playfair font-bold text-white mb-4">My Songs</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {student.songs?.map((song) => (
                <span key={song} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#D4AF37]">{song}</span>
              ))}
            </div>
            <button onClick={() => setAddSongsModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] border border-white/10 hover:border-white/20 text-sm transition-all">
              <Plus className="w-4 h-4" /> Add Songs
            </button>
          </div>

          {/* Session history */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 p-6">
            <h2 className="text-xl font-playfair font-bold text-white mb-4">Practice History</h2>
            {sessions.length === 0 ? (
              <div className="text-center py-10">
                <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-[#505050]">No practice logged yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => <SessionCard key={session.id} session={session} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── Privacy toggle ── */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-playfair font-bold text-white mb-1">Profile Visibility</h2>
                <p className="text-[#505050] text-sm">
                  {student.is_public !== 0
                    ? "Your profile is public — anyone can view your sessions and videos."
                    : "Your profile is private — only you and the instructor can see it."}
                </p>
              </div>
              <button
                onClick={async () => {
                  const newVal = student.is_public === 0;
                  await fetch(`/api/students/${student.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_public: newVal }),
                  });
                  loadData();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex-shrink-0 ml-4 ${
                  student.is_public !== 0
                    ? "border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    : "border-white/20 text-[#A0A0A0] hover:border-white/40 hover:text-white"
                }`}
              >
                {student.is_public !== 0 ? <><Globe className="w-4 h-4" /> Public</> : <><Lock className="w-4 h-4" /> Private</>}
              </button>
            </div>
          </div>

        {/* ── Danger zone ── */}
          <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
            <h2 className="text-lg font-playfair font-bold text-red-400 mb-1">Danger Zone</h2>
            <p className="text-[#606060] text-sm mb-4">Permanently delete your account, all practice sessions, and videos. This cannot be undone.</p>
            <button
              onClick={() => setDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-700/50 text-red-400 hover:bg-red-900/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete My Profile
            </button>
          </div>

        <Footer />
      </div>

      {deleteModal && (
        <DeleteProfileModal
          student={student}
          onClose={() => setDeleteModal(false)}
          onDeleted={() => { logout(); loadData(); }}
        />
      )}
      {logPracticeModal && (
        <LogPracticeModal student={student} onClose={() => setLogPracticeModal(false)} onSuccess={() => { setLogPracticeModal(false); loadData(); }} />
      )}
      {addSongsModal && (
        <AddSongsModal student={student} onClose={() => setAddSongsModal(false)} onSuccess={loadData} />
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A1A]/80 to-[#0A0A0A]/80 p-5">
      <Icon className="w-6 h-6 text-[#D4AF37] mb-2" />
      <div className="text-3xl font-playfair font-bold text-white mb-0.5">{value}</div>
      <div className="text-[#606060] text-sm">{label}</div>
    </div>
  );
}

function SessionCard({ session }) {
  const date = new Date(session.created_at);
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-[#111]/40">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white text-sm font-semibold">{formattedDate}</p>
          <p className="text-[#505050] text-xs">{formattedTime}</p>
        </div>
        <div className="flex items-center gap-1 text-[#D4AF37]">
          <Timer className="w-3.5 h-3.5" />
          <span className="font-bold text-sm">{session.minutes} min</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {session.songs?.map((song) => (
          <span key={song} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]">{song}</span>
        ))}
      </div>
      {session.videos?.map((video) => (
        <div key={video.id} className="mt-3 rounded-xl bg-black/30 border border-white/10 p-3 space-y-2">
          <p className="text-xs text-[#505050] flex items-center gap-1"><Film className="w-3 h-3" />{video.original_name || video.filename}</p>
          <video controls className="w-full rounded-lg max-h-48 bg-black" src={`/api/videos/${video.id}`} preload="metadata" />
          {video.comments?.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-white/5">
              <p className="text-xs text-[#A0A0A0] font-semibold flex items-center gap-1"><MessageSquare className="w-3 h-3" />Tutor feedback</p>
              {video.comments.map((c) => (
                <div key={c.id} className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg p-2">
                  <p className="text-white text-sm">{c.text}</p>
                  <p className="text-[#505050] text-xs mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Log Practice modal
// ─────────────────────────────────────────────
function LogPracticeModal({ student, onClose, onSuccess }) {
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [minutes, setMinutes] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [practiceDate, setPracticeDate] = useState("");
  const [practiceTime, setPracticeTime] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const toggleSong = (song) =>
    setSelectedSongs((prev) => prev.includes(song) ? prev.filter((s) => s !== song) : [...prev, song]);

  const handleSubmit = async () => {
    if (selectedSongs.length === 0) { setError("Select at least one song"); return; }
    if (!minutes || parseInt(minutes) <= 0) { setError("Enter how many minutes you practiced"); return; }
    setSaving(true);
    setError("");
    try {
      const sessRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, songs: selectedSongs, minutes: parseInt(minutes), practiceDate: practiceDate || null, practiceTime: practiceTime || null }),
      });
      if (!sessRes.ok) throw new Error("Failed to save session");
      const { session } = await sessRes.json();

      if (videoFile) {
        const form = new FormData();
        form.append("video", videoFile);
        form.append("sessionId", String(session.id));
        form.append("studentId", String(student.id));
        const vidRes = await fetch("/api/videos", { method: "POST", body: form });
        if (!vidRes.ok) throw new Error("Session saved but video upload failed");
      }
      setDone(true);
      setTimeout(onSuccess, 1200);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <p className="text-white text-xl font-playfair font-bold">Session saved!</p>
          {videoFile && <p className="text-[#A0A0A0] text-sm mt-2">Video uploaded</p>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <Timer className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
      <h2 className="text-2xl font-playfair font-bold text-white text-center mb-6">Log Practice Session</h2>

      {/* Songs */}
      <div className="mb-5">
        <label className="block text-white font-semibold mb-2 text-sm">Songs practiced</label>
        {student.songs?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {student.songs.map((song) => {
              const sel = selectedSongs.includes(song);
              return (
                <button key={song} onClick={() => toggleSong(song)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${sel ? "bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37]" : "bg-[#1A1A1A] border border-white/10 text-[#A0A0A0]"}`}>
                  {song}{sel && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[#505050] text-sm">No songs added yet — add some from your dashboard.</p>
        )}
      </div>

      {/* Minutes */}
      <div className="mb-5">
        <label className="block text-white font-semibold mb-2 text-sm">Minutes practiced</label>
        <input type="number" min="1" placeholder="e.g. 30" value={minutes}
          onChange={(e) => { setMinutes(e.target.value); setError(""); }}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all" />
      </div>

      {/* Video upload */}
      <div className="mb-5">
        <label className="block text-white font-semibold mb-2 text-sm flex items-center gap-2">
          <Video className="w-4 h-4 text-[#D4AF37]" />
          Video clip <span className="text-[#505050] font-normal">(optional)</span>
        </label>
        <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1A1A1A] border border-white/10 hover:border-[#D4AF37]/40 cursor-pointer transition-all">
          <Upload className="w-5 h-5 text-[#606060] flex-shrink-0" />
          <span className="text-sm text-[#606060] truncate">{videoFile ? videoFile.name : "Choose a video file…"}</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files[0] || null)} />
        </label>
      </div>

      {/* Advanced date/time */}
      <div className="mb-5">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-[#505050] hover:text-[#A0A0A0] transition-all">
          <Calendar className="w-4 h-4" />
          {showAdvanced ? "Hide date/time" : "Set a specific date / time"}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input type="date" value={practiceDate} onChange={(e) => setPracticeDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none" />
            <input type="time" value={practiceTime} onChange={(e) => setPracticeTime(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none" />
          </div>
        )}
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-5 py-3 rounded-xl bg-[#1A1A1A] text-[#A0A0A0] font-bold border border-white/10 transition-all">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="flex-1 px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000", boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}>
          {saving ? "Saving…" : "Save Session"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Add Songs modal
// ─────────────────────────────────────────────
function AddSongsModal({ student, onClose, onSuccess }) {
  const [newSongInput, setNewSongInput] = useState("");
  const availableHardcoded = HARDCODED_SONGS.filter((s) => !student.songs.includes(s));

  const addSong = async (song) => {
    try {
      const updatedSongs = [...student.songs, song];
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs: updatedSongs }),
      });
      if (!res.ok) throw new Error("Failed to add song");
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const addCustom = () => {
    if (newSongInput.trim() && !student.songs.includes(newSongInput.trim())) {
      addSong(newSongInput.trim());
      setNewSongInput("");
    }
  };

  return (
    <Modal onClose={onClose}>
      <Music className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
      <h2 className="text-2xl font-playfair font-bold text-white text-center mb-6">Add Songs</h2>

      {availableHardcoded.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableHardcoded.map((song) => (
            <button key={song} onClick={() => addSong(song)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#1A1A1A] border border-white/10 text-[#A0A0A0] hover:border-[#D4AF37]/50 transition-all flex items-center gap-1.5">
              <Plus className="w-3 h-3" />{song}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <input type="text" placeholder="Type a song name…" value={newSongInput}
          onChange={(e) => setNewSongInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addCustom()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:border-[#D4AF37] focus:outline-none text-sm" />
        <button onClick={addCustom} className="px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}>
          Add
        </button>
      </div>

      <button onClick={onClose} className="w-full px-5 py-3 rounded-xl font-bold transition-all"
        style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000", boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}>
        Done
      </button>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Admin Dashboard
// ─────────────────────────────────────────────
function AdminDashboard({ students, sessions, logout, adminPassword, setViewStudentModal, viewStudentModal }) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const [passwords, setPasswords] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [revealMap, setRevealMap] = useState({});
  const [pwError, setPwError] = useState("");

  const loadPasswords = async () => {
    setPwLoading(true);
    setPwError("");
    try {
      const res = await fetch("/api/admin/reveal-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      if (!res.ok) { setPwError("Could not load passwords."); return; }
      const data = await res.json();
      setPasswords(data.students || []);
    } catch {
      setPwError("Network error loading passwords.");
    } finally {
      setPwLoading(false);
    }
  };

  const toggleReveal = (id) => setRevealMap((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#0F0F0F] to-[#050505] flex flex-col">
        <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-playfair font-bold text-white text-sm">Admin Dashboard</span>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-[#A0A0A0] border border-white/10 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-playfair font-bold mb-1"
              style={{ background: "linear-gradient(to right, #F4E4C1, #D4AF37, #F4E4C1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Welcome, {ADMIN.name}
            </h1>
            <p className="text-[#606060] text-sm">Monitor your students' progress</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Music} label="Students" value={students.length} />
            <StatCard icon={Trophy} label="Sessions" value={sessions.length} />
            <StatCard icon={Timer} label="Total Min" value={totalMinutes} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 p-6">
            <h2 className="text-xl font-playfair font-bold text-white mb-6">Students</h2>
            {students.length === 0 ? (
              <div className="text-center py-10">
                <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-[#505050]">No students yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((student) => (
                  <div key={student.id} className="rounded-2xl border border-white/10 bg-[#111]/60 p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-playfair font-bold text-[#D4AF37]">{student.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-playfair font-bold text-white">{student.name}</h3>
                        <div className="flex gap-3 text-xs text-[#606060] mt-0.5">
                          <span>{student.total_minutes} min</span>
                          <span>{student.session_count} sessions</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {student.songs?.slice(0, 3).map((song) => (
                        <span key={song} className="px-2 py-0.5 rounded-full text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">{song}</span>
                      ))}
                      {student.songs?.length > 3 && <span className="text-xs text-[#505050]">+{student.songs.length - 3} more</span>}
                    </div>
                    <button onClick={() => setViewStudentModal(student)} className="w-full px-4 py-2 rounded-xl font-bold text-sm transition-all"
                      style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}>
                      View Progress
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

          {/* ── Student Passwords Panel ── */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/90 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-playfair font-bold text-white">Student Passwords</h2>
                <p className="text-[#505050] text-xs mt-0.5">If a student forgets their password, share it with them privately</p>
              </div>
              {passwords === null && (
                <button
                  onClick={loadPasswords}
                  disabled={pwLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {pwLoading ? "Loading…" : "View Passwords"}
                </button>
              )}
            </div>

            {pwError && <p className="text-red-400 text-sm mb-4">{pwError}</p>}

            {passwords === null ? (
              <div className="text-center py-8 text-[#505050] text-sm">
                <Lock className="w-8 h-8 mx-auto mb-3 text-white/10" />
                Click "View Passwords" to reveal student passwords
              </div>
            ) : passwords.length === 0 ? (
              <p className="text-[#505050] text-sm text-center py-4">No students yet</p>
            ) : (
              <div className="space-y-2">
                {passwords.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0A0A0A]/60 border border-white/5">
                    <span className="text-white text-sm font-semibold">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-[#D4AF37] select-all tracking-wider">
                        {revealMap[s.id]
                          ? (s.plain_password || <span className="text-[#505050] italic text-xs">not set</span>)
                          : "••••••••"}
                      </span>
                      <button
                        onClick={() => toggleReveal(s.id)}
                        className="text-[#606060] hover:text-[#D4AF37] transition-colors"
                        title={revealMap[s.id] ? "Hide" : "Show"}
                      >
                        {revealMap[s.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => { setPasswords(null); setRevealMap({}); }}
                  className="mt-3 flex items-center gap-1.5 text-xs text-[#505050] hover:text-[#A0A0A0] transition-colors"
                >
                  <EyeOff className="w-3 h-3" /> Hide all passwords
                </button>
              </div>
            )}
          </div>

        <Footer />
      </div>

      {viewStudentModal && <ViewStudentModal student={viewStudentModal} onClose={() => setViewStudentModal(null)} />}
    </>
  );
}

// ─────────────────────────────────────────────
// View Student modal (admin)
// ─────────────────────────────────────────────
function ViewStudentModal({ student, onClose }) {
  const [richSessions, setRichSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    fetch(`/api/sessions/student/${student.id}`)
      .then((r) => r.json())
      .then((d) => { setRichSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { reload(); }, [student.id]);

  const songSummary = {};
  richSessions.forEach((s) => s.songs?.forEach((song) => { songSummary[song] = (songSummary[song] || 0) + 1; }));
  const songSummaryArray = Object.entries(songSummary).map(([song, count]) => ({ song, count })).sort((a, b) => b.count - a.count);

  return (
    <Modal onClose={onClose} large>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/50 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-playfair font-bold text-[#D4AF37]">{student.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-2xl font-playfair font-bold text-white">{student.name}</h2>
          <div className="flex gap-3 text-sm text-[#606060] mt-0.5">
            <span>{student.total_minutes} min</span>
            <span>{student.session_count} sessions</span>
          </div>
        </div>
      </div>

      {songSummaryArray.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[#A0A0A0] mb-3 uppercase tracking-wider">Song Summary</h3>
          <table className="w-full text-sm">
            <tbody>
              {songSummaryArray.map(({ song, count }) => (
                <tr key={song} className="border-b border-white/5">
                  <td className="py-2 text-white">{song}</td>
                  <td className="py-2 text-right text-[#D4AF37] font-bold">{count}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#A0A0A0] mb-3 uppercase tracking-wider">Practice Sessions</h3>
        {loading ? (
          <p className="text-[#505050] text-center py-4">Loading…</p>
        ) : richSessions.length === 0 ? (
          <p className="text-[#505050] text-center py-4">No sessions yet</p>
        ) : (
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {richSessions.map((session) => (
              <AdminSessionCard key={session.id} session={session} onCommentAdded={reload} />
            ))}
          </div>
        )}
      </div>

      <button onClick={onClose} className="w-full px-5 py-3 rounded-xl font-bold transition-all"
        style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000", boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}>
        Close
      </button>
    </Modal>
  );
}

function AdminSessionCard({ session, onCommentAdded }) {
  const date = new Date(session.created_at);
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-[#111]/40 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold text-sm">{formattedDate} · {formattedTime}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {session.songs?.map((song) => (
              <span key={song} className="px-2 py-0.5 rounded-full text-xs bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]">{song}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#D4AF37]">
          <Timer className="w-3 h-3" /><span className="text-sm font-bold">{session.minutes}m</span>
        </div>
      </div>
      {session.videos?.map((video) => (
        <VideoWithComments key={video.id} video={video} onCommentAdded={onCommentAdded} />
      ))}
    </div>
  );
}

function VideoWithComments({ video, onCommentAdded }) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(video.comments || []);

  const addComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, text: comment.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalComments((prev) => [...prev, data.comment]);
      setComment("");
      onCommentAdded?.();
    } catch { console.error("Comment error"); } finally { setSubmitting(false); }
  };

  const deleteComment = async (id) => {
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    setLocalComments((prev) => prev.filter((c) => c.id !== id));
    onCommentAdded?.();
  };

  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-3">
      <p className="text-xs text-[#505050] flex items-center gap-1"><Film className="w-3 h-3" />{video.original_name || video.filename}</p>
      <video controls className="w-full rounded-lg max-h-64 bg-black" src={`/api/videos/${video.id}`} preload="metadata" />
      {localComments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#A0A0A0] font-semibold flex items-center gap-1"><MessageSquare className="w-3 h-3" />Tutor comments</p>
          {localComments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg p-2">
              <div>
                <p className="text-white text-sm">{c.text}</p>
                <p className="text-[#505050] text-xs mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => deleteComment(c.id)} className="text-red-400 hover:text-red-300 flex-shrink-0 p-1"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" placeholder="Add a comment…" value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addComment()}
          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none" />
        <button onClick={addComment} disabled={submitting || !comment.trim()} className="px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          style={{ background: "linear-gradient(to right, #D4AF37, #F4E4C1)", color: "#000" }}>
          {submitting ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal wrapper
// ─────────────────────────────────────────────
function Modal({ children, onClose, large }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div
        className={`rounded-3xl border border-white/10 bg-gradient-to-b from-[#1A1A1A]/98 to-[#0A0A0A]/98 backdrop-blur-xl p-8 ${large ? "max-w-2xl w-full max-h-[90vh] overflow-y-auto" : "max-w-md w-full"}`}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505] mt-8">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Guitar className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-playfair font-bold text-white text-lg">Guitar Practice Logs</span>
            </div>
            <p className="text-[#505050] text-sm leading-relaxed mb-2">
              Play daily · Log your practice · Improve
            </p>
            <p className="text-[#D4AF37] text-xs font-semibold">Made for better earning</p>
          </div>


          {/* Links/info */}
          <div className="md:text-right">
            <p className="text-[#606060] text-sm mb-1">Student Practice Portal</p>
            <p className="text-[#404040] text-xs leading-relaxed">
              Track your sessions · Review tutor feedback<br />Log videos · Improve daily
            </p>
            <p className="text-[#404040] text-xs mt-3">Developed by <span className="text-[#D4AF37]">Aman</span></p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/5 pt-5 space-y-2 text-center text-[#303030] text-xs leading-relaxed">
          <p className="text-[#383838] italic max-w-2xl mx-auto">
            ⚠ This is a purely unofficial tool created by a previous batch student to contribute to better learning. It has no association with RV University or any official institution. Use at your own discretion.
          </p>
          <p>© 2025 Guitar Practice Logs · All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
