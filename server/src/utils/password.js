import bcrypt from 'bcryptjs';

// Password hashing. Backend may later swap this for Argon2id; keep the two function names the same.
const COST = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
