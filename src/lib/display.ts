export function displayFirstName(user: { firstName?: string | null; email: string }) {
  const firstName = user.firstName?.trim()
  if (firstName) return firstName

  const localPart = user.email.split('@')[0] ?? 'User'
  const readable = localPart.split(/[._-]/)[0] ?? localPart
  return readable ? readable.charAt(0).toUpperCase() + readable.slice(1) : 'User'
}
