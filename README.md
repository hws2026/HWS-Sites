# GitHub Pages deployment

The suite now has a standalone GitHub Pages frontend with Supabase email/password authentication and a Cloudflare backend. See [DEPLOYMENT.md](DEPLOYMENT.md) for configuration, password-reset emails and automatic reminders.

# HWS Studio

A customer website suite with a separate workspace admin dashboard, customer portal, and visual editor.

## Included

- Admin: overview, customer contact records, multiple customer sites, editable workspace name, site-specific access grants, archive/restore, unpublish, and publishing activity.
- Customer portal: assigned websites only; editor and read-only viewer roles. Invitation activation binds a verified signed-in email to its stable user ID. Invitations do not send email.
- Editor: eighteen section types, native drag/drop insertion and reordering, accessible click-to-add and move buttons, page management and nested navigation, image URLs/uploads, colors, typography, undo/redo, draft backups, device previews, autosave, optimistic concurrency, and a separate published snapshot.
- Billing: administrator-assigned monthly/yearly/one-time prices, customer Stripe checkout, subscription portal, invoice history, and verified webhook updates.
- Domains: included public site addresses, custom DNS ownership verification, certificate status, primary domain redirects, and explicit public-access controls.
- Storage: Cloudflare D1 customer/site/access records and private Supabase Storage image assets for the GitHub Pages deployment. No browser storage is the authoritative data source.
- Ten sample websites and customer records are initialized in a new administrator workspace. Contacts, statistics, news, and events are fictional. The demo campus image is generated.

## Access and publishing

The suite starts private. The `#/website/<site-id>/<slug>` route is an assigned-access review. On the standalone backend, publish in the editor and enable public access under Domains to serve `/sites/<site-id>/` and connected domains without sign-in. Custom domains require Cloudflare for SaaS configuration and DNS verification. Invitation email delivery is not configured. See DEPLOYMENT.md for the separate GitHub Pages/Supabase deployment and required provider setup.

The account owning a workspace is its administrator. Customer grants apply to specific sites: editors can save drafts, viewers can only preview, and administrators publish. Every server mutation checks identity and site/workspace authorization. Archiving unpublishes the website; restore retains the draft. Conflicting saves return HTTP 409.

## Run locally

Requires Node 22.13+ and npm. `npm run dev` starts the portable Vinext preview. `npm run build` emits a Cloudflare-compatible Worker. `npm run db:generate` generates additive Drizzle migrations. Follow the Sites workflow for local migration application and publishing.

## Reference architectures

The templates reproduce broad information architecture and module patterns, with reference-inspired typography, header arrangements, menus and page composition using fictional identities and dummy content; they are not pixel-perfect copies.

| Template | Reference | Structural features |
|---|---|---|
| Meadowbrook Union Schools | https://www.sau70.org/ | Audience utility links, school directory, welcome, news, calendar, resources |
| Cedar Grove Day School | https://www.craneschool.org/ | Editorial hero, school story, programs, admission CTA, community/giving |
| Lakeview Community Schools | https://www.greececsd.org/ | District header, schools/programs, service shortcuts, showcase |
| Summit Ridge High School | https://www.greececsd.org/o/aths | School header, students, athletics, technology, resources |
| Willow Creek Middle School | https://horizon.cherrycreekschools.org/ | Announcement hero, family tasks, calendar, school and district updates |
| Redstone High School | https://eaglecrest.cherrycreekschools.org/ | School announcements, programs, athletics, calendar, district updates |
| Maple County Schools | https://www.swdubois.k12.in.us/ | Program/service tiles, parent/student portals, news/events, statistics |
| Harborlight International Academy | https://www.ics.edu.sg/ | Admissions, school divisions, feature stories, news/events, testimonial |
| Brookfield Public Schools | https://www.greenwichschools.org/ | Audience links, district departments, mission, statistics, news/calendar |
| Riverton Public Safety | https://greecepolice.org/ | Divisions, policies, service links, mission, leadership, newsletters |

Reference review: October 10, 2026. Source attribution is also available in the template library.

## Shared editor capabilities
Every reference template and customer website uses the same editor, model, renderer and save validation. Existing legacy item content is preserved and becomes structured when edited. Individual icon tiles, news cards, quick links, event records, statistics, column cards, gallery images, FAQs and directory entries can be added, edited, reordered or removed. Images and destinations are editable per item.

