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
- Forms: published websites accept responses into a private per-site inbox, with editable fields, confirmation text, status tracking, CSV export and small private attachments. Form responses do not send email.
- New administrator workspaces start with no customer or website records. The template library remains available with fictional content. Choose **New website → Website owner → My account** to create your own website from any starting template, or select a customer. Personal websites do not create customer records.

## Choose how to start

When creating a website or choosing a replacement template in the editor, select **Start from scratch** or **Use the whole template**. Scratch is the default: it keeps the selected design, colors, fonts, and header/footer styling, with one empty Home page. Demo pages, sections, menus, contact details, links, logos, and calendar events are removed. Add your own content from the Library and your own navigation in Header & menus.

Whole template includes all demo pages, menus, sections, and sample events. In the editor, selecting a design does not replace anything until you click the apply button. Replacement keeps an existing customer's site name and address and can be undone. New-site API requests may pass `startMode: 'scratch'` or `'full'`; omitted values retain the previous full-template behavior for older clients.

Scratch creation checks the saved draft before opening the editor. If an older backend ignores the choice, the frontend saves and verifies the blank starter through the existing draft API. This applies only to the untouched, unpublished record just created. Failed verification keeps the form open with a retry for the same record; it never silently clears an existing edited website. Run `npm run verify:creation` for the mixed-version and retry regression checks.

## Access and publishing

The admin suite and editor require sign-in. **Publish website** saves the approved snapshot and enables anonymous access at `/sites/<site-id>/` and connected domains in one operation. Old `#/website/<site-id>/<slug>` links redirect there. **Unpublish website** closes pages, media and forms while retaining the draft. Custom domains use a Cloudflare Pages Free gateway, DNS ownership verification and HTTPS. Customer archiving suspends their websites and reminders; restoring does not automatically republish. Permanent customer deletion requires archiving first, an exact-name confirmation and cleanup of all their websites and related data. Active billing must be resolved first. See DEPLOYMENT.md for setup. Editors save drafts, viewers preview, and website administrators publish. Every server mutation checks identity and site/workspace authorization; conflicting saves return HTTP 409.

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

All 29 block types are available on any page of any template. Sections support width, spacing, corners, columns, anchors, mobile visibility, publication visibility, hero overlays and reversed image/text layouts. Sections can be copied between pages; navigation pages can be reordered. Site-wide settings include logo uploads, layout style, header/footer colors, utility text, footer links and announcements. YouTube and Vimeo links use a restricted embed parser. Existing role rules apply to all shared controls.

Run `npm run verify:templates` for the 377 template/block validation and render combinations (ten references plus three general templates); `npm run verify:api` checks persisted expanded content across all ten templates against the local production Worker on port 5174.

The Icon Grid section includes 36 selectable Lucide icons, keyword search, labels, descriptions, optional links and custom PNG/JPEG/WebP/GIF images. Quick links and column cards share the icon picker. A custom image takes precedence; selecting a built-in icon replaces it. All icons, images and destinations persist in the normal draft/published snapshot.

Navigation supports compact dropdowns and full-width mega menus, with site defaults and per-parent-page overrides. Search covers visible pages and content; social profile links appear in the header and footer. Each website has an Admin link in its desktop footer and inside its mobile Menu. On GitHub Pages it opens a branded, site-specific login route. The backend requires an administrator or editor assignment for that exact site; an account assigned only to a different site receives an invalid-account response with a null site. Password recovery retains that site context. Demo login screens are previews and do not authenticate.

`npm run verify:backend` exercises server authorization, site-specific login, saved/published icon content and reminders against local D1/R2 and mocked identity/email services. `npm run verify:storage` adds 16 checks for the standalone Supabase Storage deployment. The backend must be built first as described in `DEPLOYMENT.md`; these checks do not deploy or send real mail.

Willow Creek and Redstone include reference-shaped two-column navigation and an Our schools directory with five editable category tabs and fictional school destinations. Both mega-menu layouts and the tabbed directory are available in Theme on every template. The page limit is 600 to support these expanded navigation structures. The compact Menu presentation keeps nested menus in a single column even when used on desktop.

