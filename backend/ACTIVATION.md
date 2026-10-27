# AND FC Club Hub — activation and operating plan

## Current state

The website interface is published, but `HUB_ENABLED` is false. No Hub Firebase modules are loaded and no member data or submissions are requested while it is disabled. The Hub rules fragment passed 10 automated Firestore Emulator security tests locally. Firebase authentication and data rules have NOT been deployed or checked against production by this change. Do not invite members to post yet.

The existing Firebase project is `and-fc-club-app`. Existing club-app approvals do not automatically grant Hub access. Hub roles are held separately to prevent accidental approval or self-enrolment through the old registration page.

## Enable securely

1. Open the existing project's Firebase Console. Save a backup of its current Firestore rules. Merge the contents inside `match /databases/{database}/documents` from `hub.rules` into the existing documents block. Keep legacy attendance and registration rules. Audit any existing wildcard such as `match /{document=**}`: a broad allow also grants Hub access, so it MUST be narrowed or removed. A second deny does not override a broad allow.
2. Test the merged rules using the Firestore Emulator and the test suite in `tests/hub-rules.test.mjs` against the actual merged rules file. Set `HUB_RULES_FILE` to that file. The repository fragment alone cannot prove the live database is secure. Publish the merged rules only after all tests pass; preserve the current app's existing tests too.
3. Confirm Email/Password authentication is enabled, the GitHub Pages hostname is an authorised domain, and the three pinned Firebase 13.1.0 module URLs load successfully. Reuse the project's existing web-app configuration; the API key is a public Firebase identifier, not a secret.
4. In Firestore Console create `hubStaff/<verified-coach-auth-UID>` with `active: true` (boolean) and `role: "admin"` for the club administrator. Use `role: "moderator"` for other authorised coaches. No browser user can grant staff roles. Remove or deactivate them in Console when responsibilities change.
5. Create `hubSettings/access` with `enabled: true` (boolean), `schemaVersion: 1` (number). Setting enabled false disables all member posts, reports, votes and room access at the database level.
6. Change `HUB_ENABLED` to true in `hub-config.js` and publish. Sign in using the administrator account. Approve each verified person's UID, neutral display name and room in the Hub administrator form. Check their identity with the club. Never approve a shared player account for both adults and junior families. Junior access uses a guardian-owned account; verify the guardian relationship privately. Store no dates of birth or safeguarding disclosures in the Hub.
7. Run the production acceptance checklist below using separate test accounts. Remove the test content and enrol only verified club members after this passes. If any check fails, switch `hubSettings/access.enabled` to false and leave the website flag off until corrected.

## Acceptance checklist

- Signed-out, unverified, unapproved and suspended users cannot read any room, posts, reports or votes using direct Firestore requests.
- Adult members cannot read or write junior content; junior-family accounts cannot read or write adult content. Test with direct document IDs, queries, replies, report and vote paths, not just the interface.
- A member cannot modify hubMembers, hubStaff, hubSettings, author UID, alias, room, message text or moderation metadata; cannot directly create approved content.
- New posts, polls and replies remain pending until a coach approves them. Other members cannot see pending/rejected posts. Withdrawals hide the message from the shared feed.
- A poll accepts exactly one immutable choice per account; ordinary members cannot read other people's votes. Coaches see totals. Existing votes remain private when a poll is hidden.
- A report atomically hides the reported message, can be read only by authorised coaches, and cannot be submitted for another room. Resolving a report does not republish content. Coach approval is a separate action.
- A locked/hidden/withdrawn parent cannot accept replies or new votes; approving a reply requires an approved unlocked parent.
- Switching rooms, signing out or backgrounding the page clears displayed member content. The Hub uses in-memory authentication and Firestore's default memory cache, not offline persistence. No private content is placed in GitHub, localStorage, static JSON, or service-worker caches.
- Existing public pages, club app registration, attendance and photo gallery continue working.

## Operating arrangements

- Assign at least two named moderators and agree checking times with Jim/Ryan before launch. Reports do not send email/push alerts; the dashboard must be checked. Tell members this is not an emergency service.
- All messages, including coaches' messages and replies, enter the approval queue. Review suitability, consent and personal information. No direct messages, files or image uploads are implemented. Text is rendered as plain text, not HTML. Link/contact checks assist moderators but are not a substitute for review.
- Keep banter kind and avoid polls ranking, mocking or excluding individual players. Polls have two choices, one vote per approved account; guardian accounts vote as one account. Totals are visible only to coaches.
- Use neutral aliases approved by the administrator. Public website visitors can see the Hub sign-in shell and rules, but must never receive private member data.
- Reports are private structured reasons, without an open-text safeguarding disclosure box. Speak privately to Ryan or another coach for safeguarding concerns and follow club procedures. Moderators cannot rewrite members' text; moderation stores the most recent moderator UID and timestamp, not a complete immutable audit history.
- Review posts and membership monthly. Archive reviewed older content through the trusted Console so the 50-record views remain useful; do not delete safeguarding evidence without following the club's procedure. Agree and communicate a retention period before launch. Firebase Console administrators can review/export/delete data for access and deletion requests.
- This first release uses refresh buttons, not chat notifications. No automated spam filtering, rate limiting, email alerts or public poll results are included. Enable Firebase App Check and set usage/budget alerts before a wider launch. Manual approval limits what becomes visible; it does not prevent authorised users from submitting spam.

## Local checks

`npm install` then `npm test` (10 validation/DOM-interface tests). The additional 10 security tests passed against the isolated Hub rules fragment using the Firestore Emulator. A real-browser visual check was not available in the build environment; check mobile/desktop layouts during activation.

For backend enforcement tests, install `firebase`, `@firebase/rules-unit-testing` and `firebase-tools` in a development environment, start a Firestore emulator on 127.0.0.1:8080, then run:

`HUB_RULES_FILE=/absolute/path/to/merged-firestore.rules node --test tests/hub-rules.test.mjs`

Never deploy this fragment as a replacement for the project's current rules. It intentionally does not include the old app's policies.
