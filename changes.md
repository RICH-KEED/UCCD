# C1
- Added configurable backend CORS settings in `api/config.py` so allowed origins can be supplied via environment variables.
- Updated FastAPI CORS middleware in `api/main.py` to read allowed origins and origin regex from backend settings.
- Documented `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEX` in `.env.example` for deployment configuration.
- Updated the Docker startup command to bind Uvicorn to `${PORT:-8000}`, allowing hosted environments to route traffic to the assigned backend port.

# C2
- Replaced the optional catch-all Next.js app route `src/app/[[...slug]]/page.tsx` with a required catch-all route at `src/app/[...slug]/page.tsx`.
- Removed the duplicate root match that conflicted with `src/app/page.tsx` and caused Next.js to reject the route tree.
- Preserved the existing client-side app router wrapper for non-root paths such as `/login`, `/dashboard`, and `/complaints`.

# C3
- Removed the duplicate four-card KPI row from the agent dashboard so the top dashboard area shows only four Quick Access cards instead of eight cards.
- Preserved the existing Quick Access actions and labels for open queue, resolved complaints, escalations, and AI drafts.
- Left supervisor and compliance dashboard KPI layouts unchanged because the requested screenshot matched the agent dashboard card group.

# C4
- Added a shared `AppBreadcrumb` component that renders the breadcrumb trail with a clickable `Home` control wired to the existing client router.
- Replaced static breadcrumb markup across dashboard, complaints/search, AI drafts, escalations, SLA breaches, trends, regulatory reports, root-cause analysis, and 360 view pages.
- Preserved each page's existing breadcrumb labels, counts, filters, and action buttons while making the navigation behavior consistent.

# C5
- Simplified the complaint detail page from a dense multi-panel bento layout into a clearer case summary, AI response draft, recent activity, and compact operations sidebar.
- Removed visual clutter from the detail view by folding severity, SLA, classification, duplicate, regulatory, customer, and next-step information into fewer grouped sections.
- Removed the mock recent-transactions panel and expanded triage/action cards that made the page feel overloaded.
- Changed the catch-all app route to import `AiDraftsPage` statically, avoiding the lazy async chunk boundary that triggered the reported `ChunkLoadError`.

# C6
- Made the custom router initialize with a deterministic server-safe route and sync the actual browser URL after hydration to prevent server/client route markup mismatches.
- Made the auth provider initialize without reading `localStorage` during the first client render, then load the stored session after hydration.
- Reduced hydration mismatch risk on deep links such as complaint detail pages where sidebar layout differed from the server-rendered landing route.

# C7
- Redesigned the AI drafts preview card so the title, draft metadata, and primary actions stay grouped at the top of the panel.
- Moved draft type, channel, and tone into compact metadata tiles below the preview header.
- Wrapped the draft body in a contained scrollable preview area with stable height so long draft content is covered neatly inside the card.
- Moved the copy action below the preview body while keeping send and regenerate actions immediately visible in the header.

# C8
- Restyled the shared Radix toast UI into a custom compact notification card inspired by the referenced COSS toast examples.
- Forced the toast viewport to bottom-right placement only and allowed up to four stacked notifications.
- Replaced native browser `alert()` notifications in AI drafts, dashboard resolve, escalations, and 360 view flows with custom toast notifications.
- Removed the escalation page `prompt()` flow and changed the header action to escalate the selected row with a toast warning when nothing is selected.
- Replaced complaint-detail inline success/error messages for save, request details, and send response with bottom-right toasts.
- Removed the inline 360 view escalation success banner so escalation feedback uses the same toast channel as the rest of the app.
- Added the missing `icon-xs` button size used by the combobox chip remove control so the TypeScript verification pass succeeds.

# C9
- Simplified the AI drafts preview header by removing the decorative sparkles icon and using plain text actions.
- Replaced the boxed metadata tiles in the draft preview with a lighter inline definition row for type, channel, and tone.
- Reduced the visual weight of the draft body container with a simpler bordered white reading area.
- Changed the preview copy action to a quiet text-only ghost button to avoid unnecessary icon clutter.