### Reference styling and motion

The reference demos include editable hero slideshows with fade or horizontal transitions, play/pause, previous/next controls, configurable timing, optional photo movement, and optional muted HTTPS MP4/WebM backgrounds. Hero section settings edit the additional slides; Theme controls animations and sticky navigation. All layouts support these options. Automatic motion pauses during editing, hover, keyboard interaction, and when out of view; reduced-motion preferences disable autoplay and transitions.

School templates use an 800 ms hero fade, 400 ms navigation reveal, 600 ms directory transition, compact sticky navigation, scrolling event cards, and adjacent school-news and district-announcement columns. Other references retain their own carousel controls, resource treatments, menu drawer, spacing, and typography. Fictional names, graphics, and demo imagery remain intentional. Full-window local previews are available at `#/demo/<template-id>` (for example `#/demo/horizon`); these are demo content only, without customer data.

### Header and navigation editing

Click a header or menu on the canvas, or choose **Header & menus** on the left. Its controls open in **Section settings** on the right. Header controls edit branding, logo, colors, utility/resource links and search. Menu controls provide independent labels, visibility, parent menus, ordering, **Mini dropdown / Mega menu** buttons, existing-page links and new submenu pages. Select **Our schools** to edit directory categories and destinations. Site-wide defaults remain in **Theme**. These controls work with every template; draft backups and published snapshots retain the settings. **Theme → Restore draft backup** imports a validated JSON backup and can be undone.

School-style headers switch to the compact menu below 1200px of canvas width; other adaptive headers use their layout breakpoint. On mobile, the header shows only the site identity and **Menu** button. Search, utility links, school directory, navigation, resources, social links and the site-specific Admin link are inside Menu. Options are vertical lists with nested submenus, including school-directory categories. Menu panels scroll within their available height. Desktop, tablet and mobile previews use consistent canvas widths and fit the available editor space; the same container breakpoints apply to published sites.

### Finalsite composition refinements

The seven Finalsite-style demos now use template-specific section compositions: seven editable full-height day-school stories with page navigation dots; nine corporation photo tiles with hover details; a district news mosaic and paired notice panels; international circular resources, photo program cards and a feature story; and network mission, news and calendar treatments. School templates have weekday date cards and a calendar footer. Corporation, international and network headers default to two-column mega menus with their own colors and dimensions. Tablet and mobile breakpoints retain the Menu-only header and vertical link lists. Existing customer content is preserved; new section arrangements appear in demos and newly selected templates.


### Expanded interiors, content library, and colors

The ten fictional reference templates contain 1,347 generated pages based on their public page inventories, with reusable interior layouts, breadcrumbs and section navigation. The library offers 44 section presets and 19 complete page layouts, including nested tabs/accordions, grouped tables, documents, directories, forms and calendars. Saved sections can be reused or exported/imported as JSON. Template coverage is based on public inventories and representative interior inspection, not a claim that every source page has been visually replicated. Source-only portals and external applications use fictional local content. Demo and editor-preview forms do not submit data; published public websites can receive responses.

Theme supports 37 color roles and an editable template palette for existing backgrounds, text, buttons, borders, menus, hover states and overlays. Section and nested-section colors override the site defaults. Raster image/video colors remain part of their assets. Header utility/resource mini menus have independently editable labels and destinations.

### Website calendar

Use **Calendar** in the editor toolbar. Add/edit/delete events with a title, start/end, all-day option, category, location, description, link and featured flag. Each website stores its own event list and timezone. Connected homepage event cards, full month/list calendars, and calendars inside groups/tabs read that list; all new templates and newly inserted calendar modules use it. Event sections offer category filters, featured-only display, a card limit, and automatic hiding of past events. Choose **This section only** to keep an independent local list.

Changes update the draft preview immediately and use the normal autosave/undo/backup flow. **Publish** updates all live placements and the events used by automatic reminders; draft-only edits do not alter live reminders. Reminder delivery still requires the existing email-provider configuration and enabled admin rules. Shared events create one reminder per website even when displayed in many sections. Rescheduling/removing published events cancels obsolete queued reminders on the next scheduler run.

