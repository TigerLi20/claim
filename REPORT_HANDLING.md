# Report handling

Contact address: collegehillmarket1@gmail.com. The site and app expose report and block controls on listings, profiles, and chat. Authenticated reports are stored in `reports`; blocking immediately prevents either side from continuing a conversation. Account deletion removes the account, listings, chats, images, push tokens, and the user's own reports from active storage.

1. Check `/reports-admin` and the contact inbox every day. The reports page is restricted by the API to `REPORT_ADMIN_EMAIL` (default `tiger_li@brown.edu`). Keep the admin account protected and change the env var if ownership changes.
2. For each new report, open the referenced listing, user profile, or conversation if it still exists. Preserve the report ID and key facts in a private incident log. Do not share chat text beyond people handling the report.
3. Remove prohibited or fraudulent listings with the seller controls or by a documented admin database action. For harassment or scams, block affected accounts where appropriate and suspend the offending user (`users.status = 'suspended'`) after reviewing evidence. For immediate safety threats, advise the reporter to contact local authorities.
4. Mark the report reviewed or closed in `/reports-admin` after taking action. Reply from the contact inbox when follow-up is needed. Review repeated reports against the same account together.
5. Handle privacy or deletion requests from the registered email after verifying ownership. Direct signed-in users to Account → Delete account. For users who cannot sign in, verify their registered email before deleting through the admin database process. Document the request date and completion in a private log.

The admin page is a triage queue, not a full moderation dashboard. It does not expose another user's messages to the admin. Retain incident notes only as long as needed for safety and legal obligations.
