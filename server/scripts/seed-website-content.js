// Seeds sample website content (notices, events, news, gallery) so the Website Admin dashboard
// and the public homepage are not empty.
//
// What it creates (all published, all public):
//   3 notices  — admission deadlines and college announcements
//   2 events   — fresher's welcome and annual sports day
//   2 news     — college rankings and student achievement
//   1 gallery  — campus photos (3 images)
//
// Every item is authored by the demo Website Admin user (website.admin@demo.example).
// Slugs are deterministic so the script is idempotent: running it again inserts nothing.
//
// Prerequisites: npm run seed
// Run:  node scripts/seed-website-content.js
// Safe to run again: items are looked up by slug before inserting.
// Refused in production.
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import WebsiteContent from '../src/models/WebsiteContent.js';

// Relative to "now" so the demo dates are always current regardless of when the script runs.
function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function daysAgo(n) {
  return daysFromNow(-n);
}

// All items are published. publishedAt is in the past so they are visible immediately.
const PUBLISHED_AT = daysAgo(3);

function makeItems(authorId) {
  return [
    // ---- NOTICES ----
    {
      type: 'notice',
      slug: 'demo-admission-open-2026-27',
      title: 'Admissions Open for A.Y. 2026-27',
      summary: 'Online applications are now open for all undergraduate and postgraduate programmes.',
      body: `Online admissions for A.Y. 2026-27 are open from 1 June 2026.\n\nEligible students may apply through the college portal. All required documents must be uploaded at the time of application.\n\nFor more information contact the Admission Office.`,
      status: 'published',
      isPublic: true,
      isPinned: true,
      publishedAt: PUBLISHED_AT,
      expiresAt: daysFromNow(60),
      authorUserId: authorId,
    },
    {
      type: 'notice',
      slug: 'demo-fee-payment-deadline',
      title: 'Last Date for Admission Fee Payment',
      summary: 'Students whose admission forms have been approved must pay the fee within three days.',
      body: `As per the admission procedure, the admission fee must be paid within three days of form approval.\n\nForms whose fee is not paid in time will be cancelled automatically. Contact the Admission Office for any queries.`,
      status: 'published',
      isPublic: true,
      isPinned: false,
      publishedAt: PUBLISHED_AT,
      expiresAt: daysFromNow(30),
      authorUserId: authorId,
    },
    {
      type: 'notice',
      slug: 'demo-college-closed-holiday',
      title: 'College Holiday Notice',
      summary: 'The college will remain closed on account of a public holiday.',
      body: `The college will remain closed on ${daysFromNow(10).toDateString()} on account of a public holiday. All academic and administrative activities will resume the following working day.`,
      status: 'published',
      isPublic: true,
      isPinned: false,
      publishedAt: PUBLISHED_AT,
      authorUserId: authorId,
    },

    // ---- EVENTS ----
    {
      type: 'event',
      slug: 'demo-freshers-welcome-2026',
      title: "Fresher's Welcome 2026",
      summary: "A warm welcome ceremony for all new students joining the college in A.Y. 2026-27.",
      body: `The Students' Council warmly invites all new students to the Fresher's Welcome ceremony.\n\nThere will be cultural performances, an address by the Principal, and a guided campus tour.\n\nAttendance is encouraged for all first-year students.`,
      status: 'published',
      isPublic: true,
      isPinned: true,
      startsAt: daysFromNow(7),
      endsAt: daysFromNow(7),
      venue: 'College Auditorium',
      publishedAt: PUBLISHED_AT,
      authorUserId: authorId,
    },
    {
      type: 'event',
      slug: 'demo-annual-sports-day-2026',
      title: 'Annual Sports Day 2026',
      summary: 'The annual inter-class sports competition open to all students.',
      body: `The college annual sports day will be held at the college grounds.\n\nEvents include athletics, volleyball, kabaddi and chess. Students may register through their class representatives.\n\nParticipation certificates will be awarded to all entries.`,
      status: 'published',
      isPublic: true,
      isPinned: false,
      startsAt: daysFromNow(21),
      endsAt: daysFromNow(22),
      venue: 'College Sports Ground',
      publishedAt: PUBLISHED_AT,
      authorUserId: authorId,
    },

    // ---- NEWS ----
    {
      type: 'news',
      slug: 'demo-college-ranking-2026',
      title: 'College Receives "A" Grade in NAAC Accreditation',
      summary: 'We are proud to announce that the college has received an "A" grade in the latest NAAC assessment.',
      body: `The National Assessment and Accreditation Council has awarded the college an "A" grade following a comprehensive evaluation of academic programmes, infrastructure, and student support services.\n\nThe Principal and staff thank all students, faculty and stakeholders for their contribution to this achievement.`,
      status: 'published',
      isPublic: true,
      isPinned: false,
      publishedAt: daysAgo(10),
      authorUserId: authorId,
    },
    {
      type: 'news',
      slug: 'demo-student-achievement-2026',
      title: 'Student Wins State-Level Essay Competition',
      summary: 'A second-year B.Com student has won first place at the Maharashtra State Youth Essay Competition.',
      body: `Congratulations to Rahul Sharma (F.Y.B.Com) for winning first place at the Maharashtra State Youth Essay Competition 2026 on the theme "Green Economy and Youth".\n\nHe represented the college and brought honour to the institution. The Principal and faculty congratulate him on this outstanding achievement.`,
      status: 'published',
      isPublic: true,
      isPinned: false,
      publishedAt: daysAgo(5),
      authorUserId: authorId,
    },

    // ---- GALLERY ----
    {
      type: 'gallery',
      slug: 'demo-campus-gallery',
      title: 'Campus Gallery',
      summary: 'A look at our college campus, classrooms and facilities.',
      status: 'published',
      isPublic: true,
      isPinned: false,
      images: [
        { url: '/demo/gallery/campus-front.jpg',    caption: 'College main entrance' },
        { url: '/demo/gallery/library.jpg',         caption: 'Central library reading hall' },
        { url: '/demo/gallery/science-lab.jpg',     caption: 'Science laboratory' },
      ],
      publishedAt: PUBLISHED_AT,
      authorUserId: authorId,
    },
  ];
}

async function seedWebsiteContent() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed demo content when NODE_ENV=production');

  await WebsiteContent.init();

  const author = await User.findOne({ email: 'website.admin@demo.example' });
  if (!author) throw new Error('Demo website admin user not found. Run "npm run seed" first.');

  const items = makeItems(author._id);
  let added = 0;

  for (const item of items) {
    const existing = await WebsiteContent.findOne({ type: item.type, slug: item.slug });
    if (existing) continue;
    await WebsiteContent.create(item);
    added += 1;
  }

  return { total: items.length, added };
}

export { seedWebsiteContent };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const r = await seedWebsiteContent();
      console.log(`Website content seed finished. Added this run: ${r.added} of ${r.total} items (0 = already existed).`);
      console.log('Breakdown: 3 notices, 2 events, 2 news, 1 gallery.');
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding website content failed:', err.message); process.exit(1); });
}
