import { createFileRoute } from '@tanstack/react-router'
import { UserBeans } from '~/components/UserBeans'

export const Route = createFileRoute('/u/$username/likes')({
  component: LikedTab,
})

function LikedTab() {
  const { username } = Route.useParams()
  return <UserBeans username={username} kind="liked" />
}
