import type { UseQueryResult } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ErrorState } from "./ErrorState"
import { TableSkeleton } from "./LoadingState"

interface QueryStateProps<T> {
  query: UseQueryResult<T, Error>
  loading?: ReactNode
  children: (data: T) => ReactNode
}

/** Renders loading → error → data for a TanStack query with consistent UI. */
export function QueryState<T>({ query, loading, children }: QueryStateProps<T>) {
  if (query.isPending) return <>{loading ?? <TableSkeleton />}</>
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
  return <>{children(query.data)}</>
}
