import { createFileRoute } from '@tanstack/react-router'
import { UserBeans } from '~/components/UserBeans'

export const Route = createFileRoute('/u/$username/beans')({
  component: BrewedTab,
})

function BrewedTab() {
  const { username } = Route.useParams()
  return <UserBeans username={username} kind="brewed" />
}
