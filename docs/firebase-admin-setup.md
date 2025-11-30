# Firebase Admin SDK Setup

The NexBoard API requires Firebase Admin SDK credentials to access Firestore from server-side API routes.

## Quick Setup

### Step 1: Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** in the confirmation dialog
7. A JSON file will be downloaded (e.g., `nexboard-full-scale-firebase-adminsdk-xxxxx.json`)

### Step 2: Extract Credentials

Open the downloaded JSON file and find these values:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
}
```

### Step 3: Add to .env.local

Add these lines to `nexboard/.env.local`:

```bash
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA...YOUR_ACTUAL_KEY_HERE...==\n-----END PRIVATE KEY-----\n"
```

**Important:**
- Keep the `\n` characters in the private key - don't replace them with actual newlines
- Use double quotes around both values
- Never commit this file to git (.env.local is in .gitignore)

### Step 4: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

## Security Best Practices

### DO:
✅ Keep service account keys secure
✅ Add `.env.local` to `.gitignore` (already done)
✅ Use different service accounts for development and production
✅ Rotate keys periodically (every 90 days)

### DON'T:
❌ Commit service account keys to version control
❌ Share keys in chat/email
❌ Use production keys in development
❌ Expose keys in client-side code

## Verifying Setup

After adding the credentials and restarting the server:

1. Go to `http://localhost:3001/test-api.html`
2. Enter your API token and Project ID
3. Click "Test Connection"
4. You should see: `✅ Connection successful!`

If you still get errors, check the terminal where `npm run dev` is running for detailed error messages.

## Alternative: Using Emulator (Development Only)

For local development without production credentials:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Start emulator:
   ```bash
   firebase emulators:start
   ```

3. Update `.env.local` to point to emulator:
   ```bash
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
   # Remove or comment out FIREBASE_ADMIN_* variables
   ```

**Note:** Emulator data is separate from production - you'll need to recreate projects/tasks.

## Troubleshooting

### "Firebase Admin credentials not configured"

This warning appears when `FIREBASE_ADMIN_CLIENT_EMAIL` or `FIREBASE_ADMIN_PRIVATE_KEY` are missing.

**Fix:** Add the credentials to `.env.local` as described above.

### "Authentication failed: ..."

Check the terminal where `npm run dev` is running for detailed error messages. Common issues:

- **Invalid private key format:** Make sure `\n` characters are preserved
- **Wrong client email:** Copy exactly from the JSON file
- **Expired key:** Generate a new service account key

### "Permission denied"

The service account may not have sufficient permissions.

**Fix:**
1. Go to Firebase Console → Project settings → Service accounts
2. Click "Manage service account permissions"
3. Ensure the service account has "Firebase Admin SDK Administrator Service Agent" role

## Production Deployment

For Vercel/production:

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
4. Deploy

**Important:** Use a separate service account for production (not the same as development).

## Revoking Keys

If a key is compromised:

1. Go to Firebase Console → Project settings → Service accounts
2. Click "Manage service account permissions"
3. Find the compromised account
4. Delete the key
5. Generate a new one
6. Update `.env.local`
