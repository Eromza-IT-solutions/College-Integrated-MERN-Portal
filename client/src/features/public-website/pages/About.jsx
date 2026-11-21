import president from "../../../assets/images/president-inamdar.jpg";
import abedaInamdar from "../../../assets/images/abeda-inamdar.jpg";
import principal from "../../../assets/images/principal-bootwala.jpg";
import aboutAisc from "../../../assets/images/about-aisc.jpg";
import aboutMces from "../../../assets/images/about-mces.jpg";
import { Phone, Mail, MapPin, ChevronsRight, ArrowRight, BadgeCheck, Landmark, Users, BookOpen } from "lucide-react";

/* Put the 5 images from the "images" folder into your app's /public/images folder. */

const TOP_LINKS = [
  ["Login", "/login"],
  ["Feedback", "/feedback"],
  ["Alumni", "/alumni"],
  ["Gallery", "/gallery"],
  ["Contact", "/contact"],
];

const LEADERS = [
  {
    id: "president-message",
    img: president,
    name: "Dr. P. A. Inamdar",
    role: "Past President (M.C.E. Society)",
    text: [
      "The Global economic scenario is changing rapidly, what was modern yesterday is suddenly obsolete today. Thus the industries need trained personnel who can innovate rather than just follow others.",
      "I strongly believe that if the right kind of soft skills, Communication and language skills and computer knowledge are imparted to the students, there is no doubt that they will be able to not only lead the community but also develop a strong nation. At Abeda Inamdar Senior College, Pune, our aim is to produce such talented, young and dynamic professionals.",
      "Our students have been trained and carefully nurtured in an atmosphere that is creative, harmonizing and challenging to tackle the intense competition. What I found in our students is that once they set a goal for themselves they are very success oriented.",
      "I wish the students, teachers and non teaching staff all the very best for the coming academic year.",
    ],
    cta: "Introductory Video",
  },
  {
    id: "vp-message",
   img: abedaInamdar,
    name: "Mrs. Abeda Inamdar",
    role: "President (M.C.E. Society), Founder Abeda Inamdar Senior College",
    text: [
      "She has keen interest in Education, particularly Women’s Education. For this reason she has donated a huge amount for establishing Abeda Inamdar Junior College for Girls and Abeda Inamdar Senior College for Girls at Pune, where at present 10,000 girls are taking education in Arts, Science, Commerce and Computer faculty. Member Committee on Girls Education: National Commission for Minority Educational Institution, New Delhi. Senate Member - Swami Ramanand Teerth Marathwada University, Nanded. Ex Senate Member of University of Pune. Managing Trustee & Past President - Poona Women’s Council. Vice President - University Women’s Association.",
    ],
    cta: "Read More",
  },
  {
    id: "principal-message",
    img: principal,
    name: "Prof. (Dr) Shaila Bootwala",
    role: "Principal (Abeda Inamdar Senior College)",
    text: [
      "We at M.C.E. Society's Abeda Inamdar Senior College believe in the philosophy 'to educate is to empower'. The mission statement of the college - 'Read to Lead' is truly emblematic of this philosophy. Empowerment, however, requires more than academic excellence. In today's competitive and demanding world, our students must also excel in sports and extracurricular activities. These will equip them with the necessary soft skills to go that extra mile. The college makes every possible attempt to synergize this into the education process. The highly efficient teaching staff ensures academic excellence. Well equipped library, sports complex and laboratories ensure an environment conducive to learning. Cultural gatherings, sports tournaments, publication of bulletins, exhibitions, and seminars and so on all find their way into the academic calendar of our college. The college also fulfills its social obligations through the activities of its vibrant NSS Unit.",
    ],
    cta: "Read More",
  },
];

const ABOUT = [
  {
    id: "aisc",
   img: aboutAisc,
    title: "About Abeda Inamdar Senior College",
    text: [
      "The Abeda Inamdar Senior College is one of the institutions established and governed by The Maharashtra Cosmopolitan Education Society (M.C.E. Society). The M.C.E. Society was established in the year 1948 by Late Mr. Abdul Kadir Khan and likeminded educationists, with an objective of providing education to the economically, educationally and socially weaker sections of the society. The M.C.E. Society is an educational society registered under the Society's Registration Act of 1860 and also a Public Trust registered under the Bombay Public Trust Act 1950. It is also registered under section 12 (a) of Income Tax Act 1961 and is exempted u/s 80G of the said Act by the Income Tax Commissioner, Pune.",
    ],
  },
  {
    id: "mce",
    img: aboutMces,
    title: "About M.C.E. Society",
    text: [
      "Maharashtra Cosmopolitan Education Society (MCES), was established in the year 1948 by Late Mr. Abdul Kadir Khan and others, with an objective of providing education to the economically, educationally and socially weaker sections of the society. It is an educational society registered under the Society's Registration Act of 1860 and also a Public Trust registered under the Bombay Public Trust Act 1950. It is also registered under section 12(a) of Income Tax Act 1961 and is exempted u/s 80G of the said Act by the Income Tax Commissioner, Pune.",
      "The M.C.E. Society is one of the oldest educational organizations of Pune & has done pioneering work in the field of education. Within a span of 15 years the M.C.E. Society from a humble beginning of 4 schools has been transformed into an excellent educational complex of higher, medical, technical and professional academic institutions in the field of Arts, Science, Commerce, Computer Science, Law, Education, Pharmacy, Management Sciences, Architecture, Dental Sciences, Hospitality Studies & Information Technology.",
    ],
  },
];

