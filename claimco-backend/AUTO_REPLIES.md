# Account auto-replies

An account can send one prewritten reply when a buyer first messages about an item. The reply appears in the conversation as an **Automatic reply** from that seller. Opening a conversation without sending a message does not trigger it. Later buyer messages in the same conversation do not trigger another reply. If the seller has already answered personally, no automatic reply is added.

This is configured directly in the production database; there is no public setting or API endpoint. Deploy the backend change before running the SQL below so the `auto_reply_text` column exists. The backend adds the column to existing SQLite and Postgres databases on startup without resetting data.

Set the reply for a specific account in the online Postgres SQL editor:

```sql
UPDATE users
SET auto_reply_text = 'Thanks for your interest! We will get back to you soon.'
WHERE email = 'litiger698@gmail.com'
RETURNING id, name, email, auto_reply_text;
```

Use the returned row to confirm the right account was updated. Replace the address and text for other accounts. Keep the reply at 1,000 characters or fewer, and double single quotes inside the text (`'We''ll reply soon.'`). Changing the text affects future conversations; a conversation that has already received an automatic reply will not receive another.

To turn it off:

```sql
UPDATE users
SET auto_reply_text = NULL
WHERE email = 'litiger698@gmail.com'
RETURNING id, name, email, auto_reply_text;
```

To test, sign in as a different buyer, open one of the configured seller's items, send a message, and confirm the automatic reply appears once. Then send another message and confirm there is no second automatic reply. Test a different item to see a separate reply.
