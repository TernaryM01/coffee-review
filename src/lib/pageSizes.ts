// Page sizes for paginated lists. Shared by the server (first page) and the
// client (usePaginatedWithInitial), so they must live outside 'use client'
// files: a Server Component importing a value from one gets a client
// reference, not the value.
export const PAGE = {
  beans: 30,
  beanReviews: 10,
  diary: 40,
  userReviews: 15,
  userBeans: 36,
  roasters: 48,
} as const
