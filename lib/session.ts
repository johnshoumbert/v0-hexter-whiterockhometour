import { getSession as getAuthSession } from "./auth"

export const getSession = getAuthSession

export const getServerSession = async () => {
  const user = await getAuthSession()
  return user ? { user } : null
}

export const getUserSession = async () => {
  const user = await getAuthSession()
  if (!user) return null

  return {
    userId: user.id.toString(),
    user,
  }
}