# C10
- Reduced the top padding above the AI draft body so the content sits closer to the preview header and metadata area.
- Preserved the simplified preview structure while tightening only the vertical spacing requested.

# C11
- Replaced emoji-based channel indicators in the complaints table, quick view sheet, reply sheet, dashboard complaint table, and dashboard channel distribution with static lucide icons.
- Replaced the 360 view empty-state search emoji with a static lucide search icon.
- Replaced 360 view timeline status emoji markers with static lucide status icons for resolved, escalated, and default complaint states.
- Replaced trends page sentiment and category status emojis with static lucide icons for status dots, arrows, rising, and stable states.
- Verified the frontend source no longer contains extended pictographic emoji usage other than the footer copyright symbol.

# C12
- Added a reusable `HoverText` helper based on the shadcn/Radix hover-card pattern from the referenced COSS component.
- Applied hover-card full-text previews to truncated table cells across AI drafts, complaints, dashboard, escalations, SLA breaches, regulatory reports, and root-cause tables.
- Preserved clipped one-line table layouts while showing the complete row item text on hover.
- Stopped pre-truncating long complaint and issue strings before table rendering so hover cards can display the full original content.
- Replaced the escalation table's native title tooltip for long complaint IDs with the same custom hover-card behavior.

# C13
- Added a copy-to-clipboard icon button to every reusable table text hover card.
- Extended `HoverText` to accept row-specific icon actions so hover cards can expose the same actions as their table row.
- Added row action icons to AI draft hover cards for mark sent and regenerate.
- Added row action icons to complaint hover cards for view details, quick view, and reply.
- Added row action icons to dashboard, escalation, SLA breach, and regulatory report hover cards for their available row actions.
- Kept root-cause hover cards copy-focused because that table does not expose separate row actions.

# C14
- Hid the complaint detail `Recent activity` section when there are no timeline events to display.
- Removed the empty `No activity yet.` placeholder card so the page does not show a component without data.

# C15
- Updated hover-card row action buttons to show short text labels next to their icons so each action is understandable.
- Added visible `Copy` and `Copied` labels to the clipboard action in hover cards.
- Allowed hover-card action rows to wrap when multiple labeled actions are present.

# C16
- Removed the visible `Loading dashboard data...` text from the dashboard loading state.
- Replaced the dashboard loader with neutral skeleton blocks that match the dashboard card and table layout.

# C17
- Changed the shared `DataTable` layout from fixed column sizing to automatic table sizing so columns can adjust to their content more naturally.
- Removed forced header width styles from the shared table renderer to avoid oversized or cramped columns.
- Added hover-card popovers to clickable ID/link-style table cells so IDs also show full values on hover.
- Added explicit `Open` actions to ID/link hover cards alongside copy support, using row-specific navigation or selection behavior.
- Added copy-focused hover support to non-linked ID cells such as root-cause IDs for consistency.

# C18
- Replaced the header inline search input with a global command-style search dialog based on the referenced COSS component pattern.
- Added searchable page results based on the current user's role and complaint-derived entries for records, drafts, escalations, SLA breaches, and regulatory items.
- Wired search result selection to open the matching page or complaint detail entry.
- Added Ctrl+K support and made the sidebar `Search` item open the same global search dialog.
- Added the search entry to the compliance sidebar so all roles can access the popup from the sidebar.
- Removed the header notification bell and its empty notification dropdown from the right side of the top bar.

# C19
- Removed the extra topbar tab navigation from the shared dashboard shell.
- Added a breadcrumb slot to the dashboard shell so page breadcrumbs render where the old nav buttons were.
- Moved page breadcrumbs and their related counts, filters, and actions into the topbar on dashboard, complaints, AI drafts, escalations, SLA breaches, 360 view, trends, root cause, and regulatory reports pages.
- Removed the duplicate in-content breadcrumb rows from those pages to keep the page body cleaner.
- Tightened the shared breadcrumb styling for topbar use with no bottom margin and safer truncation for long current-page labels.

# C20
- Extended the shared breadcrumb component to support intermediate path items between `Home` and the current page.
- Replaced the complaint detail topbar back arrow with a full breadcrumb path that links back through the complaint queue.
- Kept the complaint detail context badges for complaint ID and channel inline with the breadcrumb so the header still identifies the current case.
- Removed the now-unused complaint detail back navigation and arrow icon import.

