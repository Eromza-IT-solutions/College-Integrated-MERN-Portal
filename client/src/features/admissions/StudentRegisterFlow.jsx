import { useState } from "react";
import { GraduationCap, ArrowLeft, ListChecks, ArrowRight, Info } from "lucide-react";

 import StudentRegistration from "./StudentRegistration"; // <-- your existing registration page

const INSTRUCTIONS = [
  "You can use mobile phone/tab to register, login or fill form as our portal is responsive but it is advised to use a desktop or laptop to visit the vriddhionline.com website.",
  "On the website, click on Login > Student Login. Students filling the form for the first time must go to the Login > Student Register menu and complete the online registration process first.",
  "Use a valid email id and a valid mobile number for registration and form submission. (If you do not have a personal mobile and use a shared family phone, keep this mobile with you at the time of form submission).",
  "During registration, an OTP will be sent to the mobile number and email. Your email id will also be verified via a link sent to your email. Click on this link.",
  "The verification OTP is valid for 5 minutes only and will expire automatically if not used. If you do not receive the OTP on the registered mobile number due to range or other issues, please check your email id. Enter the OTP on the website in the field provided before it expires to verify the mobile number.",
  "The Student's Vriddhi account will be activated after verification. You will receive a confirmation regarding the same on your email and registered mobile number as an SMS.",
  "You will receive the 10-digit User ID / Registration ID and Password on your registered mobile number. Students must save their User ID and Password to access their Vriddhi account.",
  "If a student forgets their login ID or Password, then they must go to the Login > Forget ID or Login > Forgot Password to recover the login credentials.",
  "If you have already registered previously, by way of taking admission through Vriddhi Portal at any college listed on the site, do not register again.",
  "Special symbols such as (#, !, $, &, .,) are not allowed in the Password.",
  "After successful registration, the student can apply for new admission.",
  "One student should submit only one admission form for a selected class/faculty. Multiple forms submitted by the student for the same class using the same faculty will result in the rejection of the admission forms.",
  "Keep scanned copies of your documents, signature, and photograph ready before applying. The scanned file should be less than 500 KB in size. Each document must be uploaded as a separate file. The files should be in the following formats: *.JPEG or *.JPG.",
  'After submitting your admission form and uploading scanned copies of your documents, your admission form will be further processed by the admission committee using the "ONLINE APPROVAL" system.',
  "Students will get a notification on their email ID or via SMS if their admission form gets rejected. Students should take note of the reason for the rejection of the admission form and rectify it accordingly.",
  "If the form is approved/accepted by the admission committee, the student will get an SMS and notification on his email id within 3 days after submitting their admission form. If a student does not get any notification via email or SMS, they must assume that the form is wait-listed. Wait-listed students will be contacted after one month for admission, provided a vacancy exists.",
  "Only after approval of the admission form by the admission committee, a student will be able to make fee payments using the online payment gateway.",
  "The student must pay the fee amount specified in the SMS or the email on or before the last date mentioned.",
  "To pay the fee amount, the student must log in to their account and select the pay fee menu/button.",
  "After successful fee payment, the student will get an E-challan on his Vriddhi Dashboard. Select the correct option while paying your fees like a credit card, debit card, net banking, or UPI.",
];

// Items that matter most at registration time (1-based numbers from the list above)
const KEY_POINTS = new Set([4, 5, 10, 12]);

const NOTES = [
  "These instructions are subject to change without prior notice to the students hence every student must refer the new update (if any) release from time to time.",
  "Your active mobile number and valid email id will be used by the college authorities to send online video lectures and online attendance instructions.",
  "Using an invalid mobile number and email address may lead to you being marked absent for an online college activity. Students will be solely responsible for such misleading information.",
  "If you have changed your previously registered mobile number, you can update it from your profile after login, please inform change of your mobile no. to your college to get communications from college.",
];

const QUICK_POINTS = [
  "OTP is valid for 5 minutes only",
  "Password cannot contain #, !, $, &, .",
  "Submit one admission form per class/faculty",
  "Scanned documents: JPEG/JPG, under 500 KB",
];