const PILLARS = [
  {
    id: "objectives",
    title: "Our Objectives",
    items: [
      "To impart quality education.",
      "Higher education to students especially of Muslim minority and weaker sections of the society by providing good infrastructure and a motivating environment.",
      "To inculcate benefits of the universal, cosmopolitan and pluralistic nature of our society.",
      "To support the students for expressing their talent and creativity in academics, sports, training, extension activities and social fields.",
      "To facilitate training in specific areas and to empower students for better employment opportunities.",
    ],
  },
  {
    id: "mission",
    title: "Our Mission",
    items: [
      "The quill and inkpot personifies the propagation of knowledge and inculcation of the creative spirit.",
      "Laboratory experiment exemplifies the scientific pursuits and innovations leading to excellence.",
      "The industrial wheel epitomizes the vision of research, development, commercial ventures and accelerated progress.",
      "The computer embodies technological advancement and future-centric approach leading to empowerment.",
    ],
  },
  {
    id: "goal",
    title: "Our Goals",
    items: [
      "To provide quality education to the students belonging to economically, educationally and socially weaker sections of society in general and Muslims in particular.",
      "To provide opportunities to students through self-funding teaching programs.",
      "To make available employment opportunities to the students through placement activities and competitive examinations.",
      "To strive for the holistic development of the students.",
      "To inculcate a secular outlook among the students.",
      "To sensitize our students to their social and civic responsibilities.",
      "To make our students competent with the help of Soft skills and Life skills.",
    ],
  },
  {
    id: "values",
    title: "Our Values",
    items: [
      "The college has a penchant for quality in all aspects of administration and academics. This is a pre-requisite for realizing our vision for achieving excellence in education. In a divisive world, we harbor respect and tolerance. We envision our campus as a secular heaven.",
      "Communicative and technological competence and resourcefulness are encouraged in the staff and students. We believe this will enhance their teaching capability and employability respectively.",
      "We are committed to the welfare of society and inculcate in our students the desire to be of service to the community.",
      "Our activities are designed to encourage intellectual curiosity and creativity. We also support professional development activities of the staff. These we believe are essential for a commitment to lifelong learning.",
      "We acknowledge, recognize and appreciate the efforts of all our students and staff members. We promote a research temperament encouraging both our students and staff members to be innovative.",
    ],
  },
];

const NEWS = [
  "Admission Open for 2026–27",
  "Exam Fee Waiver Scheme for Students Resident of Drought-Affected Talukas (Academic Year 2026–27)",
];

