import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const projectId = 'demo-api-tokens-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  console.log('Testing API token security rules...\n');

  // Test 1: User can create their own token
  console.log('✓ Test 1: User can create own token');
  const alice = testEnv.authenticatedContext('alice');
  const aliceDb = alice.firestore();
  await assertSucceeds(aliceDb.collection('apiTokens').add({
    userId: 'alice',
    label: 'Test Token',
    scopes: ['tasks:read', 'tasks:write'],
    tokenHash: 'hash123',
    salt: 'salt123',
  }));

  // Setup: Create tokens for different users
  let aliceTokenId, bobTokenId;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const aliceToken = await db.collection('apiTokens').add({
      userId: 'alice',
      label: 'Alice Token',
      scopes: ['tasks:read'],
      tokenHash: 'hash_alice',
      salt: 'salt_alice',
    });
    aliceTokenId = aliceToken.id;

    const bobToken = await db.collection('apiTokens').add({
      userId: 'bob',
      label: 'Bob Token',
      scopes: ['tasks:write'],
      tokenHash: 'hash_bob',
      salt: 'salt_bob',
    });
    bobTokenId = bobToken.id;
  });

  // Test 2: User can read their own tokens
  console.log('✓ Test 2: User can read own tokens');
  await assertSucceeds(aliceDb.collection('apiTokens').doc(aliceTokenId).get());

  // Test 3: User CANNOT read other users' tokens
  console.log('✓ Test 3: User cannot read other users\' tokens');
  await assertFails(aliceDb.collection('apiTokens').doc(bobTokenId).get());

  // Test 4: User can update (revoke) their own tokens
  console.log('✓ Test 4: User can revoke own tokens');
  await assertSucceeds(aliceDb.collection('apiTokens').doc(aliceTokenId).update({
    revokedAt: new Date(),
  }));

  // Test 5: User CANNOT update other users' tokens
  console.log('✓ Test 5: User cannot update other users\' tokens');
  const bob = testEnv.authenticatedContext('bob');
  const bobDb = bob.firestore();
  await assertFails(bobDb.collection('apiTokens').doc(aliceTokenId).update({
    revokedAt: new Date(),
  }));

  // Test 6: User can delete their own tokens
  console.log('✓ Test 6: User can delete own tokens');
  await assertSucceeds(bobDb.collection('apiTokens').doc(bobTokenId).delete());

  // Test 7: User CANNOT delete other users' tokens
  console.log('✓ Test 7: User cannot delete other users\' tokens');
  await assertFails(bobDb.collection('apiTokens').doc(aliceTokenId).delete());

  // Test 8: Token creation FAILS without required fields
  console.log('✓ Test 8: Token creation requires all fields');
  await assertFails(aliceDb.collection('apiTokens').add({
    userId: 'alice',
    label: 'Incomplete Token',
    // Missing scopes, tokenHash, salt
  }));

  // Test 9: User CANNOT create token for another user
  console.log('✓ Test 9: User cannot create token for another user');
  await assertFails(aliceDb.collection('apiTokens').add({
    userId: 'bob', // Alice trying to create token for Bob
    label: 'Malicious Token',
    scopes: ['tasks:read'],
    tokenHash: 'hash_malicious',
    salt: 'salt_malicious',
  }));

  // Test 10: User CANNOT change userId on update
  console.log('✓ Test 10: User cannot change userId when updating');
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('apiTokens').doc('alice-token-2').set({
      userId: 'alice',
      label: 'Another Alice Token',
      scopes: ['tasks:read'],
      tokenHash: 'hash_alice2',
      salt: 'salt_alice2',
    });
  });
  await assertFails(aliceDb.collection('apiTokens').doc('alice-token-2').update({
    userId: 'charlie', // Trying to change userId
  }));

  // Test 11: Unauthenticated user CANNOT access tokens
  console.log('✓ Test 11: Unauthenticated user denied access');
  const unauth = testEnv.unauthenticatedContext();
  const unauthDb = unauth.firestore();
  await assertFails(unauthDb.collection('apiTokens').doc(aliceTokenId).get());
  await assertFails(unauthDb.collection('apiTokens').add({
    userId: 'hacker',
    label: 'Hacker Token',
    scopes: ['tasks:write'],
    tokenHash: 'hash_hacker',
    salt: 'salt_hacker',
  }));

  await testEnv.cleanup();
  console.log('\n✅ All API token security tests passed!');
};

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
