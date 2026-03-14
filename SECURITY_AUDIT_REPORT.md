# Security Audit Report - World Cup 2026 Application
**Date:** March 13, 2026  
**Reviewer:** Security Operations Engineer  
**Project:** World Cup 2026 Tournament Website

---

## Executive Summary
This report details a comprehensive security assessment of the World Cup 2026 web application. The application has **8 HIGH severity risks**, **8 MEDIUM severity risks**, and **5 LOW severity risks** that require immediate and near-term remediation.

**Critical Finding:** Multiple security breaches expose authentication credentials, sensitive user data, and payment information to unauthorized access.

---

## 1. HIGH SEVERITY RISKS

### 1.1 Exposed API Keys and Credentials in Git Repository
**Severity:** 🔴 **CRITICAL**  
**Status:** Active / Unfixed  
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Description:**
Multiple credential files containing sensitive authentication information are committed to the Git repository:
- `client_secret_*.apps.googleusercontent.com.json` - Google OAuth2 client secret
- `credentials.json` - Contains Firebase service account, OAuth2 refresh tokens, encryption keys
- `world-cup-2026-b1fda-540ccd7e2320.json` - Firebase service account credentials

**Affected Files:**
- [client_secret_355932893733-ef0je4oeeekvq15h5feh6flm443a8gno.apps.googleusercontent.com.json](client_secret_355932893733-ef0je4oeeekvq15h5feh6flm443a8gno.apps.googleusercontent.com.json)
- [credentials.json](credentials.json)
- [world-cup-2026-b1fda-540ccd7e2320.json](world-cup-2026-b1fda-540ccd7e2320.json)

**Impact:**
- **Attacker can:** Use service account to access Firebase database, impersonate users, send emails on behalf of the application, access Google APIs, decrypt encrypted team assignments
- **Damage:** Complete compromise of backend infrastructure and user data

**Remediation:**
1. Immediately revoke all exposed credentials:
   - Regenerate Firebase service account keys
   - Regenerate Google OAuth2 client secret
   - Rotate all API keys and refresh tokens
   - Regenerate encryption keys
2. Remove files from Git history using `git filter-branch` or `bfg-repo-cleaner`
3. Implement environment variable management:
   ```javascript
   // Use environment variables instead
   const credentials = {
     serviceAccount: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
     web: JSON.parse(process.env.GOOGLE_OAUTH2_CONFIG),
     encryptionKey: process.env.ENCRYPTION_KEY,
     allowedOrigins: process.env.ALLOWED_ORIGINS.split(',')
   };
   ```
4. Update `.gitignore` with specific patterns:
   ```
   credentials.json
   world-cup-2026-*.json
   client_secret_*.json
   .env
   .env.local
   ```

**Proof of Concept:**
Any user with access to the repository can directly read the credentials and authenticate as the Firebase service account.

---

### 1.2 Insecure Client-Side Session Storage - Sensitive Data in Plain Text Cookies
**Severity:** 🔴 **CRITICAL**  
**Status:** Active / Unfixed  
**CWE:** CWE-614 (Sensitive Cookie in HTTPS Session Without 'Secure' Attribute)

**Description:**
User authentication data and sensitive team assignments are stored in plain text cookies without `HttpOnly` or `Secure` flags:

**Affected Code:** [docs/scripts/utils/user-utils.js](docs/scripts/utils/user-utils.js#L20-L40)

```javascript
// VULNERABLE CODE
export function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

// Stores sensitive data
setCookie("userDetails", JSON.stringify({
    firstName, lastName, email,
    hasPaid: "Pending",  // Could be modified
    assignedTeam: "Pending"  // Could be modified
}), 7);
```

**Vulnerabilities:**
1. **Stored in Plain Text:** Any JavaScript code can access via `document.cookie`
2. **Missing HttpOnly:** Vulnerable to XSS attacks
3. **Missing Secure:** Transmitted over unencrypted HTTP (if used)
4. **No SameSite:** Vulnerable to CSRF attacks
5. **Client-Side Control:** Users can modify cookies directly

**Impact:**
- XSS attacks can steal authentication tokens
- Users can modify their own team assignment
- Users can change payment status from "Pending" to "true"
- Session cookies exposed via MITM attacks
- CSRF attacks possible

**Example Attack:**
```javascript
// In attacker's injected script
document.cookie = "userDetails=" + JSON.stringify({
    firstName: "John", lastName: "Attacker",
    email: "attacker@example.com",
    hasPaid: true,
    assignedTeam: "Brazil"  // Claims winning team
});
```

**Remediation:**
1. Implement server-side session management
2. Store sessions in secure, HttpOnly cookies:
   ```javascript
   // Server-side (express)
   res.cookie('sessionId', sessionToken, {
     httpOnly: true,
     secure: true,  // HTTPS only
     sameSite: 'strict',
     maxAge: 7 * 24 * 60 * 60 * 1000
   });
   ```
3. Never store sensitive user data on client
4. Validate all user actions server-side
5. Implement CSRF token validation

---

### 1.3 Client-Side Authorization Bypass - Cookie Manipulation
**Severity:** 🔴 **CRITICAL**  
**Status:** Active / Unfixed  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-285 (Improper Authorization)

**Description:**
Critical business logic relies on client-side cookies without server-side verification. Users can:
1. Modify payment status to gain unauthorized access
2. Override team assignments to claim winning teams
3. Impersonate other users

**Affected Code:** [docs/scripts/utils/user-utils.js](docs/scripts/utils/user-utils.js#L75-L110)

```javascript
// VULNERABLE: Trusts client-side cookie completely
const userDetailsCookie = getCookie("userDetails");
if (userDetailsCookie) {
    const userDetails = JSON.parse(userDetailsCookie);
    
    if (userDetails.hasPaid === true) {  // NO SERVER VERIFICATION!
        navigationDropdown.classList.remove("hidden");
        contentPlaceholder.innerHTML = `
            <p>You've drawn <strong>${userDetails.assignedTeam}</strong></p>
        `;
    }
}
```

**Impact - Test Case:**
```javascript
// Attacker opens browser console
document.cookie = "userDetails=" + JSON.stringify({
    firstName: "Attacker", lastName: "User",
    email: "attacker@example.com",
    hasPaid: true,
    assignedTeam: "France"  // ANY TEAM
});
// User now sees themselves as having paid and owning France
```

**Business Impact:**
- Attacker can claim prize pot winnings for non-paying users
- Revenue loss from unpaid users gaining access
- Integrity of tournament compromised

**Remediation:**
1. Remove server-side verification requirement:
   ```javascript
   // Server endpoint to check user status
   app.post('/api/user/status', verifySessionToken, async (req, res) => {
     const userDoc = await firestore.collection('users').doc(req.user.email).get();
     res.json({
       hasPaid: userDoc.data().hasPaid,
       assignedTeam: userDoc.data().team
     });
   });
   ```
2. Call verification endpoint for every sensitive operation
3. Never trust client-side state for authentication
4. Implement proper session tokens (JWT with signature verification)

---

### 1.4 Weak Verification Code Generation - Using Math.random()
**Severity:** 🔴 **CRITICAL**  
**Status:** Active / Unfixed  
**CWE:** CWE-338 (Use of Cryptographically Weak Pseudo-Random Number Generator)

**Description:**
Six-digit verification codes are generated using JavaScript's `Math.random()`, which is not cryptographically secure:

**Affected Code:** [functions/index.js](functions/index.js#L200-L220)

```javascript
// VULNERABLE: Uses predictable PRNG
const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
```

**Problems:**
1. **Predictable:** Math.random() is seeded with limited entropy
2. **Brute Force:** Only 900,000 possible values (6 digits)
3. **Low Entropy:** Can be guessed or brute-forced in seconds
4. **Timing Attacks:** Generation timing can leak information

**Attack Scenario:**
```bash
# Attacker can brute force 900k codes in minutes
for i in {100000..999999}; do
  curl -X POST https://api/verifyLoginCode \
    -d "email=victim@example.com&verificationCode=$(printf '%06d' $i)"
done
```

**No Rate Limiting:** Combined with lack of rate limiting (see 1.5), codes can be brute-forced instantly.

**Remediation:**
```javascript
// SECURE: Use cryptographically secure method
import crypto from 'crypto';

function generateVerificationCode() {
  const buffer = crypto.randomBytes(4);
  const code = (buffer.readUInt32BE(0) % 900000) + 100000;
  return code.toString().padStart(6, '0');
}

// Or use a library
import speakeasy from 'speakeasy';
const code = speakeasy.totp({
  secret: userSecret,
  encoding: 'base32',
  digits: 6
});
```

---

### 1.5 No Rate Limiting on Authentication Endpoints
**Severity:** 🔴 **CRITICAL**  
**Status:** Active / Unfixed  
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

**Description:**
Email sending and verification code endpoints have no rate limiting, enabling:
1. **Verification Code Brute Force:** 900k codes, no throttling = instant bypass
2. **Email Bombing:** Send unlimited emails to any address
3. **DoS Attacks:** Exhaust email sending quota and database resources

**Affected Endpoints:**
- `requestLoginCode` - [functions/index.js](functions/index.js#L200)
- `verifyLoginCode` - [functions/index.js](functions/index.js#L374)
- `sendEmail` - [functions/index.js](functions/index.js#L150)

**Attack Proof of Concept:**
```bash
# Brute force verification code in seconds
parallel -j 100 'curl -X POST https://api/verifyLoginCode \
  -d "email=victim@example.com&verificationCode={}"' \
  ::: {100000..999999}
```

**Impact:**
- Account takeover
- Email account compromise (attacker receives notification of password change)
- Service disruption
- Firebase quota exhaustion

**Remediation:**
1. Implement rate limiting using Firebase rules or middleware:
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const verificationLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 attempts per window
     keyGenerator: (req, res) => req.body.email,
     standardHeaders: true,
     legacyHeaders: false,
   });
   
   export const verifyLoginCode = onRequest(
     verificationLimiter,
     (req, res) => {
       // ... existing code
     }
   );
   ```

2. Implement per-IP rate limiting
3. Add exponential backoff
4. Monitor for brute force attempts
5. Consider implementing CAPTCHA for repeated failures

---

### 1.6 Information Disclosure - Error Messages Reveal User Existence
**Severity:** 🔴 **HIGH**  
**Status:** Active / Unfixed  
**CWE:** CWE-209 (Information Exposure Through an Error Message)

**Description:**
Detailed error messages allow attackers to enumerate valid email addresses:

**Affected Code:** [functions/index.js](functions/index.js#L195-L220)

```javascript
// VULNERABLE: Reveals if user exists
if (snapshot.empty) {
    alert("No user found with this email. Please register first.");  // ← Reveals non-existence
}

// In backend:
if (!userDoc.exists) {
    return res.status(404).send("User not found");  // ← 404 = doesn't exist
}
```

**Information Leakage Chain:**
```
Attacker can determine:
1. If email is registered
2. If user has paid
3. If verification code was sent
4. System architecture details
```

**Example Enumeration:**
```javascript
const emails = ['alice@example.com', 'bob@example.com', ...];
for (let email of emails) {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({email})
  });
  if (response.status === 404) {
    console.log(email, 'not registered');
  } else {
    console.log(email, 'IS registered');  // Email enumeration!
  }
}
```

**Remediation:**
1. Use generic error messages:
   ```javascript
   // SECURE: Generic response regardless of outcome
   return res.status(200).json({
     message: "If this email is registered, a code has been sent."
   });
   ```

2. Log actual errors server-side only:
   ```javascript
   if (!userDoc.exists) {
     logger.warn(`Login attempt for unregistered email: ${email}`);
     // Return generic success response
     return res.status(200).json({message: "Code sent if registered"});
   }
   ```

3. Monitor for enumeration patterns

---

### 1.7 Insecure Encryption Key Management
**Severity:** 🔴 **HIGH**  
**Status:** Active / Unfixed  
**CWE:** CWE-321 (Use of Hard-Coded Cryptographic Key)

**Description:**
Encryption keys for team data are stored in committed credentials files:

**Affected Code:** [functions/index.js](functions/index.js#L13-L15)

```javascript
// VULNERABLE: Key in credentials file (already committed)
const ENCRYPTION_KEY = credentials.encryptionKey || 
                       process.env.TEAM_ENCRYPTION_KEY || 
                       crypto.randomBytes(32).toString('hex');
```

**Problems:**
1. If `credentials.encryptionKey` exists, it's in the committed file
2. Algorithm is weak (AES-256-CBC without authenticated encryption)
3. IV not used securely
4. No key rotation mechanism
5. Encryption provides little value since key is exposed

**Impact:**
- Attackers can decrypt all team assignments with exposed key
- No secrecy of team data
- Cannot verify integrity (no HMAC)

**Remediation:**
1. Use environment variables ONLY:
   ```javascript
   if (!process.env.TEAM_ENCRYPTION_KEY) {
     throw new Error('TEAM_ENCRYPTION_KEY not set');
   }
   const ENCRYPTION_KEY = process.env.TEAM_ENCRYPTION_KEY;
   ```

2. Use authenticated encryption:
   ```javascript
   import crypto from 'crypto';
   
   function encryptTeamName(teamName, key) {
     const salt = crypto.randomBytes(16);
     const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
     
     const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, 
                                          crypto.randomBytes(12));
     let encrypted = cipher.update(teamName, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     const authTag = cipher.getAuthTag();
     
     return salt.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
   }
   ```

3. Implement key rotation
4. Use Firebase's native encryption at rest

---

### 1.8 Unprotected Decryption Endpoint - No Authentication Required
**Severity:** 🔴 **HIGH**  
**Status:** Active / Unfixed  
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Description:**
The decryption endpoint requires no authentication, allowing anyone to decrypt team data:

**Affected Code:** [functions/index.js](functions/index.js#L645-L675)

```javascript
export const decryptTeam = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // ↓ Only checks origin, NOT user authentication
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden');
    }
    
    // ↓ Any authenticated user (or attacker) can decrypt any team
    const { encryptedTeam } = req.body;
    const decrypted = decryptTeamName(encryptedTeam);
    res.status(200).json({ teamName: decrypted });
  });
});
```

**Attack Scenario:**
```javascript
// Attacker retrieves all encrypted teams from Firestore
const teamsSnapshot = await db.collection('users').get();
const encryptedTeams = teamsSnapshot.docs.map(doc => doc.data().team);

// Decrypt all without authentication
for (let encrypted of encryptedTeams) {
  const response = await fetch('https://api/decryptTeam', {
    method: 'POST',
    body: JSON.stringify({ encryptedTeam: encrypted })
  });
  const { teamName } = await response.json();
  console.log('Decrypted:', teamName);  // All teams revealed
}
```

**Impact:**
- Defeats purpose of encrypting team assignments
- Reveals tournament bracket strategy
- Compromises prize pot integrity

**Remediation:**
1. Require authentication:
   ```javascript
   export const decryptTeam = onRequest((req, res) => {
     corsHandler(req, res, async () => {
       // Verify user authentication
       const authHeader = req.headers.authorization;
       if (!authHeader?.startsWith('Bearer ')) {
         return res.status(401).send('Unauthorized');
       }
       
       const idToken = authHeader.split('Bearer ')[1];
       const decodedToken = await admin.auth().verifyIdToken(idToken);
       
       // Only allow decrypting user's own team
       if (decodedToken.uid !== req.body.userId) {
         return res.status(403).send('Forbidden');
       }
       
       // ... proceed with decryption
     });
   });
   ```

---

## 2. MEDIUM SEVERITY RISKS

### 2.1 Cross-Site Scripting (XSS) Vulnerabilities
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)

**Description:**
Multiple locations use `innerHTML` with template literals containing user data or unsanitized content:

**Affected Code:**
- [docs/scripts/admin.js](docs/scripts/admin.js#L40)
- [docs/scripts/utils/user-utils.js](docs/scripts/utils/user-utils.js#L106-L107)
- [docs/scripts/src/group-stage.js](docs/scripts/src/group-stage.js#L41)

```javascript
// VULNERABLE: User data in innerHTML
contentPlaceholder.innerHTML = `
    <p>Welcome, ${userDetails.firstName} ${userDetails.lastName}!</p>
    <p>You've drawn <strong>${userDetails.assignedTeam}</strong></p>
`;

// If firstName contains: <img src=x onerror="alert('XSS')">
// Then XSS executes when rendered
```

**Vulnerable Patterns:**
```javascript
innerHTML = `<html>${userInput}</html>`           // ✗ VULNERABLE
innerHTML += htmlWithUserData                     // ✗ VULNERABLE
insertAdjacentHTML('..', `${userData}`)          // ✗ VULNERABLE
```

**Impact:**
- Session token theft via script injection
- Malware distribution
- Keylogging and data exfiltration
- Phishing attacks
- Account takeover

**Remediation:**
1. Use `textContent` for user data:
   ```javascript
   // SECURE
   const welcomeMsg = document.createElement('p');
   welcomeMsg.textContent = `Welcome, ${userDetails.firstName}!`;
   container.appendChild(welcomeMsg);
   ```

2. Use a templating library with auto-escaping:
   ```javascript
   import DOMPurify from 'dompurify';
   
   container.innerHTML = DOMPurify.sanitize(`
     <p>Welcome, ${DOMPurify.sanitize(userDetails.firstName)}!</p>
   `);
   ```

3. Implement Content-Security-Policy header:
   ```
   Content-Security-Policy: 
     default-src 'self'; 
     script-src 'self'; 
     style-src 'self' 'unsafe-inline';
     img-src 'self' data: https:;
   ```

---

### 2.2 No Content-Security-Policy Headers
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-693 (Protection Mechanism Failure)

**Description:**
Missing security headers leave application vulnerable to XSS, clickjacking, and other injection attacks.

**Current State:** No CSP header detected in responses.

**Remediation:**
Add to [firebase.json](firebase.json) hosting configuration:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://us-central1-world-cup-2026-b1fda.cloudfunctions.net"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=63072000; includeSubDomains"
          }
        ]
      }
    ]
  }
}
```

---

### 2.3 No Input Validation on Email Endpoints
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-20 (Improper Input Validation)

**Description:**
Email endpoints don't validate email format, allowing malformed requests:

**Affected Code:** [functions/index.js](functions/index.js#L200-L210)

```javascript
// VULNERABLE: No email validation
const { type, recipient, email, newEmail, verificationCode } = req.body;

if (!email) {
  return res.status(400).send("Missing required field: email");
}
// Missing: Email format validation
```

**Attack Examples:**
```javascript
// Can send to malformed addresses
{ email: "<script>alert('xss')</script>" }
{ email: "a".repeat(10000) }  // DOS via email processing
{ newEmail: "../../etc/passwd" }  // Path traversal attempt
```

**Remediation:**
```javascript
import validator from 'email-validator';

const { email } = req.body;

// Validate email format
if (!email || !validator.validate(email)) {
  return res.status(400).send("Invalid email format");
}

// Validate length
if (email.length > 254) {
  return res.status(400).send("Email too long");
}

// Normalize
const normalizedEmail = email.toLowerCase().trim();
if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalizedEmail)) {
  return res.status(400).send("Invalid email format");
}
```

---

### 2.4 Weak Admin Authentication
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-521 (Weak Password Requirements)

**Description:**
Admin login has no password requirements or brute force protection:

**Affected Code:** [docs/scripts/admin.js](docs/scripts/admin.js#L50-L60)

```javascript
// No validation of password strength
auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
        assignAdminRole(userCredential.user.uid);
    })
```

**Problems:**
1. No minimum password length requirement
2. No character complexity requirements
3. No account lockout after failed attempts
4. Firebase Auth allows weak passwords by default

**Remediation:**
```javascript
// On user creation
auth.createUserWithEmailAndPassword(email, password)
  .then(userCredential => {
    // Validate password strength
    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      throw new Error('Password must contain special character');
    }
  });

// Enable account lockout in Firebase Console
// Settings → Users → Account Lockout
```

---

### 2.5 Email Enumeration Attack
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-203 (Observable Discrepancy)

**Description:**
Attackers can determine if an email is registered through timing differences or response codes.

**Vulnerable Endpoints:**
- Registration endpoint (tells if email exists)
- Login endpoint (404 for non-existent users)

**Attack:**
```python
import requests
import threading

emails = ['user1@example.com', 'user2@example.com', ...]
registered = []

def check_email(email):
    response = requests.post('https://api/register', 
                            json={'email': email, 'firstName': 'Test', 'lastName': 'User'})
    if response.status_code == 409:  # Email already registered
        registered.append(email)

threads = [threading.Thread(target=check_email, args=(e,)) for e in emails]
for t in threads: t.start()
for t in threads: t.join()

print("Registered emails:", registered)
```

**Remediation:**
- Use generic responses (already mentioned in 1.6)
- Implement CAPTCHA to prevent automation
- Monitor for pattern-based enumeration

---

### 2.6 Missing Audit Logging for Sensitive Operations
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-778 (Insufficient Logging)

**Description:**
No audit logs for:
- User registration
- Payment status changes
- Team assignment modifications
- Admin actions
- Failed authentication attempts

**Impact:**
- Cannot detect unauthorized access
- No forensic evidence after breach
- Compliance violations (GDPR, payment PCI-DSS)
- Cannot identify compromised accounts

**Remediation:**
```javascript
import admin from 'firebase-admin';

async function logAuditEvent(action, userId, details) {
  await admin.firestore().collection('audit_logs').add({
    action,
    userId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
}

// Usage:
await logAuditEvent('USER_REGISTERED', email, {
  firstName, lastName, team: selectedTeam.id
});

await logAuditEvent('PAYMENT_VERIFIED', email, {
  previousStatus: 'Pending',
  newStatus: 'Verified'
});
```

---

### 2.7 Inadequate CORS Configuration
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-346 (Origin Validation Error)

**Description:**
CORS validation relies on string array checking without robust validation:

```javascript
// VULNERABLE: Simple array includes check
const allowedOrigins = credentials.allowedOrigins.origin;
if (allowedOrigins.includes(origin)) {
  return callback(null, true);
}
```

**Problems:**
1. Whitelist stored in credentials file (already exposed)
2. No validation of origin header format
3. Subdomain matching not enforced (e.g., `evil.example.com` if `example.com` allowed)

**Attack Scenario:**
```javascript
// If allowedOrigins includes 'example.com'
fetch('https://api/endpoint', {
  headers: { Origin: 'www.example.com.attacker.com' }  // Might bypass
})
```

**Remediation:**
```javascript
import url from 'url';

function validateOrigin(origin, allowedList) {
  try {
    const originUrl = new url.URL(origin);
    
    // Allow only exact matches or subdomains of allowed origins
    for (let allowed of allowedList) {
      const allowedUrl = new url.URL(allowed);
      
      if (originUrl.hostname === allowedUrl.hostname ||
          originUrl.hostname.endsWith('.' + allowedUrl.hostname)) {
        if (originUrl.protocol === allowedUrl.protocol) {
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    return false;  // Malformed origin header
  }
}

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || validateOrigin(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
```

---

### 2.8 Outdated Dependencies with Known Vulnerabilities
**Severity:** 🟠 **MEDIUM**  
**Status:** Active / Unfixed  
**CWE:** CWE-1104 (Use of Unmaintained Third Party Components)

**Description:**
Dependencies may have known vulnerabilities. Check [package.json](package.json):

```json
{
  "body-parser": "^1.20.2",
  "cors": "^2.8.5",
  "express": "^5.1.0",  // Major version 5, check for breaking changes
  "firebase-admin": "^13.6.0",
  "nodemailer": "^6.10.1"
}
```

**Remediation:**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies safely
npm update

# Review breaking changes before major version updates
npm show express versions

# Use lock files
git commit package-lock.json
```

---

## 3. LOW SEVERITY RISKS

### 3.1 Overly Broad .gitignore Patterns
**Severity:** 🟡 **LOW**  
**Status:** Active / Unfixed

**Description:**
Current [.gitignore](.gitignore) entry `/*.json` and `/*.js` are too broad:

```
/*.json     # Ignores all root .json files
/*.js       # Ignores all root .js files
```

**Issues:**
- May accidentally exclude legitimate config files
- Not specific enough for actual secrets

**Remediation:**
```gitignore
# Credentials and secrets
credentials.json
world-cup-2026-*.json
client_secret_*.json
.env
.env.local
.env.*.local

# Dependencies
node_modules/
package-lock.json

# Build/runtime
build/
dist/
*.log
firebase-debug.log

# IDE
.idea/
.vscode/
*.swp
*.swo
```

---

### 3.2 Hardcoded Email Sender Address
**Severity:** 🟡 **LOW**  
**Status:** Active / Unfixed

**Description:**
Email sender is hardcoded in functions:

```javascript
`From: "Immediate World Cup 2026 Verification" <slowest.captain@gmail.com>`
```

**Issues:**
- Hardcoded email reveals code details
- Makes emails easy to spoof/phish
- Should use environment-configured email

**Remediation:**
```javascript
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@worldcup2026.app';
const SENDER_NAME = process.env.SENDER_NAME || 'World Cup 2026';

const rawEmail = [
  `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
  // ... rest of email
].join("\n");
```

---

### 3.3 Sensitive Information in Console Logs
**Severity:** 🟡 **LOW**  
**Status:** Active / Unfixed

**Description:**
Console logs may contain sensitive data in development:

**Affected Code:**
```javascript
console.log('Verification email sent to:', normalizedEmail);
console.error("Error verifying code:", error);  // Stack trace may leak keys
```

**Remediation:**
```javascript
// Only log non-sensitive identifiers in production
const emailHashForLogging = crypto.createHash('sha256')
  .update(normalizedEmail)
  .digest('hex');

logger.info('Verification email sent successfully', {
  emailHash: emailHashForLogging,
  timestamp: new Date().toISOString()
});

// Never log full error objects in production
if (process.env.NODE_ENV === 'production') {
  logger.error('Unexpected error', { code: error.code, message: 'Internal error' });
} else {
  console.error('Dev error:', error);
}
```

---

### 3.4 Missing Security Headers
**Severity:** 🟡 **LOW**  
**Status:** Partial (one header present)

**Description:**
Only `Permissions-Policy` header is set. Missing:
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing)
- Strict-Transport-Security (HSTS)
- Referrer-Policy

**Remediation:** See section 2.2

---

### 3.5 No HTTPS Enforcement in Code
**Severity:** 🟡 **LOW**  
**Status:** Likely handled by hosting

**Description:**
While Firebase Hosting provides HTTPS, code should enforce it:

**Remediation:**
```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Set HSTS header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 
    'max-age=63072000; includeSubDomains; preload');
  next();
});
```

---

## Summary Table

| # | Risk | Severity | Category | Status |
|---|------|----------|----------|--------|
| 1.1 | Exposed Credentials in Git | 🔴 CRITICAL | Secrets Management | Unfixed |
| 1.2 | Plain Text Cookies | 🔴 CRITICAL | Session Management | Unfixed |
| 1.3 | Authorization Bypass | 🔴 CRITICAL | Authentication | Unfixed |
| 1.4 | Weak Verification Codes | 🔴 CRITICAL | Cryptography | Unfixed |
| 1.5 | No Rate Limiting | 🔴 CRITICAL | API Security | Unfixed |
| 1.6 | Info Disclosure | 🔴 HIGH | Error Handling | Unfixed |
| 1.7 | Key Management | 🔴 HIGH | Cryptography | Unfixed |
| 1.8 | Unauth Decrypt Endpoint | 🔴 HIGH | Authentication | Unfixed |
| 2.1 | XSS Vulnerabilities | 🟠 MEDIUM | Injection | Unfixed |
| 2.2 | No CSP Headers | 🟠 MEDIUM | HTTP Headers | Unfixed |
| 2.3 | No Input Validation | 🟠 MEDIUM | Input Validation | Unfixed |
| 2.4 | Weak Admin Auth | 🟠 MEDIUM | Authentication | Unfixed |
| 2.5 | Email Enumeration | 🟠 MEDIUM | Information Disclosure | Unfixed |
| 2.6 | No Audit Logging | 🟠 MEDIUM | Logging/Monitoring | Unfixed |
| 2.7 | Inadequate CORS | 🟠 MEDIUM | API Security | Unfixed |
| 2.8 | Outdated Dependencies | 🟠 MEDIUM | Dependency Management | Unfixed |
| 3.1 | Broad .gitignore | 🟡 LOW | Configuration | Unfixed |
| 3.2 | Hardcoded Email | 🟡 LOW | Configuration | Unfixed |
| 3.3 | Sensitive Logs | 🟡 LOW | Logging | Unfixed |
| 3.4 | Missing Headers | 🟡 LOW | HTTP Headers | Unfixed |
| 3.5 | No HTTPS Enforce | 🟡 LOW | Transport Security | Unfixed |

---

## Recommended Remediation Timeline

### Immediate (0-2 weeks)
1. ✅ Revoke all exposed credentials
2. ✅ Remove credential files from Git history
3. ✅ Implement rate limiting on all endpoints
4. ✅ Add server-side session management
5. ✅ Add audit logging

### Short-term (2-4 weeks)
6. ✅ Fix XSS vulnerabilities
7. ✅ Implement proper CORS validation
8. ✅ Add input validation
9. ✅ Implement CSP headers
10. ✅ Move secrets to environment variables

### Medium-term (1-2 months)
11. ✅ Update all dependencies
12. ✅ Implement encryption keyrotation
13. ✅ Add password complexity requirements
14. ✅ Perform security testing (SAST/DAST)

### Ongoing
15. ✅ Regular security audits
16. ✅ Dependency vulnerability scanning
17. ✅ Incident response plan
18. ✅ Security training for development team

---

## Conclusion

This application has **critical security vulnerabilities** that could lead to:
- **Complete database compromise** (exposed service account keys)
- **User account takeover** (weak authentication, cookie manipulation)
- **Fraud** (users claiming non-owned prizes)
- **Data breach** (unencrypted sensitive data, XSS)

**Immediate action required** before this application handles real payments and user data.

---

**Report Generated:** March 13, 2026  
**Classification:** Internal Use - Confidential