export default function CollegeHome() {
  return (
    <div className="aisc">
      <style>{css}</style>

      {/* top bar */}
      <div className="top">
        <div className="wrap top-in">
          <span className="ticker">
            <b>Latest News:</b> {NEWS.join("  •  ")}
          </span>
          <nav>
            {TOP_LINKS.map(([l, h]) => (
              <a key={l} href={h}>{l}</a>
            ))}
          </nav>
        </div>
      </div>

      {/* admission banner */}
      <a className="banner" href="/student-registration">
        Admissions are open to all undergraduate programs for the Academic Year 2026–27 — Apply Now <ChevronsRight size={16} />
      </a>

      <main>
        {/* welcome */}
        <section className="hero">
          <span className="orb o1" aria-hidden="true" />
          <span className="orb o2" aria-hidden="true" />
          <div className="wrap hero-in">
            <div className="hero-copy">
              <span className="eyebrow">M.C.E. Society's · Pune</span>
              <h2>
                Welcome To <span>Abeda Inamdar</span> Senior College
              </h2>
              <p>
                One of the institutions established and governed by the Maharashtra Cosmopolitan Education Society
                (M.C.E. Society), founded in 1948 by Late Mr. Abdul Kadir Khan and like-minded educationists to provide
                education to the economically, educationally and socially weaker sections of society.
              </p>
              <p className="motto">“Read to Lead”</p>
              <div className="cta">
                <a className="btn gold" href="/student-registration">Apply Now <ArrowRight size={16} /></a>
                <a className="btn ghost" href="#aisc">View College Details</a>
              </div>
            </div>

            <ul className="facts">
              <li><Landmark size={22} /><b>1948</b><span>M.C.E. Society established</span></li>
              <li><BadgeCheck size={22} /><b>Grade A</b><span>Accredited by NAAC</span></li>
              <li><Users size={22} /><b>10,000+</b><span>Girls in our colleges</span></li>
              <li><BookOpen size={22} /><b>3 Faculties</b><span>Arts, Science &amp; Commerce</span></li>
            </ul>
          </div>
        </section>

        {/* leaders */}
        <section className="sec">
          <div className="wrap">
            <h2 className="title">Messages</h2>
            {LEADERS.map((p) => (
              <article id={p.id} className="card" key={p.id}>
                <img src={p.img} alt={p.name} loading="lazy" />
                <div>
                  <h3>{p.name}</h3>
                  <h4>{p.role}</h4>
                  {p.text.map((t, i) => <p key={i}>{t}</p>)}
                  <a className="btn sm" href={`/about-us#${p.id}`}>{p.cta} <ChevronsRight size={14} /></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* about */}
        <section className="sec alt">
          <div className="wrap">
            <h2 className="title">About Us</h2>
            {ABOUT.map((a) => (
              <article id={a.id} className="card" key={a.id}>
                <img src={a.img} alt={a.title} loading="lazy" />
                <div>
                  <h3>{a.title}</h3>
                  {a.text.map((t, i) => <p key={i}>{t}</p>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* objectives, mission, goals, values */}
        <section className="sec">
          <div className="wrap pillars">
            {PILLARS.map((p) => (
              <div id={p.id} className="pillar" key={p.id}>
                <h3>{p.title}</h3>
                <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <h4>Abeda Inamdar Senior College</h4>
            <p>M.C.E. Society's college of Arts, Science and Commerce (Autonomous), Pune.</p>
          </div>
          <div>
            <h4>Quick Contact</h4>
            <p><Phone size={14} /> <a href="tel:+912026457577">+91-20-26457577</a></p>
            <p><Mail size={14} /> <a href="mailto:prin-aisc@azamcampus.org">prin-aisc@azamcampus.org</a></p>
            <p><MapPin size={14} /> 2390-B, K.B. Hidayatullah Road, Azam Campus, Camp, Pune 411001, Maharashtra, India.</p>
          </div>
          <div>
            <h4>Useful Links</h4>
            <p><a href="/student-registration">Online Admission</a></p>
            <p><a href="/notice">Notices / Circulars</a></p>
            <p><a href="/contact">Contact</a></p>
          </div>
        </div>
        <div className="copy">© 2026 M.C.E. Society's Abeda Inamdar Senior College</div>
      </footer>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap');
.aisc{--red:#a51c30;--navy:#1d3567;--gold:#e3b82b;--bg:#f2f2f2;--ink:#3a3f4f;--mut:#6b7080;
  font-family:'Open Sans',system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.7}
.aisc *{box-sizing:border-box}
.aisc a{color:inherit;text-decoration:none}
.aisc .wrap{width:min(1180px,100%);margin:0 auto;padding:0 20px}

.top{background:var(--navy);color:#fff;font-size:12.5px}
.top-in{display:flex;justify-content:space-between;gap:20px;align-items:center;padding-top:7px;padding-bottom:7px}
.ticker{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;min-width:0}
.top nav{display:flex;gap:16px;flex-shrink:0}
.top nav a:hover{text-decoration:underline}

.banner{display:flex;justify-content:center;align-items:center;gap:8px;padding:10px 16px;text-align:center;
  background:#fff4cf;color:#5a4300;font-weight:600;font-size:14px;border-bottom:1px solid #ecd78a}
.banner:hover{background:#ffeeb3}

.hero{position:relative;overflow:hidden;color:#fff;padding:84px 0 92px;
  background:
    radial-gradient(circle at 12% 18%,rgba(227,184,43,.16),transparent 38%),
    linear-gradient(115deg,#1a2a6c 0%,#26286a 55%,#7a1535 100%);
  border-bottom:4px solid var(--gold)}
.hero::before{content:"";position:absolute;inset:0;opacity:.07;
  background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:44px 44px}
.orb{position:absolute;border-radius:50%;filter:blur(2px);pointer-events:none}
.o1{width:380px;height:380px;right:-120px;top:-140px;background:radial-gradient(circle,rgba(227,184,43,.28),transparent 70%)}
.o2{width:300px;height:300px;left:-100px;bottom:-140px;background:radial-gradient(circle,rgba(255,255,255,.14),transparent 70%)}
.hero-in{position:relative;display:grid;grid-template-columns:1.25fr 1fr;gap:48px;align-items:center}
.eyebrow{display:inline-block;padding:6px 14px;border-radius:999px;font-size:11.5px;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:var(--gold);border:1px solid rgba(227,184,43,.55);background:rgba(227,184,43,.08)}
.hero h2{margin:18px 0 16px;font:700 46px/1.15 'Playfair Display',Georgia,serif}
.hero h2 span{color:var(--gold)}
.hero p{margin:0 0 12px;color:#dfe3fa;font-size:15.5px;max-width:560px}
.hero .motto{margin:20px 0 26px;font:600 24px 'Playfair Display',Georgia,serif;color:var(--gold);display:flex;align-items:center;gap:14px}
.hero .motto::before{content:"";width:42px;height:2px;background:var(--gold)}
.cta{display:flex;flex-wrap:wrap;gap:14px}
.btn.gold{background:var(--gold);color:#2b2300!important;box-shadow:0 10px 24px rgba(227,184,43,.35);padding:13px 26px;border-radius:8px}
.btn.ghost{background:transparent;border:1.5px solid rgba(255,255,255,.7);padding:12px 24px;border-radius:8px}
.btn.ghost:hover{background:rgba(255,255,255,.12)}
.btn{transition:transform .15s}.btn:hover{transform:translateY(-2px)}
.facts{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.facts li{padding:22px 20px;border-radius:16px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.2);
  backdrop-filter:blur(6px);display:flex;flex-direction:column;gap:2px}
.facts li:nth-child(even){transform:translateY(18px)}
.facts svg{color:var(--gold);margin-bottom:8px}
.facts b{font:700 28px/1.1 'Playfair Display',Georgia,serif}
.facts span{font-size:12.5px;color:#cdd3f3}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 22px;background:var(--red);color:#fff!important;font-weight:600;
  font-size:13px;text-transform:uppercase;letter-spacing:.04em;border-radius:3px}
.btn:hover{filter:brightness(1.12)}
.btn.sm{background:var(--navy);padding:8px 16px;text-transform:none;font-size:13px}

.sec{padding:56px 0}.sec.alt{background:#fafafa}
.title{margin:0 0 32px;text-align:center;font:700 30px 'Playfair Display',Georgia,serif;color:var(--navy);position:relative;padding-bottom:14px}
.title::after{content:"";position:absolute;left:50%;bottom:0;width:56px;height:3px;background:var(--red);transform:translateX(-50%)}

.card{display:grid;grid-template-columns:345px 1fr;gap:28px;background:var(--bg);padding:16px;margin-bottom:34px;scroll-margin-top:24px}
.card img{width:100%;height:100%;max-height:360px;object-fit:cover;display:block}
.card h3{margin:6px 0 4px;font-size:20px;font-weight:600;text-transform:uppercase;color:#2a2f40}
.card h4{margin:0 0 10px;font-size:14px;font-weight:700;color:#2a2f40}
.card p{margin:0 0 10px;font-size:14.5px;color:var(--mut);text-align:justify}

.pillars{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.pillar{background:var(--bg);padding:24px 28px;scroll-margin-top:24px}
.pillar h3{margin:0 0 14px;text-align:center;font-size:20px;font-weight:600;text-transform:uppercase;color:#2a2f40}
.pillar ul{margin:0;padding-left:20px}
.pillar li{margin-bottom:6px;font-size:14.5px;color:var(--mut);text-align:justify}

.foot{background:#161d3d;color:#cfd4ee;font-size:14px}
.foot-in{display:grid;grid-template-columns:1.2fr 1.4fr 1fr;gap:32px;padding-top:40px;padding-bottom:30px}
.foot h4{margin:0 0 12px;color:#fff;font:700 18px 'Playfair Display',Georgia,serif}
.foot p{margin:0 0 8px;display:flex;gap:8px;align-items:flex-start}
.foot p svg{margin-top:5px;flex-shrink:0;color:#e3b82b}
.foot a:hover{text-decoration:underline}
.copy{text-align:center;padding:14px;border-top:1px solid rgba(255,255,255,.12);font-size:12.5px}

@media(prefers-reduced-motion:reduce){.btn{transition:none}}
@media(max-width:900px){
  .card{grid-template-columns:1fr}.card img{max-height:300px}
  .pillars,.foot-in{grid-template-columns:1fr}
  .hero{padding:56px 0 64px}.hero-in{grid-template-columns:1fr;gap:36px}.hero h2{font-size:32px}.facts li:nth-child(even){transform:none}.top nav{display:none}
}
`;