# C21
- Removed the dummy grid/list icon-only controls from the dashboard breadcrumb actions because they did not change the page view.
- Removed the dummy grid/list icon-only controls from the complaints breadcrumb actions while preserving the real `Add New` action.
- Cleaned up unused lucide icon imports created by removing those inactive controls.
- Left functional grid icons in complaint row hover cards and menus intact because they open the Quick View action.

# C22
- Added a new `/settings` route and settings page with a three-tab structure for overview, personalization, and account controls.
- Built the settings overview tab to show dashboard KPI data, accessible complaint counts, user details, category breakdowns, and channel distribution when those datasets are available.
- Added working personalization controls for day/dark mode and font selection, with preferences saved to local storage and applied across the app.
- Added account information with name, email, role, user ID, session expiry, a working logout button, and a dummy delete-account action that shows a toast.
- Wired Settings navigation through the sidebar system item, user dropdown menu, topbar avatar dropdown, and global search results.
- Added shared appearance preference helpers and applied saved appearance preferences during client app startup.

# C23
- Removed hover-card actions that only selected a local preview or side panel without performing a meaningful operation.
- Renamed vague hover-card actions such as `Open`, `Mark sent`, and `Escalate` to clearer labels like `View details`, `Send and resolve`, and `Escalate complaint`.
- Removed fake regulatory report hover-card and dropdown actions for generate draft and submit because they had no backend or UI effect.
- Removed no-op recommendation buttons from regulatory reports and root-cause side panels.
- Added proper SLA breach escalation handling with toast feedback and data refresh instead of silently firing an update request.

# C24
- Fixed the shared data-table faceted filter popovers so clicking anywhere on a filter option row toggles its checkbox reliably.
- Hardened table filter state updates by storing selected filter values in a de-duplicated set before writing them back to the column filter.
- Reset table pagination to the first page whenever a checkbox filter changes so filtered results are immediately visible.
- Kept checkbox visuals in the filter dropdowns while making the row itself the accessible button target.

# C25
- Added sidebar auto-collapse behavior after real route navigation from main navigation items.
- Collapsed the desktop sidebar to icon mode after navigation and closed the mobile sidebar sheet after navigation.
- Kept non-route sidebar actions such as opening global search and using the account dropdown from triggering auto-collapse.
- Applied the same navigation collapse behavior to the sidebar Settings item because it opens a real page.

# C26
- Replaced the existing project landing page with the downloaded `LandingPage.tsx` content and section order.
- Copied the downloaded `uccd` landing components into `frontend/src/components/uccd` so the new landing page can render its full hero, workflow, platform, API docs, FAQ, and CTA sections.
- Copied the downloaded API documentation data into `frontend/src/data/apiDocs.ts` for the landing page API docs section.
- Adapted only the routing-specific login links from `react-router-dom` to Next links so the copied landing components work inside this app.
- Added scoped UCCD landing theme tokens, animations, marquee utilities, and scrollbar utilities to the global stylesheet without replacing the dashboard theme.
- Added a landing wrapper that scopes the copied landing palette and typography to the landing page.
- Fixed a stricter TypeScript tuple inference issue in the copied workflow component while preserving its displayed content.

# C27
- Updated the copied landing page palette to use the project day and dark colour scheme instead of the original neon landing colours.
- Added a Day/Dark theme switch to the landing navigation and wired it to the existing persisted appearance preference helpers.
- Updated landing accent glows, preview shadows, active pills, and selected workflow states to use theme-derived accent colours.
- Changed the landing primary button text colour to use the theme foreground token for correct contrast in both modes.
- Routed the `See the workflow` and `Request demo` landing actions to the login/signup page instead of in-page workflow navigation.
- Kept the existing direct `Login` links pointed at `/login` so all landing entry actions open the auth page.

