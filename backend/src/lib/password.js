import argon2 from 'argon2';

export async function hashPassword(plainPassword, isTest = false) {
  return argon2.hash(String(plainPassword), {
    type: argon2.argon2id,
    memoryCost: isTest ? 1024 : 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash, plainPassword) {
  if (!hash || !plainPassword) return false;
  try {
    return await argon2.verify(hash, String(plainPassword));
  } catch {
    return false;
  }
}