Existing websites without a shared calendar show **Connect website calendar**. This imports and deduplicates dated events while preserving undated local cards. Calendars support up to 500 events within the overall 900 KB website limit. Time inputs use the selected website timezone, including daylight saving time. Calendar events and categories remain editable in every template.

Public account sign-up and its submission handler have been removed from the suite login screen. Existing-account sign-in and password recovery remain available; administrators provision customer accounts. This frontend change does not change the Supabase project's registration setting.

Run `npm run verify:calendar` for synchronization, migration, filtering, backups, reminder deduplication, timezone/DST, event validation, and login-option checks.

### Forms and private responses

Add a form from **Library**, select it, and edit its fields in **Section settings**. Labels, field types, required fields, choice options, submit text, confirmation message, privacy note and **Accept responses when published** are editable on every template, including nested forms. Choose **Publish website** to receive submissions at its included public address or connected domain. Demo, editor and assigned-access review previews never submit responses.

Open **Forms inbox** in the admin/customer portal or editor toolbar. The workspace owner and editors assigned to that website can read responses, mark them new/read/archived, restore archived responses and download private attachments. Viewers and accounts assigned only to another website cannot access them. CSV export includes up to 100 responses from the current list offset and protects spreadsheet formula cells. Responses snapshot the submitted field labels and values, so later form edits do not rewrite earlier answers.

Forms allow up to three attachment fields, each accepting a PDF, PNG, JPEG or TXT file up to 256 KB. Responses and attachments are stored privately in Cloudflare D1; existing image storage is unchanged. The server validates against the published form, rejects invalid or unexpected fields, deduplicates retries, uses a honeypot and limits submissions per website and sender. These are basic abuse controls, not a CAPTCHA. Failed submissions retain the visitor's answers and show the reason. No response emails are sent.

**Deployment:** apply migration `0004_glossy_ma_gnuci.sql`, then deploy the backend and Pages frontend from this source version. See **Deploying forms and save-error details** in [DEPLOYMENT.md](DEPLOYMENT.md). Run `npm run verify:forms` after the backend dry-run build for isolated integration checks.

### Save failure details

Failed saves display a persistent reason beside the editor, retain the draft in the current tab, and offer retry and a downloadable draft backup. Validation errors identify the affected page/section when possible. An expired session offers sign-in in a new tab; retry after signing in. A version conflict asks you to back up your edits and load the latest draft before saving again. Connection, permission, size-limit and backend failures have specific messages. Keep the tab open or download a backup before refreshing an unsaved draft.

## Media uploads

All customer templates support JPG, PNG, WebP, GIF, MP4, WebM, and PDF files up to **50 MB per file**. Image controls upload images, Video sections and Hero settings upload videos, and Documents items upload PDFs. Uploads show progress, cancellation, and specific failure reasons. Published media can be viewed without signing in; draft-only files require website access. Unpublishing also blocks public media.

For Supabase Free, keep `hws-suite-media` private, set its file-size limit to `52428800`, and allow `image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, application/pdf`. The project-wide Storage limit must also be 50 MB. The frontend streams files through authenticated `PUT /api/upload`; the backend validates actual byte length and streams to storage. Videos support byte-range requests and PDFs download with their original filenames. No schema migration or paid plan is required. Total storage and bandwidth still count toward the project allowance.

Oversized images are optimized in the browser before upload. Images already at or below 50 MB are unchanged. Larger images retain their proportions, with an 8,192-pixel edge / 16-megapixel cap, JPEG or transparency-preserving WebP encoding, and further reduction until below the upload limit. Oversized GIF/APNG/animated WebP uploads ask before converting to a still image. Videos and PDFs still have a 50 MB limit. Conversion failures explain how to retry.

Platform administrators can use **Workspace settings → Test storage connection** to upload, read back, and remove a temporary test image. This never changes a website draft. Missing keys and accidentally configured publishable keys have separate actionable errors. For browser optimization checks, start `npm run dev:pages` and open `/@fs/<absolute-project-directory>/scripts/verify-image-upload.html`.

Phones and tablets can sign in to a limited mobile workspace with Billing, Forms, and Events. Full website editing and administration still require a computer. The backend permits only the mobile authentication, billing, forms, and calendar routes; each route retains verified account and website authorization. The mobile workspace shares the 30-minute inactivity logout. Device detection combines browser hints, user agents, and the desktop-mode iPad touch signature, without treating a narrow desktop window as a mobile device. Public websites and visitor forms remain available on all devices.

Run `npm run verify:devices` for detection cases. With `npm run dev:pages`, open `/@fs/<absolute-project-directory>/scripts/verify-device-browser.html` to exercise the actual app under local simulated profiles. This fixture is excluded from the production build and sends no authentication requests to a real account.

### Template library and organization websites
Platform admins can archive/restore designs under Template library. Archived designs disappear from new template selectors. Saved websites keep their content and publishing access, with a notice in the suite and editor. A retired design can still be copied from an assigned website within the same customer organization.

New websites support: a neutral blank homepage; a library design with one empty homepage or all sample content; or an existing website copied as design only, an empty-page outline, or the whole saved draft. Outline copies retain page hierarchy, header/footer, colors, and menus while clearing page sections, summaries, banners, events, announcements, and saved library content. Copies get fresh IDs and stay unpublished. No domains, form responses, billing, or access lists are copied.

Customer editors can create siblings only inside the organization of an assigned editable site. They receive editor access to the new draft; the platform administrator remains its owner/publisher. Viewers cannot create. Copied uploaded media has separate site authorization while reusing stored bytes within the same customer; customer deletion deduplicates object cleanup.

Apply D1 migration `0006_luxuriant_living_tribunal.sql` before deploying the updated Worker. It adds library status and aligns legacy template labels with saved draft designs without changing page content. `verify:creation` and `verify:backend` cover all starting modes, template retirement, permissions, and copied media. The local-only browser review is `scripts/verify-lifecycle-browser.html` (`?mode=portal` or `?mode=editor`); it uses fictional data and is excluded from the production entry points.

Website branding is editable in the right-side Header settings and Site style panel: choose Logo only or Text + logo, upload/paste a favicon, then publish. An uploaded logo defaults to Logo only unless a display choice was already selected. Names remain in page titles, accessible labels, and copyright. Uploaded favicons use the same site-scoped public media access as logos; they are copied with sibling-site branding. Suite colors are #2020b7 and #333333, scoped separately from customer website palettes.

The Husky Suite emblem in `public/husky-suite-logo.png` is the supplied original PNG, used unchanged in the suite login, sidebar, editor, and desktop-access screen. Its display size is controlled by CSS.

### Inactivity, image sizing, and legal footer

The GitHub Pages suite signs out the current browser session after 30 minutes without interaction, with a two-minute warning and Stay signed in control. Activity is shared across tabs; automatic token refresh does not count as activity. Reloading or waking a sleeping computer checks the stored deadline before allowing workspace requests. This browser inactivity control uses the existing Supabase session and does not require a paid plan. It does not replace server authorization or change JWT expiry. Unsaved website drafts are preserved for the same account and website in that tab, with a Restore unsaved draft prompt after signing in. If browser storage is unavailable, recovery lasts while that tab stays open.

Image sizing in Section settings supports percent/pixel width, automatic/fixed height, cover/contain, position and alignment. Collection images, nested images and logos have independent controls; hero slides support fit and position within their hero area. Pixel widths shrink to the available space. These settings change display only, preserve original media, and save/publish with every template.

Header & menus → Footer & legal links edits the copyright company name and individually toggles Privacy Policy, Terms of use, and Terms of service links. Each accepts an existing page or URL. Enabled links appear when a destination is provided; disabled links retain their destinations. Footer text follows `copyright (c) [current year] [company]. All Right Reserved.` and uses the site name unless overridden. Publish to update configured links on the public website.