# C28
- Removed the login page `Demo Access` credential card and its related demo helper controls.
- Removed the bottom `Enterprise Security` card from the login form column.
- Replaced the custom role selector with the referenced COSS-style bordered tab structure using the existing shared Tabs component.
- Kept role tabs wired to update the selected login email and clear errors when switching between Agent, Supervisor, and Compliance.
- Reduced login page vertical spacing and disabled right-panel scrolling so the form fits within the viewport without the removed bottom content.

# C29
- Added a smooth active-state lift and shadow transition to the login role tabs.
- Added a keyed Framer Motion transition for login form content when switching Agent, Supervisor, and Compliance tabs.
- Used a short fade, vertical slide, scale, and blur transition so role changes feel smoother without increasing page height.
- Added subtle focus and button motion refinements to match the new tab transition while keeping the login page non-scrolling.

# C30
- Fixed shared table faceted filter markup by replacing filter row buttons with accessible `role="checkbox"` rows.
- Replaced the nested interactive checkbox inside filter row buttons with a non-interactive visual checkbox indicator.
- Added keyboard support for table filter rows so Enter and Space toggle each option.
- Updated filter popover memoization to react to `columnFilters` changes so selected states and counts refresh after toggling.
- Removed the invalid nested `<button>` structure that was causing hydration warnings in table filter popovers.

# C31
- Added global day-mode selection colour tokens for readable highlighted text across the website.
- Added global dark-mode selection colour tokens tuned for the dark background and warm primary accent.
- Added global custom scrollbar tokens for track, thumb, and hover colours in both day and dark modes.
- Applied thin custom scrollbars site-wide for Firefox through `scrollbar-color` and `scrollbar-width`.
- Applied rounded custom WebKit scrollbar styling site-wide for Chrome and Edge, including track, thumb, hover, and corner states.

# C32
- Redesigned the complaints quick-view right sheet with a themed header, bounded custom-scroll body, and compact card-style metadata grid.
- Restyled quick-view issue, last-message, duplicate-warning, and quick-reply areas to match the app's minimal card and border design language.
- Redesigned the reply right sheet with the same header and metadata treatment for consistency with quick view.
- Converted the reply issue and AI-drafted reply areas into simple bordered cards with cleaner spacing and aligned action buttons.
- Updated sheet widths and removed default constrained sizing so the sidebars have proper right-panel proportions on desktop and mobile.
- Corrected complaint badge and SLA inline colour values to use the project's CSS variables directly instead of invalid `hsl(var(--...))` expressions.

# C33
- Combined the complaints table quick-view and reply flows into one user-facing `Quick View & Reply` action.
- Replaced hover-card `Reply` actions with `Quick view & reply` actions that open the combined drawer.
- Removed the separate `Reply` item from the row actions dropdown so each row now has one combined quick action.
- Moved the AI-drafted reply composer into the quick-view drawer so case context and response editing live in the same right sidebar.
- Updated the combined drawer title and close behavior to clear the shared reply draft state.

# C34
- Rebuilt the `/360-view` page around a working customer lookup form instead of relying on an unwired shell search placeholder.
- Added recent customer suggestion chips sourced from real complaint data so agents can open a 360 profile without manually copying an ID.
- Wired customer lookup to fetch complaint history, select the first matching complaint, and show clear loading, empty, and error states.
- Added customer summary metrics, a clickable complaint timeline, detailed complaint text, AI draft display, selected metadata, and risk signals using real complaint fields.
- Removed placeholder-only tabs for transactions, communication, and documents so empty components are not shown without data.
- Added backend `customer_id` filtering to the complaints list endpoint so exact customer profile lookup works.
- Expanded backend complaint search to include customer name, email, phone, account number, and source reference for broader 360 lookup support.

# C35
- Added a Day/Dark theme switch beside the global search control in the shared dashboard topbar.
- Wired the topbar switch to the existing persisted appearance preference helpers so it stays in sync with Settings and the landing page.
- Applied the saved theme on shell mount so dashboard pages reflect the stored day or dark preference immediately.
- Styled the switch container to match the app's rounded border, muted background, and active text design language.
- Kept the switch hidden on narrow mobile headers to avoid crowding the search and account controls.

