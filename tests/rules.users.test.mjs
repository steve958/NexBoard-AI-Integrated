import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const projectId = 'demo-users-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  console.log('Testing users collection security rules...\n');

  // Test 1: Authenticated user can read any user profile
  console.log('✓ Test 1: Authenticated user can read other user profiles');
  const alice = testEnv.authenticatedContext('alice');
  const aliceDb = alice.firestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('users').doc('bob').set({
      email: 'bob@example.com',
      name: 'Bob',
      createdAt: new Date(),
    });
  });
  await assertSucceeds(aliceDb.collection('users').doc('bob').get());

  // Test 2: Authenticated user can create their own profile
  console.log('✓ Test 2: User can create own profile');
  await assertSucceeds(aliceDb.collection('users').doc('alice').set({
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: new Date(),
  }));

  // Test 3: Authenticated user can update their own profile
  console.log('✓ Test 3: User can update own profile');
  await assertSucceeds(aliceDb.collection('users').doc('alice').update({
    name: 'Alice Updated',
  }));

  // Test 4: User CANNOT create profile for another user
  console.log('✓ Test 4: User cannot create profile for another user');
  await assertFails(aliceDb.collection('users').doc('charlie').set({
    email: 'charlie@example.com',
    name: 'Charlie',
    createdAt: new Date(),
  }));

  // Test 5: User CANNOT update another user's profile
  console.log('✓ Test 5: User cannot update another user\'s profile');
  await assertFails(aliceDb.collection('users').doc('bob').update({
    name: 'Hacked Bob',
  }));

  // Test 6: User can delete their own profile
  console.log('✓ Test 6: User can delete own profile');
  await assertSucceeds(aliceDb.collection('users').doc('alice').delete());

  // Test 7: User CANNOT delete another user's profile
  console.log('✓ Test 7: User cannot delete another user\'s profile');
  await assertFails(aliceDb.collection('users').doc('bob').delete());

  // Test 8: Unauthenticated user CANNOT read profiles
  console.log('✓ Test 8: Unauthenticated user cannot read profiles');
  const unauth = testEnv.unauthenticatedContext();
  const unauthDb = unauth.firestore();
  await assertFails(unauthDb.collection('users').doc('bob').get());

  // Test 9: Unauthenticated user CANNOT create profiles
  console.log('✓ Test 9: Unauthenticated user cannot create profiles');
  await assertFails(unauthDb.collection('users').doc('dave').set({
    email: 'dave@example.com',
    name: 'Dave',
  }));

  await testEnv.cleanup();
  console.log('\n✅ All users collection security tests passed!');
};

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