export function StudentInstructions({ onContinue, onBack }) {
  return (
    <div className="ins-page">
      <style>{css}</style>

      <button type="button" className="ins-back" onClick={onBack}>
        <ArrowLeft size={13} /> Back to Home
      </button>

      <div className="ins-shell">
        {/* Left brand panel */}
        <aside className="ins-side">
          <div className="ins-crest">
            <GraduationCap size={30} />
          </div>
          <p className="ins-society">M.C.E. SOCIETY'S</p>
          <h1 className="ins-college">
            Abeda Inamdar
            <br />
            Senior College
          </h1>
          <span className="ins-rule" />

          <div className="ins-glance">
            <h2>
              <ListChecks size={15} /> Keep in mind while registering
            </h2>
            <ul>
              {QUICK_POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Right content panel */}
        <main className="ins-main">
          <header className="ins-head">
            <h2>Information for Students</h2>
            <p>Read these instructions before applying for admission and paying fees online.</p>
          </header>

          <div className="ins-scroll" tabIndex={0} aria-label="Instructions for students">
            <ol className="ins-list">
              {INSTRUCTIONS.map((text, i) => (
                <li key={i} className={KEY_POINTS.has(i + 1) ? "key" : ""}>
                  <span className="ins-num">{i + 1}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>

            <section className="ins-note">
              <h3>
                <Info size={15} /> Note
              </h3>
              <ol>
                {NOTES.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ol>
            </section>
          </div>

          <footer className="ins-foot">
            <button type="button" className="ins-cta" onClick={onContinue}>
              Click to Continue Registration <ArrowRight size={15} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

/**
 * Gate: shows the instruction page first, then the registration page.
 * Use this in your route instead of rendering <StudentRegistration /> directly.
 */
export default function StudentRegisterFlow() {
  const [accepted, setAccepted] = useState(false);

  if (!accepted) {
    return (
      <StudentInstructions
        onContinue={() => {
          setAccepted(true);
          window.scrollTo({ top: 0 });
        }}
        onBack={() => (window.location.href = "/")}
      />
    );
  }

  return <StudentRegistration />;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');

.ins-page{
  --navy:#1a2a6c; --navy-deep:#141f55; --crimson:#9b1230; --gold:#e3b82b;
  --ink:#1b2250; --muted:#5b6385; --field:#e8ecfb; --line:#d9deef;
  min-height:100vh; padding:104px 16px 48px; box-sizing:border-box;
  font-family:'Poppins',system-ui,sans-serif; color:var(--ink);
  background:linear-gradient(115deg,#20274d 0%,#1a2a6c 35%,#26286a 62%,#7a1535 100%);
  display:flex; justify-content:center; align-items:flex-start; position:relative;
}
.ins-page *{box-sizing:border-box}

.ins-back{
  position:absolute; top:10px; left:6px; display:inline-flex; align-items:center; gap:6px;
  padding:8px 14px; border-radius:999px; font:600 11px 'Poppins',sans-serif; color:#fff;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.35); cursor:pointer;
}
.ins-back:hover{background:rgba(255,255,255,.16)}

.ins-shell{
  width:min(1040px,100%); display:grid; grid-template-columns:320px 1fr;
  border-radius:22px; overflow:hidden; background:#fff;
  box-shadow:0 30px 70px rgba(5,8,30,.45);
}

/* ---- left panel ---- */
.ins-side{
  background:linear-gradient(160deg,var(--navy) 0%,var(--navy-deep) 70%,#3a1346 100%);
  color:#fff; padding:24px 24px 28px; position:relative;
}
.ins-crest{
  width:68px; height:68px; border-radius:50%; background:#fff; color:var(--navy);
  border:3px solid var(--gold); display:grid; place-items:center; margin-bottom:18px;
}
.ins-society{margin:0 0 6px; font-size:9px; font-weight:600; letter-spacing:.16em; color:var(--gold)}
.ins-college{margin:0; font:700 26px/1.2 'Playfair Display',Georgia,serif}
.ins-rule{display:block; width:26px; height:3px; background:var(--gold); margin:16px 0 22px; border-radius:2px}

.ins-glance{
  border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06);
  border-radius:14px; padding:16px;
}
.ins-glance h2{
  margin:0 0 12px; font-size:12.5px; font-weight:600; color:var(--gold);
  display:flex; align-items:center; gap:8px;
}
.ins-glance ul{margin:0; padding:0; list-style:none; display:grid; gap:10px}
.ins-glance li{
  font-size:11.5px; line-height:1.45; color:#e6e9fb; padding-left:14px; position:relative;
}
.ins-glance li::before{
  content:""; position:absolute; left:0; top:.55em; width:6px; height:6px; border-radius:50%; background:var(--gold);
}

/* ---- right panel ---- */
.ins-main{display:flex; flex-direction:column; min-width:0; max-height:calc(100vh - 150px); min-height:560px}
.ins-head{padding:30px 36px 14px}
.ins-head h2{margin:0; font:700 28px 'Playfair Display',Georgia,serif; color:var(--navy)}
.ins-head p{margin:6px 0 0; font-size:12px; color:var(--muted)}

.ins-scroll{
  flex:1; overflow-y:auto; padding:6px 36px 18px; outline:none;
  scrollbar-width:thin; scrollbar-color:#b9c0e0 transparent;
}
.ins-scroll:focus-visible{box-shadow:inset 0 0 0 2px var(--navy)}

.ins-list{list-style:none; margin:0; padding:0; display:grid; gap:4px}
.ins-list li{
  display:grid; grid-template-columns:26px 1fr; gap:12px; align-items:start;
  padding:10px 12px; border-radius:10px; font-size:12.5px; line-height:1.6; color:#2a3158;
}
.ins-list li:nth-child(odd){background:#f6f8fe}
.ins-num{
  width:22px; height:22px; border-radius:6px; background:var(--field); color:var(--navy);
  font-size:10.5px; font-weight:600; display:grid; place-items:center; margin-top:1px;
}
.ins-list li.key{background:#fff8e1; box-shadow:inset 3px 0 0 var(--gold); font-weight:500}
.ins-list li.key .ins-num{background:var(--gold); color:#2b2300}

.ins-note{
  margin-top:20px; padding:16px 18px; border-radius:12px;
  background:#fdf1f3; border:1px solid #f0c9d1;
}
.ins-note h3{
  margin:0 0 10px; display:flex; align-items:center; gap:8px;
  font:700 16px 'Playfair Display',Georgia,serif; color:var(--crimson);
}
.ins-note ol{margin:0; padding-left:18px; display:grid; gap:8px}
.ins-note li{font-size:12px; line-height:1.6; color:#4a2a33}

.ins-foot{padding:16px 36px 22px; border-top:1px solid var(--line); background:#fff}
.ins-cta{
  display:inline-flex; align-items:center; gap:10px; padding:13px 26px; border:0; border-radius:10px;
  background:linear-gradient(180deg,#b01836,var(--crimson)); color:#fff; cursor:pointer;
  font:600 13px 'Poppins',sans-serif; box-shadow:0 8px 18px rgba(155,18,48,.35);
  transition:transform .15s, box-shadow .15s;
}
.ins-cta:hover{transform:translateY(-1px); box-shadow:0 12px 22px rgba(155,18,48,.42)}
.ins-cta:focus-visible{outline:3px solid var(--gold); outline-offset:2px}

/* ---- responsive ---- */
@media (max-width:860px){
  .ins-shell{grid-template-columns:1fr}
  .ins-side{padding:20px}
  .ins-glance{display:none}
  .ins-main{max-height:none; min-height:0}
  .ins-scroll{overflow:visible; padding:6px 18px 18px}
  .ins-head{padding:22px 18px 10px}
  .ins-foot{padding:14px 18px 20px; position:sticky; bottom:0}
  .ins-cta{width:100%; justify-content:center}
}
@media (prefers-reduced-motion:reduce){.ins-cta{transition:none}}
`;