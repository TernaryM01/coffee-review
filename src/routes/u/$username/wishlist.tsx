import { createFileRoute } from '@tanstack/react-router'
import { UserBeans } from '~/components/UserBeans'

export const Route = createFileRoute('/u/$username/wishlist')({
  component: WishlistTab,
})

function WishlistTab() {
  const { username } = Route.useParams()
  return <UserBeans username={username} kind="wishlist" />
}
