/** "Admission Notice 2026-27!" -> "admission-notice-2026-27". Letters and digits only, so it is safe in a web address. */
function slugify(text, max = 80) {
  const s = String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // drop accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return s || 'item';
}

export { slugify };
