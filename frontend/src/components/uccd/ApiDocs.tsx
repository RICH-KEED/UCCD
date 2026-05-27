import { useMemo, useState } from 'react'
import { endpointsData, type Endpoint } from '../../data/apiDocs'
import { Container } from './ui'

const methodClass: Record<Endpoint['method'], string> = {
  GET: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  POST: 'border-accent/40 bg-accent/10 text-accent',
  PUT: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  WS: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300',
}

function JsonBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer text-xs text-accent transition hover:text-text"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="uccd-scrollbar max-h-[420px] overflow-auto p-4 text-xs leading-relaxed text-text">
        <code>{value}</code>
      </pre>
    </div>
  )
}

function ParameterTable({
  title,
  rows,
}: {
  title: string
  rows: NonNullable<Endpoint['pathParameters']>
}) {
  if (!rows.length) {
    return null
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">
        {title}
      </p>
      <div className="uccd-scrollbar overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead className="bg-surface text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-accent">{row.name}</td>
                <td className="px-4 py-3 font-mono text-text">{row.type}</td>
                <td className="px-4 py-3 text-muted">{row.required ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-muted">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ApiDocs() {
  const groups = useMemo(
    () => Array.from(new Set(endpointsData.map((endpoint) => endpoint.group))),
    [],
  )
  const [activeGroup, setActiveGroup] = useState(groups[0])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(endpointsData[0]?.id ?? '')

  const filteredEndpoints = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return endpointsData.filter((endpoint) => {
      const matchesGroup = endpoint.group === activeGroup
      const matchesSearch =
        normalized.length === 0 ||
        endpoint.path.toLowerCase().includes(normalized) ||
        endpoint.description.toLowerCase().includes(normalized) ||
        endpoint.method.toLowerCase().includes(normalized)

      return matchesGroup && matchesSearch
    })
  }, [activeGroup, search])

  const selected =
    endpointsData.find((endpoint) => endpoint.id === selectedId) ??
    filteredEndpoints[0] ??
    endpointsData[0]

  return (
    <section id="api-docs" className="border-t border-border py-20">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Developer API
            </span>
            <h2 className="mt-5 font-display text-[2.35rem] leading-tight tracking-[-0.02em] text-text">
              API docs for the OmniResol complaint platform
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted lg:text-right">
            Browse implemented routes, payloads, response contracts, auth
            requirements, and error states using the same UCCD dashboard theme.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-border bg-surface/60 p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search endpoints"
              className="mb-4 h-10 w-full rounded-full border border-border bg-bg px-4 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
            />
            <div className="mb-4 flex flex-wrap gap-2">
              {groups.map((group) => (
                <button
                  type="button"
                  key={group}
                  onClick={() => {
                    setActiveGroup(group)
                    const first = endpointsData.find((endpoint) => endpoint.group === group)
                    if (first) {
                      setSelectedId(first.id)
                    }
                  }}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
                    activeGroup === group
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="uccd-scrollbar max-h-[600px] space-y-2 overflow-auto pr-1">
              {filteredEndpoints.map((endpoint) => (
                <button
                  type="button"
                  key={endpoint.id}
                  onClick={() => setSelectedId(endpoint.id)}
                  className={`w-full cursor-pointer rounded-lg border p-3 text-left transition ${
                    selected.id === endpoint.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg hover:border-muted'
                  }`}
                >
                  <span className={`mb-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${methodClass[endpoint.method]}`}>
                    {endpoint.method}
                  </span>
                  <p className="break-all font-mono text-xs text-text">{endpoint.path}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                    {endpoint.description}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <article className="rounded-xl border border-border bg-surface/50 p-5">
            <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${methodClass[selected.method]}`}>
                    {selected.method}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {selected.implemented ? 'Implemented' : 'Planned'}
                  </span>
                  {selected.authRequired && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                      Bearer token
                    </span>
                  )}
                </div>
                <h3 className="mt-4 break-all font-mono text-xl text-text">
                  {selected.path}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                  {selected.description}
                </p>
              </div>
              <a
                href={`#${selected.id}`}
                className="text-sm font-medium text-accent transition hover:text-text"
              >
                #{selected.id}
              </a>
            </div>

            <div id={selected.id} className="mt-6 space-y-6">
              <ParameterTable title="Path Parameters" rows={selected.pathParameters ?? []} />
              <ParameterTable title="Query Parameters" rows={selected.queryParameters ?? []} />
              {selected.requestBody && (
                <JsonBlock label="Request Body" value={selected.requestBody} />
              )}
              <JsonBlock label="200 Response" value={selected.response200} />
              {selected.errorResponses && selected.errorResponses.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">
                    Error Responses
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selected.errorResponses.map((error) => (
                      <div key={error.code} className="rounded-lg border border-border bg-bg p-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300">
                            {error.code}
                          </span>
                          <span className="text-sm text-text">{error.description}</span>
                        </div>
                        <pre className="uccd-scrollbar mt-3 max-h-56 overflow-auto text-xs leading-relaxed text-muted">
                          <code>{error.response}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </Container>
    </section>
  )
}
