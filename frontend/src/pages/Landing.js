import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Shield,
  Video,
  Calendar,
  ArrowRight,
  CheckCircle,
  Activity,
  Users,
  LockKeyhole,
  Stethoscope,
  FileText,
  MessageCircle,
  Menu,
  X,
  Sparkles,
  CircleCheck,
  HeartPulse,
  ChevronRight,
} from 'lucide-react';
import './Landing.css';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const viewportSettings = { once: true, amount: 0.15 };

const features = [
  {
    icon: Video,
    title: 'Virtual consultations',
    description:
      'Connect with healthcare professionals through convenient online consultations without unnecessary travel.',
    color: 'green',
  },
  {
    icon: Calendar,
    title: 'Easy appointments',
    description:
      'Find available doctors, request appointments, and keep your healthcare schedule organized.',
    color: 'blue',
  },
  {
    icon: FileText,
    title: 'Health records',
    description:
      'Access your available medical information and keep important healthcare details organized.',
    color: 'purple',
  },
  {
    icon: MessageCircle,
    title: 'Direct communication',
    description:
      'Stay connected with your care team through the communication features available on the platform.',
    color: 'orange',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create your account',
    description:
      'Register through the platform and complete the information required for your account.',
    icon: Users,
  },
  {
    number: '02',
    title: 'Connect with a doctor',
    description:
      'Explore available healthcare professionals and follow the appointment process.',
    icon: Calendar,
  },
  {
    number: '03',
    title: 'Get care online',
    description:
      'Use the available consultation and communication tools to connect with your healthcare provider.',
    icon: HeartPulse,
  },
];

