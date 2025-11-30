# Deploying Firestore Indexes

## Overview

Firestore requires composite indexes for queries that filter and order on multiple fields. The NexBoard app uses several composite indexes defined in `firestore.indexes.json`.

## When Indexes Are Needed

You'll see errors like:
- `failed-precondition: The query requires an index`
- Tokens not appearing in Settings page
- Tasks not loading properly

## Deploying Indexes

### Method 1: Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done):
   ```bash
   cd nexboard
   firebase init firestore
   ```
   - Select your Firebase project
   - Accept the default firestore.rules and firestore.indexes.json files

4. **Deploy indexes**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

5. **Wait for index creation** (usually 2-5 minutes):
   - Firebase will show a URL to track progress
   - You can also check in Firebase Console → Firestore Database → Indexes

### Method 2: Firebase Console (Manual)

1. **Open Firebase Console**:
   - Go to https://console.firebase.google.com
   - Select your project
   - Navigate to Firestore Database → Indexes

2. **Create the missing index**:
   - Click "Create Index"
   - Collection: `apiTokens`
   - Fields:
     - `userId` - Ascending
     - `createdAt` - Descending
   - Query scope: Collection
   - Click "Create"

3. **Wait for index to build** (status will change from "Building" to "Enabled")

### Method 3: Auto-create from Error Link

When you get an index error in the browser console:

1. Look for an error message that includes a link like:
   ```
   https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes?create_composite=...
   ```

2. Click the link - it will pre-fill the index creation form

3. Click "Create Index"

## Verifying Indexes

### Check Deployment Status

```bash
firebase firestore:indexes
```

This shows all deployed indexes and their status.

### Check in Firebase Console

1. Go to Firebase Console → Firestore Database → Indexes
2. Look for:
   - ✅ Status: "Enabled" (good)
   - ⏳ Status: "Building" (wait a few minutes)
   - ❌ Status: "Error" (check the error message)

## Required Indexes for NexBoard

From `firestore.indexes.json`:

1. **apiTokens** (for Settings page):
   - userId (ASC) + createdAt (DESC)
   - tokenPrefix (ASC) + revokedAt (ASC)

2. **tasks** (for board views):
   - columnId (ASC) + order (ASC)
   - assigneeId (ASC) + order (ASC)
   - parentTaskId (ASC) + order (ASC)

3. **comments** (for task details):
   - taskId (ASC) + createdAt (ASC)

4. **notifications** (for notification center):
   - userId (ASC) + createdAt (DESC)

## Troubleshooting

### Index Taking Too Long

- **Normal build time**: 2-5 minutes
- **Large collections**: Up to 15 minutes
- **If stuck**: Delete and recreate the index

### Index Creation Failed

- Check your Firebase plan (Spark/free plan has limits)
- Verify you have Owner or Editor role in Firebase project
- Check for typos in field names

### Index Still Not Working After Deployment

1. **Hard refresh the browser**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear browser cache**
3. **Wait 1-2 minutes** for Firestore to propagate changes
4. **Check browser console** for new errors

### Permission Denied Errors

If you see permission denied instead of index errors:

1. Check `firestore.rules` - ensure apiTokens rules allow reading:
   ```
   match /apiTokens/{tokenId} {
     allow read: if request.auth != null && request.auth.uid == resource.data.userId;
   }
   ```

2. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Development vs Production

- **Development**: Uses Firestore emulator (no index needed)
- **Production**: Requires indexes to be deployed

To use the emulator:
```bash
firebase emulators:start
```

Then update your `.env.local` to point to localhost.

## CI/CD Integration

Add to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Deploy Firestore Indexes
  run: |
    npm install -g firebase-tools
    firebase deploy --only firestore:indexes --token ${{ secrets.FIREBASE_TOKEN }}
```

## Additional Resources

- [Firestore Index Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Query Planning](https://firebase.google.com/docs/firestore/query-data/index-overview)
