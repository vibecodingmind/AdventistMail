# Church Admin Guide — Adventist Mail

A step-by-step guide for church administrators to set up and manage their organization's email on Adventist Mail.

---

## Getting Started

### 1. Register your organization

1. Go to the Adventist Mail portal and click **Sign Up**.
2. Choose **Organization** registration.
3. Fill in:
   - **Organization name** — e.g. "Maranatha SDA Church"
   - **Type** — Church, Ministries, Institutions, or Unions
   - **Requested email** — The main email you want (e.g. `info@maranatha-church.org`)
   - **Your email and password** — Your admin login credentials
4. Submit. A platform admin will review and approve your registration.

### 2. Log in

Once approved, log in with the email and password you provided during registration.

---

## Managing Your Organization

### Access organization settings

1. Click **Organizations** in the sidebar.
2. Select your organization.
3. You'll see tabs: **Members**, **Official Emails**, **Domains**, **Branding**.

---

## Verify Your Domain

Before requesting email addresses on your domain, you must verify that you own it.

### Step-by-step

1. Go to your organization → **Domains** tab.
2. Click **Add Domain** and enter your domain (e.g. `maranatha-church.org`).
3. The system shows a DNS TXT record you need to add:
   - **Name:** `_adventistmail.maranatha-church.org`
   - **Value:** `adventist-mail-verify=<your-token>`
4. Log in to your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.) and add the TXT record.
5. Wait a few minutes for DNS to propagate.
6. Come back to Adventist Mail and click **Verify**.
7. Once verified, the domain shows a green "Verified" badge.

### Common DNS providers

| Provider | Where to add TXT records |
|----------|--------------------------|
| GoDaddy | DNS Management → Add Record → TXT |
| Cloudflare | DNS → Add Record → TXT |
| Namecheap | Advanced DNS → Add New Record → TXT |
| Google Domains | DNS → Custom records → TXT |

---

## Request Email Addresses

Once your domain is verified, you can request addresses.

1. Go to your organization → **Official Emails** tab.
2. Click **Request** and enter the address (e.g. `pastor@maranatha-church.org`).
3. A platform admin will approve the request.
4. Once approved, all organization members automatically get access to the new address.

### Suggested addresses

| Address | Use |
|---------|-----|
| `info@church.org` | General inquiries |
| `pastor@church.org` | Senior pastor |
| `secretary@church.org` | Church secretary |
| `treasurer@church.org` | Financial matters |
| `youth@church.org` | Youth ministry |
| `media@church.org` | Media/communications |

---

## Manage Members

### Invite a new member

1. Go to **Members** tab.
2. Enter their email and click **Invite**.
3. Copy the invite link and share it with them.
4. They click the link, create an account (if needed), and join your organization.

### Add an existing user

If the person already has an Adventist Mail account:

1. Go to **Members** tab → **Add existing user**.
2. Enter their email and click **Add**.
3. They immediately get access to your organization's mailboxes.

---

## Using Email

### Compose

1. Click **Compose** (or press `C`).
2. In the **From** dropdown, choose which address to send from (personal or any shared address you have permission for).
3. Write your email and click **Send**.

### Reading shared mailboxes

Use the **mailbox selector** in the sidebar to switch between your personal inbox and shared organization mailboxes.

### Quick reply

When viewing a message, use the reply box at the bottom to send a quick reply without opening the full compose window.

### Scheduled send

In the compose window, set a date/time in the **Sched** field to send later.

---

## Customize Your Organization

### Branding

Go to your organization → **Branding** tab:

- **Logo URL** — Link to your church logo image.
- **Primary color** — Your church's brand color.

### Vacation responder

When you're away:

1. Go to **Settings** → **General**.
2. Turn on **Vacation responder**.
3. Set start/end dates, subject, and message.
4. Click **Save Changes**.

The system auto-replies to incoming messages (once per sender every 4 days).

---

## Delegate Access

Let someone else manage your inbox:

1. Go to **Settings** → **Accounts and Import**.
2. Under **Grant access to your account**, click **Add another account**.
3. Enter the delegate's email and choose permissions:
   - **Can read** — They can view your inbox.
   - **Can send as** — They can send emails on your behalf.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate up/down in message list |
| `e` | Archive selected message |
| `#` | Delete selected message |
| `/` | Focus search bar |
| `c` | Open compose window |

---

## Tips

- **Conversation view**: Toggle in Settings → General to group replies together.
- **Custom folders**: Use the **+** button in the sidebar to create folders for organizing mail.
- **Filters**: Set up auto-sorting rules in Settings → Filters.
- **Templates**: Create reusable email templates in Settings → Templates.
- **Undo send**: Configure 5–30 second cancellation window in Settings → General.

---

## Need Help?

Contact your platform administrator (Super Admin) for:
- Account verification issues
- Domain verification problems
- Email address request approvals
- Storage upgrades
