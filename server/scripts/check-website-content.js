import mongoose from 'mongoose';
import env from '../src/config/env.js';
import WebsiteContent from '../src/models/WebsiteContent.js';
import User from '../src/models/User.js';

// Checks the website content model against the real DEV database: the unique web address, two people creating the same
// title at the same moment, publishing, and what the public list can see. It adds a few test items and removes them again.
// Run:  npm run seed   then   node scripts/check-website-content.js
async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const stamp = Date.now().toString(36);
  const title = `Check notice ${stamp}`;
  try {
    await WebsiteContent.init();
    const author = await User.findOne({ email: 'applicant@demo.example' });
    if (!author) throw new Error('Run "npm run seed" first');
    const make = (over = {}) => WebsiteContent.createWithSlug({ type: 'notice', title, body: 'Check body', authorUserId: author._id, ...over });

    const both = await Promise.all([make(), make(), make()]);
    const slugs = both.map((d) => d.slug).sort();
    ok(new Set(slugs).size === 3, `three items with the same title all got different web addresses (${slugs.join(', ')})`);
    ok(slugs.includes(`check-notice-${stamp}`), 'one of them kept the plain address');

    const news = await make({ type: 'news' });
    ok(news.slug === `check-notice-${stamp}`, 'the same title as a news item can use the plain address (unique per type)');

    const draft = both[0];
    ok(draft.status === 'draft', 'a new item is a draft');
    const visibleBefore = await WebsiteContent.countDocuments(WebsiteContent.visibleFilter({ type: 'notice' }));
    const [p1, p2] = await Promise.all([WebsiteContent.publish(draft._id, { byUserId: author._id }), WebsiteContent.publish(draft._id, { byUserId: author._id })]);
    ok(p1.status === 'published' && p2.status === 'published', 'publishing twice at once leaves it published');
    ok(+p1.publishedAt === +p2.publishedAt || (await WebsiteContent.findById(draft._id)).publishedAt, 'it has a publish time');
    const visibleAfter = await WebsiteContent.countDocuments(WebsiteContent.visibleFilter({ type: 'notice' }));
    ok(visibleAfter === visibleBefore + 1, 'the public list gained exactly one item');

    const expired = await WebsiteContent.publish(both[1]._id, { byUserId: author._id, expiresAt: new Date(Date.now() + 1500) });
    ok(expired.status === 'published', 'an item with an expiry can be published');
    await new Promise((r) => setTimeout(r, 2000));
    ok((await WebsiteContent.countDocuments(WebsiteContent.visibleFilter({ type: 'notice' }))) === visibleAfter, 'after it expires it leaves the public list');

    await WebsiteContent.unpublish(draft._id, { byUserId: author._id });
    ok((await WebsiteContent.countDocuments(WebsiteContent.visibleFilter({ type: 'notice' }))) === visibleBefore, 'unpublish takes it off the public list');

    let incomplete = false;
    try {
      const g = await make({ type: 'gallery', title: `Check gallery ${stamp}`, body: undefined });
      await WebsiteContent.publish(g._id, { byUserId: author._id });
    } catch (e) { incomplete = e.statusCode === 400; }
    ok(incomplete, 'a gallery without pictures cannot be published');
  } finally {
    await WebsiteContent.deleteMany({ title: { $regex: `${stamp}$` } });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });
