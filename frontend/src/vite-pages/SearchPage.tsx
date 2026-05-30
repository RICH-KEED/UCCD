import { useSearchParams } from 'react-router-dom'
import { AllComplaints } from './AllComplaints'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? undefined

  return <AllComplaints defaultSearch={query} sidebarActiveItem="Search" />
}