# C36
- Added a reusable COSS-style vertical timeline component with timeline items, dates, titles, separators, indicators, and content sections.
- Replaced the `/360-view` complaint history layout with the new timeline component as the main interaction pattern.
- Simplified the `/360-view` page to focus on customer lookup, customer summary, complaint timeline, and one selected-case panel.
- Removed the extra metadata cards, risk card, and bottom tabs from `/360-view` so the page is easier to understand.
- Kept real customer lookup, recent customer chips, selected complaint details, latest draft, root cause, and escalation action available in the simplified layout.
- Cleaned up unused imports from the simplified `/360-view` page.

# C37
- Tightened the reusable timeline spacing to reduce empty vertical space between the date, title, metadata, and description.
- Made each `/360-view` timeline item selectable by clicking anywhere on the item, with keyboard support for Enter and Space.
- Added hover popovers to timeline complaint descriptions using the shared hover text component so long descriptions can be read fully.
- Replaced vague timeline labels with clearer issue-category and customer-need text derived from complaint type, intent, and product/service fields.
- Updated the selected-case metadata labels to use user-facing terms like `Issue category` and `Customer need` instead of raw product/service wording.

# C38
- Moved the shared dashboard Day/Dark switch to the left side of the global search bar in the topbar.
- Removed the `/360-view` `Escalate selected` action from the topbar breadcrumb area.
- Kept the in-page selected-case escalate button available so escalation remains contextual to the selected complaint.

# C39
- Moved the `/360-view` timeline hover popover trigger from only the description text to the entire timeline item.
- Added timeline item popover actions for selecting the complaint, opening complaint details, copying complaint text, and escalating the complaint.
- Kept the full complaint description visible inside the timeline item popover with scroll support for long text.
- Wired the timeline item escalation action to update complaint status and refresh local selected/timeline state.
- Removed the nested description-only hover text usage so the whole timeline row is the primary interaction surface.

# C40
- Reverted the `/360-view` timeline popover trigger back to the description text using the shared `HoverText` component.
- Added `Select`, `View details`, and `Escalate` actions inside the text popover, matching the table popover action pattern.
- Retained built-in copy support through the shared popover's `copyText` behavior instead of a custom row-level copy handler.
- Removed the direct row-level hover card wrapper and manual copy handler from the timeline page.
- Kept full-row click and keyboard selection behavior for timeline items.

# C41
- Added an optional child-trigger mode to the shared `HoverText` component so existing popover UI can be attached to a larger trigger surface.
- Updated the `/360-view` timeline to open the same text popover when hovering anywhere on a timeline item instead of only the description text.
- Kept the timeline popover content, copy behavior, and `Select`, `View details`, and `Escalate` actions unchanged.
- Preserved timeline row click and keyboard selection behavior while expanding the hover target.

# C42
- Sorted `/360-view` complaint history chronologically before rendering so timeline ordering is deterministic.
- Reversed the visible timeline order so the latest complaint appears at the top.
- Updated timeline numbering so the oldest complaint remains step `1` at the bottom and newer items receive higher numbers.
- Changed the default selected complaint after search to the newest matching complaint, matching the latest-first timeline view.

# C43
- Removed the profile avatar and user dropdown from the shared dashboard topbar.
- Removed now-unused topbar authentication, routing, dropdown, and avatar imports from the dashboard shell.
- Added overflow containment to the shared dashboard shell and sidebar inset to prevent page-level topbar/content overflow glitches.
- Tightened topbar flex sizing so breadcrumbs, theme switch, and global search fit without forcing horizontal overflow.
- Adjusted the topbar theme switch visibility to desktop widths so smaller headers stay clean.

# C44
- Made the shared dashboard shell control the sidebar open state instead of relying only on the provider default.
- Read the existing `sidebar_state` cookie on shell mount so collapsed sidebar state persists after route navigation.
- Preserved the existing sidebar behavior where main navigation items collapse the sidebar after navigation.
- Kept utility interactions such as global search and account dropdown navigation outside the collapse helper.

# C45
- Changed backend CORS regex configuration to default to `None` unless `CORS_ALLOWED_ORIGIN_REGEX` is explicitly provided.
- Added blank-value handling for optional backend environment variables so an empty CORS regex does not become an active pattern.