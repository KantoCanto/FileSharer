import crypto from 'crypto'

const keyLength = 64

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt)
  return `scrypt:${salt}:${derived}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !hash) return false
  const derived = await scrypt(password, salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'))
}

function scrypt(password: string, salt: string) {
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey.toString('hex'))
    })
  })
}
