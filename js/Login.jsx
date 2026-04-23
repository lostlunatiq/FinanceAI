// Tijori AI — Login Screen

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = React.useState('fin_admin');
  const [password, setPassword] = React.useState('demo1234');
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Enter username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { AuthAPI } = window.TijoriAPI;
      const user = await AuthAPI.login(username.trim(), password);
      localStorage.setItem('tj_authed', '1');
      localStorage.setItem('tj_role',String(user.employee_grade || 1) );
      localStorage.setItem('tj_user', JSON.stringify({
        name: `${user.first_name} ${user.last_name}`.trim() || user.username,
        initials: ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || user.username.slice(0, 2).toUpperCase(),
        id:             user.id,
        employee_grade: user.employee_grade,
        is_superuser:   user.is_superuser,      // ✅ for CFO/superuser detection
        department:     user.department_name || '',
      }));
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin(); };

  // Animated dot grid via canvas-like SVG pattern
  const dots = [];
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 14; col++) {
      dots.push({ x: col * 38 + 18, y: row * 38 + 18, delay: (row + col) * 0.05 });
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* LEFT PANEL */}
      <div style={{ width: '52%', background: '#0F172A', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '36px 48px' }}>
        {/* Dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="1.5" fill="#E8783B"
              style={{ animation: `dotDrift ${3 + (i % 4)}s ease-in-out infinite`, animationDelay: `${d.delay}s` }} />
          ))}
        </svg>

        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -120, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,120,59,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Abstract geometric SVG */}
        <svg style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', opacity: 0.08 }} width="280" height="280" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="120" stroke="#E8783B" strokeWidth="1" fill="none"/>
          <circle cx="140" cy="140" r="90" stroke="#E8783B" strokeWidth="1" fill="none"/>
          <circle cx="140" cy="140" r="60" stroke="#E8783B" strokeWidth="1" fill="none"/>
          <line x1="20" y1="140" x2="260" y2="140" stroke="#E8783B" strokeWidth="1"/>
          <line x1="140" y1="20" x2="140" y2="260" stroke="#E8783B" strokeWidth="1"/>
          <rect x="110" y="110" width="60" height="60" stroke="#E8783B" strokeWidth="1" fill="none" transform="rotate(45 140 140)"/>
        </svg>

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(232,120,59,0.5)' }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: 'white', letterSpacing: '-0.5px' }}>Tijori AI</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8783B', boxShadow: '0 0 10px #E8783B', animation: 'glowPulse 2s ease infinite', display: 'block' }} />
        </div>

        {/* Center headline */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#475569', marginBottom: '20px' }}>Enterprise Finance OS</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '44px', lineHeight: 1.1, letterSpacing: '-1.5px', color: 'white', marginBottom: '16px' }}>
            The{' '}
            <span style={{ background: 'linear-gradient(135deg, #E8783B, #FF6B35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Intelligent</span>
            <br/>Financial OS<br/>for Enterprise.
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, maxWidth: 360, marginBottom: '32px' }}>
            AI-native accounts payable, anomaly detection, and real-time cash intelligence — unified.
          </p>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
            {[
              { val: '94%', label: 'Faster Cycles' },
              { val: '$2.4M', label: 'Leakage Caught' },
              { val: '12×', label: 'ROI Average' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 16px', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: 'white', letterSpacing: '-1px' }}>{s.val}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px 22px', backdropFilter: 'blur(12px)' }}>
            <div style={{ fontSize: '28px', color: '#E8783B', lineHeight: 0.8, marginBottom: '10px', fontFamily: 'Georgia, serif' }}>"</div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '14px' }}>
              Tijori AI reduced our month-end close from 12 days to 3. The anomaly engine caught ₹1.8Cr in duplicate invoices in the first quarter alone.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '12px', color: 'white' }}>SP</div>
              <div>
                <div style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>Sunita Prasad</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>CFO, Meridian Industries</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 400ms ease both' }}>
          {/* Eyebrow */}
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '12px' }}>Enterprise Access</div>

          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.2px', marginBottom: '6px' }}>Welcome back.</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '28px' }}>Sign in to your financial command center.</p>

          {/* SSO Button */}
          <button style={{ width: '100%', padding: '12px 20px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px', marginBottom: '20px', transition: 'all 150ms ease' }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}>
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Continue with Microsoft SSO
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          {/* Username */}
          <TjInput label="Username" placeholder="e.g. fin_admin" type="text" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKeyDown} icon="✉" />

          {/* Password */}
          <div style={{ marginBottom: '8px' }}>
            <TjInput label="Password" placeholder="Enter your password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} icon="🔒"
              rightIcon={<span style={{ fontSize: '13px' }}>{showPass ? '🙈' : '👁'}</span>} onRightIconClick={() => setShowPass(!showPass)} />
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'right', marginBottom: '14px', marginTop: '-4px' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Demo: fin_admin / demo1234 | vendor1 / demo1234</span>
          </div>

          {/* CTA */}
          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#94A3B8' : 'linear-gradient(135deg, #E8783B, #FF6B35)', color: 'white', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '14px', position: 'relative', overflow: 'hidden', transition: 'all 200ms ease', boxShadow: loading ? 'none' : '0 4px 16px rgba(232,120,59,0.3)', letterSpacing: '-0.1px' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Authenticating…
              </span>
            ) : 'Sign In to Dashboard'}
          </button>

          {/* Footer */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>© 2026 Tijori AI, Inc.</span>
            <div style={{ display: 'flex', gap: '14px' }}>
              {['Privacy', 'Security', 'Terms'].map(l => (
                <span key={l} style={{ fontSize: '11px', color: '#94A3B8', cursor: 'pointer', fontWeight: 500 }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotDrift {
          0%, 100% { transform: translate(0,0); opacity: 0.5; }
          50% { transform: translate(4px,-4px); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 10px #E8783B; }
          50% { box-shadow: 0 0 20px #FF6B35, 0 0 30px #E8783B; }
        }
      `}</style>
    </div>
  );
};

Object.assign(window, { LoginScreen });
