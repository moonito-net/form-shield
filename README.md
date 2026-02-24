# Form Shield by Moonito

**Stop spam, fake leads, and invalid contacts before they reach your database.**

Form Shield is a lightweight JavaScript snippet that silently validates email and phone fields on your website forms in real time — using Moonito's validation engine — before allowing any form submission to go through.

No backend changes needed. No frameworks required. One `<script>` tag is all it takes.

---

## Features

| Feature | Description |
|---|---|
| **Block Disposable Emails** | Rejects temporary/throwaway email addresses (Mailinator, Guerrilla Mail, etc.) |
| **Block Role-Based Emails** | Blocks generic role addresses like `admin@`, `info@`, `support@` |
| **Require Business Email** | Allows only professional/corporate email domains (no Gmail, Yahoo, etc.) |
| **MX Record Verification** | Checks if the email's domain has valid mail server records |
| **SMTP Mailbox Verification** | Verifies the specific mailbox actually exists and can receive email |
| **Block Unreadable Usernames** | Rejects email addresses with random-looking, unreadable usernames |
| **Phone Format Validation** | Validates phone number format including country code and regional pattern |
| **Deep Phone Validation** | Verifies country code, number type (mobile, fixed-line, etc.) and correct regional format |
| **Block Duplicate Submissions** | Prevents the same email or phone from submitting multiple times within a configured window |
| **Rate Limiting** | Limits the number of submissions allowed per IP address |
| **Auto-Blacklist Abusive IPs** | Automatically adds IPs that repeatedly trigger violations to your IP blacklist |
| **Conflict-Safe** | All internal identifiers are prefixed (`_fshield_`) — zero risk of colliding with your existing CSS or JavaScript |
| **Framework Compatible** | Works alongside jQuery, React, Vue, and other frameworks that handle form submission via AJAX |
| **Fail Open** | If the Moonito API is unreachable or times out, the form submits normally — your users are never blocked by a network issue |

---

## Quick Install

Add the snippet just before the closing `</body>` tag on any page where you want protection:

```html
<script
  src="https://cdn.jsdelivr.net/gh/moonito-net/form-shield/form-shield.min.js"
  data-key="YOUR_PUBLIC_KEY">
</script>
```

Replace `YOUR_PUBLIC_KEY` with the public key from your [Moonito Form Shield dashboard](https://moonito.net).

---

## Configuration Attributes

| Attribute | Default | Description |
|---|---|---|
| `data-key` | *(required)* | Your Form Shield public key |
| `data-form-selector` | all forms | CSS selector(s) to target specific forms. Separate multiple with commas. |
| `data-email-field` | `email` | Name of the email input field. Separate multiple with commas — first match is used. |
| `data-phone-field` | `phone` | Name of the phone input field. Separate multiple with commas — first match is used. |

### Examples

**Target a specific form by ID:**
```html
<script
  src="https://cdn.jsdelivr.net/gh/moonito-net/form-shield/form-shield.min.js"
  data-key="YOUR_PUBLIC_KEY"
  data-form-selector="#contact-form">
</script>
```

**Custom field names:**
```html
<script
  src="https://cdn.jsdelivr.net/gh/moonito-net/form-shield/form-shield.min.js"
  data-key="YOUR_PUBLIC_KEY"
  data-email-field="user_email,email_address"
  data-phone-field="mobile,phone_number">
</script>
```

**Multiple form selectors:**
```html
<script
  src="https://cdn.jsdelivr.net/gh/moonito-net/form-shield/form-shield.min.js"
  data-key="YOUR_PUBLIC_KEY"
  data-form-selector="#signup-form, .contact-form, [data-protect]">
</script>
```

---

## How It Works

1. The script loads and attaches a capture-phase `submit` listener to the document.
2. When a form is submitted, Form Shield intercepts it, disables the submit button(s), and sends the email/phone data to the Moonito API.
3. If the API returns **pass** — the form submits normally (your existing handlers are called).
4. If the API returns **fail** — inline error messages appear below the relevant fields and the form stays open.
5. If the API is unreachable or times out (15s) — the form submits normally (fail-open design).

---

## Validation Rules

Validation rules are configured per-domain in your [Moonito dashboard](https://moonito.net). Rules you can enable:

### Email Validation
- Block disposable email providers
- Block role-based addresses (`admin@`, `noreply@`, etc.)
- Require business/professional email domains
- Verify MX records exist for the domain
- Verify the specific mailbox via SMTP
- Block unreadable/random-looking usernames

### Phone Validation
- Basic format validation (country code, length, structure)
- Deep validation — verifies number type (mobile, fixed-line, VoIP) and regional correctness

### Duplicate & Spam Protection
- Block duplicate email/phone submissions (configurable window: 24h, 7 days, 30 days, or forever)
- Rate limit submissions per IP address
- Auto-blacklist IPs that repeatedly trigger violations (configurable threshold: 1–20 violations)

---

## Error Display

When validation fails, Form Shield injects an inline error message directly below the flagged input field. All styling is done via inline CSS — no class-based styles are injected — so there is zero risk of your stylesheet overriding the error appearance.

Error messages are removed automatically on the next submission attempt.

---

## Compatibility

- **Browsers:** All modern browsers (Chrome, Firefox, Safari, Edge). IE11 is not supported.
- **Frameworks:** Works with plain HTML, jQuery, React, Vue, Angular, and any other framework — Form Shield re-dispatches the submit event so your framework's handlers run normally after validation passes.
- **CSS frameworks:** Bootstrap, Tailwind, Bulma, and any other CSS framework — no class name conflicts.

---

## Files

| File | Description |
|---|---|
| `form-shield.js` | Full development version with comments |
| `form-shield.min.js` | Minified production version (use this in production) |

---

## Dashboard & Documentation

- **Moonito:** [https://moonito.net](https://moonito.net)
- **Sign up** to get your public key and configure your validation rules.

---

## License

MIT License — free to use on any website.