const Landing = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="lp-root">
      {/* Navigation */}
      <nav className="lp-nav" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <Link
            to="/"
            className="lp-brand"
            aria-label="MediCare home"
            onClick={closeMenu}
          >
            <div className="lp-brand-icon">
              <Heart size={21} fill="white" strokeWidth={2.4} />
            </div>
            <span>MediCare</span>
          </Link>

          <div className={`lp-nav-links ${menuOpen ? 'lp-menu-open' : ''}`}>
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#security" onClick={closeMenu}>Security</a>
            <a href="#how" onClick={closeMenu}>How it works</a>
          </div>

          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-ghost" onClick={closeMenu}>
              Sign in
            </Link>
            <Link to="/register" className="lp-btn-primary" onClick={closeMenu}>
              Get started <ArrowRight size={16} />
            </Link>
          </div>

          <button
            type="button"
            className="lp-mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-bg-grid" aria-hidden="true" />

          <motion.div
            className="lp-hero-content"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="lp-pill">
              <span className="lp-pill-dot" />
              Healthcare, made more accessible
            </motion.div>

            <motion.h1 variants={fadeUp} className="lp-title">
              Better care.
              <br />
              <span className="lp-text-gradient">Closer to you.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="lp-subtitle">
              Your healthcare journey, made simpler. Connect with healthcare
              professionals, manage appointments, and access your available
              care tools from one convenient platform.
            </motion.p>

            <motion.div variants={fadeUp} className="lp-hero-actions">
              <Link to="/register" className="lp-btn-primary lp-btn-lg">
                Get started <ArrowRight size={19} />
              </Link>
              <Link to="/login" className="lp-btn-secondary lp-btn-lg">
                <Stethoscope size={18} />
                Sign in to your account
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="lp-social-proof">
              <div className="lp-proof-icon">
                <Shield size={20} />
              </div>
              <div>
                <strong>Care with confidence</strong>
                <p>Designed around convenient access to care</p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="lp-hero-benefits">
              <span><CircleCheck size={16} /> Convenient access</span>
              <span><CircleCheck size={16} /> Simple scheduling</span>
              <span><CircleCheck size={16} /> Connected care</span>
            </motion.div>
          </motion.div>

          {/* Animated dashboard preview */}
          <motion.div
            className="lp-hero-visual"
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
          >
            <div className="lp-orbit lp-orbit-one" aria-hidden="true" />
            <div className="lp-orbit lp-orbit-two" aria-hidden="true" />

            <div className="lp-mockup">
              <div className="lp-mockup-header">
                <div className="lp-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="lp-url-bar">medicare.app / dashboard</div>
                <Shield size={14} color="#059669" />
              </div>

              <div className="lp-mockup-body">
                <div className="lp-mockup-sidebar">
                  <div className="lp-ms-item active"><Activity size={16} /></div>
                  <div className="lp-ms-item"><Calendar size={16} /></div>
                  <div className="lp-ms-item"><Video size={16} /></div>
                  <div className="lp-ms-item"><FileText size={16} /></div>
                </div>

                <div className="lp-mockup-content">
                  <div className="lp-dashboard-welcome">
                    <div>
                      <span className="lp-preview-eyebrow">YOUR HEALTH SPACE</span>
                      <div className="lp-mc-header" />
                    </div>
                    <div className="lp-preview-avatar"><HeartPulse size={19} /></div>
                  </div>

                  <div className="lp-preview-stat-row">
                    <div className="lp-preview-stat">
                      <span className="lp-preview-stat-icon green">
                        <Calendar size={15} />
                      </span>
                      <span className="lp-preview-line" />
                      <span className="lp-preview-line short" />
                    </div>
                    <div className="lp-preview-stat">
                      <span className="lp-preview-stat-icon blue">
                        <HeartPulse size={15} />
                      </span>
                      <span className="lp-preview-line" />
                      <span className="lp-preview-line short" />
                    </div>
                  </div>

                  <div className="lp-mc-chart">
                    <div className="lp-chart-label">
                      <span>Health activity</span>
                      <span className="lp-chart-tag">Overview</span>
                    </div>
                    <svg
                      className="lp-chart-svg"
                      viewBox="0 0 400 115"
                      role="img"
                      aria-label="Illustrative health activity chart"
                    >
                      <defs>
                        <linearGradient id="lpChartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity=".23" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 91 C28 82 34 66 63 73 S103 89 129 56 S171 69 197 45 S240 60 267 31 S310 52 335 24 S376 36 400 10 L400 115 L0 115 Z"
                        fill="url(#lpChartFill)"
                      />
                      <path
                        d="M0 91 C28 82 34 66 63 73 S103 89 129 56 S171 69 197 45 S240 60 267 31 S310 52 335 24 S376 36 400 10"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="335" cy="24" r="5" fill="#fff" stroke="#059669" strokeWidth="3" />
                    </svg>
                  </div>

                  <div className="lp-mc-row">
                    <div className="lp-mc-card">
                      <span className="lp-preview-card-icon"><Video size={15} /></span>
                      <span className="lp-preview-line" />
                      <span className="lp-preview-line short" />
                    </div>
                    <div className="lp-mc-card">
                      <span className="lp-preview-card-icon blue"><FileText size={15} /></span>
                      <span className="lp-preview-line" />
                      <span className="lp-preview-line short" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              className="lp-float-card lp-fc-1"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="lp-fc-icon green"><Video size={20} /></div>
              <div>
                <strong>Virtual care</strong>
                <p>Connect from wherever you are</p>
              </div>
            </motion.div>

            <motion.div
              className="lp-float-card lp-fc-2"
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="lp-fc-icon blue"><CheckCircle size={20} /></div>
              <div>
                <strong>Stay organized</strong>
                <p>Keep track of your care</p>
              </div>
            </motion.div>

            <motion.div
              className="lp-floating-badge"
              animate={{ rotate: [0, 5, -5, 0], y: [0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
            >
              <HeartPulse size={22} />
            </motion.div>
          </motion.div>
        </section>

        {/* Platform highlights */}
        <section className="lp-logos" aria-label="Platform highlights">
          <p>A more connected healthcare experience</p>
          <div className="lp-logo-row">
            <div className="lp-logo"><Video /> Virtual consultations</div>
            <div className="lp-logo"><Calendar /> Appointments</div>
            <div className="lp-logo"><FileText /> Health information</div>
            <div className="lp-logo"><HeartPulse /> Patient-focused care</div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="lp-section">
          <motion.div
            className="lp-section-header"
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="lp-section-eyebrow">
              <Sparkles size={15} /> BUILT FOR BETTER ACCESS
            </motion.div>
            <motion.h2 variants={fadeUp}>
              Healthcare that fits
              <br />
              <span className="lp-text-gradient">your everyday life.</span>
            </motion.h2>
            <motion.p variants={fadeUp}>
              Thoughtful digital tools help make the experience of managing
              appointments and connecting with healthcare professionals simpler.
            </motion.p>
          </motion.div>

          <motion.div
            className="lp-bento"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            <motion.div className="lp-bento-item large" variants={fadeUp}>
              <div className="lp-bento-icon"><Video size={27} /></div>
              <span className="lp-feature-kicker">CONNECTED CARE</span>
              <h3>Consultations from wherever you are.</h3>
              <p>
                Access the platform's video consultation features to connect
                with healthcare professionals remotely when available.
              </p>
              <div className="lp-bento-visual video-ui">
                <div className="vui-header">
                  <span />
                  <span />
                  <span />
                  <div className="lp-vui-status"><span /> Consultation preview</div>
                </div>
                <div className="vui-body">
                  <div className="vui-doctor">
                    <Stethoscope size={29} />
                  </div>
                  <div className="lp-vui-caption">
                    <span>Virtual consultation</span>
                    <span className="lp-vui-caption-dot" />
                  </div>
                  <div className="vui-controls">
                    <span><Video size={14} /></span>
                    <span><MessageCircle size={14} /></span>
                    <span><Heart size={14} /></span>
                  </div>
                </div>
              </div>
            </motion.div>

            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  className={`lp-bento-item small lp-feature-${feature.color}`}
                  variants={fadeUp}
                  key={feature.title}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="lp-bento-icon"><Icon size={26} /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="lp-feature-bottom">
                    <span>Explore feature</span>
                    <ChevronRight size={17} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Security */}
        <section id="security" className="lp-section lp-security-section">
          <div className="lp-security-grid">
            <motion.div
              className="lp-security-content"
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              variants={stagger}
            >
              <motion.div variants={fadeUp} className="lp-section-eyebrow">
                <Shield size={15} /> PRIVACY MATTERS
              </motion.div>
              <motion.h2 variants={fadeUp}>
                Your healthcare information deserves
                <span className="lp-text-gradient"> thoughtful protection.</span>
              </motion.h2>
              <motion.p variants={fadeUp}>
                Healthcare information is personal. MediCare is designed to
                support a more organized digital care experience, with security
                and responsible access remaining essential priorities.
              </motion.p>

              <motion.div variants={fadeUp} className="lp-security-list">
                <div>
                  <span className="lp-security-check"><LockKeyhole size={18} /></span>
                  <div>
                    <strong>Account access</strong>
                    <p>Use your account credentials and keep them private.</p>
                  </div>
                </div>
                <div>
                  <span className="lp-security-check"><Shield size={18} /></span>
                  <div>
                    <strong>Privacy-conscious design</strong>
                    <p>Protect personal and medical information responsibly.</p>
                  </div>
                </div>
                <div>
                  <span className="lp-security-check"><Users size={18} /></span>
                  <div>
                    <strong>Role-based experience</strong>
                    <p>Dedicated experiences for patients and healthcare professionals.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Link to="/register" className="lp-btn-primary lp-btn-lg">
                  Get started <ArrowRight size={18} />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              className="lp-security-visual"
              initial={{ opacity: 0, scale: 0.92, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={viewportSettings}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="lp-security-glow" />
              <div className="lp-security-ring lp-ring-one" />
              <div className="lp-security-ring lp-ring-two" />
              <motion.div
                className="lp-security-shield"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Shield size={76} strokeWidth={1.4} />
                <div className="lp-security-heart"><Heart size={27} fill="white" /></div>
              </motion.div>
              <div className="lp-security-chip lp-chip-one">
                <LockKeyhole size={17} /> Privacy matters
              </div>
              <div className="lp-security-chip lp-chip-two">
                <CircleCheck size={17} /> Secure access
              </div>
              <div className="lp-security-orbit-dot" />
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="lp-section lp-bg-gray">
          <motion.div
            className="lp-section-header"
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="lp-section-eyebrow">
              <Activity size={15} /> YOUR JOURNEY
            </motion.div>
            <motion.h2 variants={fadeUp}>Three steps to get connected.</motion.h2>
            <motion.p variants={fadeUp}>
              Start with your account and use the available tools to manage
              your healthcare journey.
            </motion.p>
          </motion.div>

          <motion.div
            className="lp-steps"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.article
                  className="lp-step"
                  variants={fadeUp}
                  key={step.number}
                  whileHover={{ y: -7 }}
                >
                  <div className="lp-step-num">{step.number}</div>
                  <div className="lp-step-icon"><Icon size={23} /></div>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </section>

        {/* Final call to action */}
        <motion.section
          className="lp-cta"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportSettings}
          transition={{ duration: 0.7 }}
        >
          <div className="lp-cta-content">
            <div className="lp-cta-icon"><HeartPulse size={28} /></div>
            <div className="lp-cta-eyebrow">YOUR NEXT STEP STARTS HERE</div>
            <h2>Make your healthcare journey simpler.</h2>
            <p>
              Create your account and explore a more convenient way to connect
              with your healthcare team.
            </p>
            <div className="lp-cta-actions">
              <Link to="/register" className="lp-btn-white lp-btn-lg">
                Create your account <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="lp-btn-outline-white lp-btn-lg">
                Sign in
              </Link>
            </div>
            <div className="lp-cta-note">
              <CheckCircle size={15} /> Getting started is simple
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-main">
            <Link to="/" className="lp-brand">
              <div className="lp-brand-icon">
                <Heart size={19} fill="white" />
              </div>
              <span>MediCare</span>
            </Link>
            <p>
              Bringing healthcare access and digital convenience closer together.
            </p>
          </div>

          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#security">Security</a>
            <a href="#how">How it works</a>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </div>

          <div className="lp-footer-bottom">
            <span>Â© {new Date().getFullYear()} MediCare. All rights reserved.</span>
            <span><Heart size={14} fill="#10b981" color="#10b981" /> Designed for connected care</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

