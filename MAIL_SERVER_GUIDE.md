# Mail Server Setup Guide — Adventist Mail

This guide covers setting up a mail server so Adventist Mail can send and receive email using your own domain.

---

## Overview

Adventist Mail needs a mail server that provides:

- **SMTP** — For sending email (outgoing)
- **IMAP** — For reading email (incoming)

The app connects to this server using each user's credentials. You set the server host/port once in environment variables; all users share the same server.

---

## Option 1: Mail-in-a-Box (Recommended for simplicity)

[Mail-in-a-Box](https://mailinabox.email/) sets up a complete mail server on a single Ubuntu VPS.

### Requirements

- Ubuntu 22.04 VPS (2GB RAM, 20GB disk minimum)
- A domain name (e.g. `adventistmail.org`)
- A static IP address

### Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Run the installer
curl -s https://mailinabox.email/setup.sh | sudo bash
```

Follow the prompts:
1. Enter your email domain (e.g. `adventistmail.org`)
2. Set admin email (e.g. `admin@adventistmail.org`)
3. Set admin password

### DNS records

Mail-in-a-Box tells you exactly which DNS records to add. Typically:

| Record | Name | Value |
|--------|------|-------|
| A | `box.adventistmail.org` | Your server IP |
| MX | `adventistmail.org` | `box.adventistmail.org` |
| TXT (SPF) | `adventistmail.org` | `v=spf1 mx -all` |
| TXT (DKIM) | `mail._domainkey.adventistmail.org` | (provided by installer) |
| TXT (DMARC) | `_dmarc.adventistmail.org` | `v=DMARC1; p=quarantine` |

### Configure Adventist Mail

Set these environment variables on your backend:

```
SMTP_HOST=box.adventistmail.org
SMTP_PORT=587
SMTP_SECURE=false
ZIMBRA_IMAP_HOST=box.adventistmail.org
ZIMBRA_IMAP_PORT=993
ZIMBRA_IMAP_SECURE=true
```

### Create accounts

Use the Mail-in-a-Box admin panel at `https://box.adventistmail.org/admin` to create email accounts. Each account can then log in to Adventist Mail.

---

## Option 2: iRedMail (More control)

[iRedMail](https://www.iredmail.org/) is an open-source mail server solution with more configuration options.

### Requirements

- Ubuntu/Debian/CentOS VPS (2GB+ RAM)
- A domain name
- Clean server (no other mail software installed)

### Setup

```bash
# Download iRedMail
wget https://github.com/iredmail/iRedMail/archive/refs/tags/1.7.1.tar.gz
tar xzf 1.7.1.tar.gz
cd iRedMail-1.7.1

# Run installer
bash iRedMail.sh
```

Follow prompts to configure:
- Mail storage path
- Web server (Nginx recommended)
- Database (PostgreSQL recommended)
- Domain name
- Admin password

### DNS records

Same pattern as Mail-in-a-Box: MX, SPF, DKIM, DMARC records pointing to your server.

### Configure Adventist Mail

```
SMTP_HOST=mail.adventistmail.org
SMTP_PORT=587
SMTP_SECURE=false
ZIMBRA_IMAP_HOST=mail.adventistmail.org
ZIMBRA_IMAP_PORT=993
ZIMBRA_IMAP_SECURE=true
```

---

## Option 3: Zimbra (Enterprise)

[Zimbra](https://www.zimbra.com/) is what the app was originally designed for.

### Setup

Follow Zimbra's official installation guide for your OS. Zimbra includes LDAP, IMAP, SMTP, and a web admin console.

### Configure Adventist Mail

```
ZIMBRA_LDAP_URL=ldaps://mail.adventistmail.org:636
ZIMBRA_LDAP_BASE_DN=dc=adventistmail,dc=org
ZIMBRA_IMAP_HOST=mail.adventistmail.org
ZIMBRA_IMAP_PORT=993
ZIMBRA_IMAP_SECURE=true
SMTP_HOST=mail.adventistmail.org
SMTP_PORT=587
SMTP_SECURE=false
```

---

## Option 4: Postfix + Dovecot (Manual)

For full control, install Postfix (SMTP) and Dovecot (IMAP) separately.

### Install

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postfix dovecot-imapd dovecot-lmtpd certbot
```

### Key configuration files

| File | Purpose |
|------|---------|
| `/etc/postfix/main.cf` | SMTP server config |
| `/etc/dovecot/dovecot.conf` | IMAP server config |
| `/etc/dovecot/conf.d/10-mail.conf` | Mailbox location |
| `/etc/dovecot/conf.d/10-auth.conf` | Authentication |
| `/etc/dovecot/conf.d/10-ssl.conf` | TLS certificates |

### Essential Postfix settings

```
# /etc/postfix/main.cf
myhostname = mail.adventistmail.org
mydomain = adventistmail.org
myorigin = $mydomain
inet_interfaces = all
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.adventistmail.org/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mail.adventistmail.org/privkey.pem
smtpd_use_tls = yes
smtpd_sasl_auth_enable = yes
```

### Configure Adventist Mail

```
SMTP_HOST=mail.adventistmail.org
SMTP_PORT=587
SMTP_SECURE=false
ZIMBRA_IMAP_HOST=mail.adventistmail.org
ZIMBRA_IMAP_PORT=993
ZIMBRA_IMAP_SECURE=true
```

---

## DNS Records (All Options)

Regardless of which server you choose, you need these DNS records for your domain:

### Required

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | `mail.yourdomain.org` | Server IP | Points to mail server |
| MX | `yourdomain.org` | `mail.yourdomain.org` (priority 10) | Routes incoming mail |

### Recommended (deliverability)

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | `yourdomain.org` | `v=spf1 mx -all` | SPF: authorize your server to send |
| TXT | `mail._domainkey.yourdomain.org` | (generated by server) | DKIM: email signing |
| TXT | `_dmarc.yourdomain.org` | `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.org` | DMARC: policy |

### Reverse DNS (PTR)

Ask your VPS provider to set the PTR record for your IP to `mail.yourdomain.org`. This is critical for deliverability.

---

## SSL/TLS Certificates

Use Let's Encrypt for free certificates:

```bash
sudo certbot certonly --standalone -d mail.yourdomain.org
```

Auto-renew:

```bash
sudo crontab -e
# Add:
0 3 * * * certbot renew --quiet && systemctl reload postfix dovecot
```

---

## Auto-provisioning

When `MAIL_PROVISIONING_MODE` is set:

| Mode | Behavior |
|------|----------|
| `manual` (default) | Admin creates accounts on the mail server manually |
| `api` | Adventist Mail calls your webhook to create accounts automatically |
| `zimbra` | Placeholder for Zimbra admin API (future) |

For `api` mode, set `PROVISIONING_WEBHOOK_URL` to a script on your mail server that accepts:

```json
POST /provision
{
  "action": "create",
  "email": "pastor@church.org",
  "password": "generated-password"
}
```

Your script should create the mailbox on the server and return `200 OK`.

---

## Hosting Recommendations

| Provider | Monthly cost | Notes |
|----------|-------------|-------|
| **Hetzner** | ~$5–10 | Good for Europe/US, reliable |
| **DigitalOcean** | ~$6–12 | Easy to set up, good docs |
| **Vultr** | ~$5–10 | Global locations |
| **Linode (Akamai)** | ~$5–12 | Solid reputation |
| **OVH** | ~$4–8 | Budget option, EU-based |

For 1000+ churches, start with a 4GB RAM / 80GB disk VPS and scale as needed.

---

## Security Checklist

- [ ] SSL/TLS certificates installed and auto-renewing
- [ ] SPF, DKIM, DMARC DNS records configured
- [ ] Reverse DNS (PTR) set up with VPS provider
- [ ] Firewall: only ports 25, 143, 465, 587, 993 open for mail
- [ ] Fail2ban installed to block brute-force attempts
- [ ] Regular backups of mail storage and database
- [ ] Monitoring for disk space and service health

---

## Testing

After setup, verify:

1. **SMTP**: `openssl s_client -connect mail.yourdomain.org:587 -starttls smtp`
2. **IMAP**: `openssl s_client -connect mail.yourdomain.org:993`
3. **Send test**: Create an account, log in to Adventist Mail, send an email to a Gmail address
4. **Receive test**: Send from Gmail to your new address, check it appears in Adventist Mail
5. **Deliverability**: Check [mail-tester.com](https://www.mail-tester.com/) for your spam score
