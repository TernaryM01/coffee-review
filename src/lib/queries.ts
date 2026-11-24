import { convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'

export const profileQuery = (username: string) => convexQuery(api.users.byUsername, { username })