All 18 block types are available on any page of any template. Sections support width, spacing, corners, columns, anchors, mobile visibility, publication visibility, hero overlays and reversed image/text layouts. Sections can be copied between pages; navigation pages can be reordered. Site-wide settings include logo uploads, layout style, header/footer colors, utility text, footer links and announcements. YouTube and Vimeo links use a restricted embed parser. Existing role rules apply to all shared controls.

Run `npm run verify:templates` for the 234 template/block validation and render combinations (ten references plus three general templates); `npm run verify:api` checks persisted expanded content across all ten templates against the local production Worker on port 5174.

The Icon Grid section includes 36 selectable Lucide icons, keyword search, labels, descriptions, optional links and custom PNG/JPEG/WebP/GIF images. Quick links and column cards share the icon picker. A custom image takes precedence; selecting a built-in icon replaces it. All icons, images and destinations persist in the normal draft/published snapshot.

Navigation supports compact dropdowns and full-width mega menus, with site defaults and per-parent-page overrides. Search covers visible pages and content; social profile links appear in the header and footer. Each website has an Admin link in its desktop footer and inside its mobile Menu. On GitHub Pages it opens a branded, site-specific login route. The backend requires an administrator or editor assignment for that exact site; an account assigned only to a different site receives an invalid-account response with a null site. Password recovery retains that site context. Demo login screens are previews and do not authenticate.

`npm run verify:backend` exercises server authorization, site-specific login, saved/published icon content and reminders against local D1/R2 and mocked identity/email services. `npm run verify:storage` adds 16 checks for the standalone Supabase Storage deployment. The backend must be built first as described in `DEPLOYMENT.md`; these checks do not deploy or send real mail.

Willow Creek and Redstone include reference-shaped two-column navigation and an Our schools directory with five editable category tabs and fictional school destinations. Both mega-menu layouts and the tabbed directory are available in Theme on every template. The page limit is 150 to support these expanded navigation structures. The compact Menu presentation keeps nested menus in a single column even when used on desktop.

### Reference styling and motion

The reference demos include editable hero slideshows with fade or horizontal transitions, play/pause, previous/next controls, configurable timing, optional photo movement, and optional muted HTTPS MP4/WebM backgrounds. Hero section settings edit the additional slides; Theme controls animations and sticky navigation. All layouts support these options. Automatic motion pauses during editing, hover, keyboard interaction, and when out of view; reduced-motion preferences disable autoplay and transitions.

School templates use an 800 ms hero fade, 400 ms navigation reveal, 600 ms directory transition, compact sticky navigation, scrolling event cards, and adjacent school-news and district-announcement columns. Other references retain their own carousel controls, resource treatments, menu drawer, spacing, and typography. Fictional names, graphics, and demo imagery remain intentional. Full-window local previews are available at `#/demo/<template-id>` (for example `#/demo/horizon`); these are demo content only, without customer data.

### Header and navigation editing

Click a header or menu on the canvas, or choose **Header & menus** on the left. Its controls open in **Section settings** on the right. Header controls edit branding, logo, colors, utility/resource links and search. Menu controls provide independent labels, visibility, parent menus, ordering, **Mini dropdown / Mega menu** buttons, existing-page links and new submenu pages. Select **Our schools** to edit directory categories and destinations. Site-wide defaults remain in **Theme**. These controls work with every template; draft backups and published snapshots retain the settings. **Theme → Restore draft backup** imports a validated JSON backup and can be undone.

School-style headers switch to the compact menu below 1200px of canvas width; other adaptive headers use their layout breakpoint. On mobile, the header shows only the site identity and **Menu** button. Search, utility links, school directory, navigation, resources, social links and the site-specific Admin link are inside Menu. Options are vertical lists with nested submenus, including school-directory categories. Menu panels scroll within their available height. Desktop, tablet and mobile previews use consistent canvas widths and fit the available editor space; the same container breakpoints apply to published sites.

### Finalsite composition refinements

The seven Finalsite-style demos now use template-specific section compositions: seven editable full-height day-school stories with page navigation dots; nine corporation photo tiles with hover details; a district news mosaic and paired notice panels; international circular resources, photo program cards and a feature story; and network mission, news and calendar treatments. School templates have weekday date cards and a calendar footer. Corporation, international and network headers default to two-column mega menus with their own colors and dimensions. Tablet and mobile breakpoints retain the Menu-only header and vertical link lists. Existing customer content is preserved; new section arrangements appear in demos and newly selected templates.
# HWS-Sites
