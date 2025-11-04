import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const projectId = 'demo-notifications-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  console.log('Testing notifications subcollection security rules...\n');

  // Setup: Create a project with members
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('projects').doc('p1').set({
      name: 'Test Project',
      ownerId: 'alice',
      members: ['alice', 'bob', 'charlie'],
      roles: {
        bob: 'editor',
        charlie: 'commenter',
      },
    });

    // Seed notifications
    await db.collection('projects').doc('p1').collection('notifications').doc('notif1').set({
      userId: 'alice',
      type: 'mention',
      taskId: 'task1',
      actorId: 'bob',
      read: false,
      createdAt: new Date(),
    });

    await db.collection('projects').doc('p1').collection('notifications').doc('notif2').set({
      userId: 'bob',
      type: 'assignment',
      taskId: 'task2',
      actorId: 'alice',
      read: false,
      createdAt: new Date(),
    });
  });

  // Test 1: User can read their own notifications
  console.log('✓ Test 1: User can read own notifications');
  const alice = testEnv.authenticatedContext('alice');
  const aliceDb = alice.firestore();
  await assertSucceeds(aliceDb.collection('projects').doc('p1').collection('notifications').doc('notif1').get());

  // Test 2: User CANNOT read other users' notifications
  console.log('✓ Test 2: User cannot read other users\' notifications');
  await assertFails(aliceDb.collection('projects').doc('p1').collection('notifications').doc('notif2').get());

  // Test 3: Member can create notifications for other members
  console.log('✓ Test 3: Member can create notifications');
  const bob = testEnv.authenticatedContext('bob');
  const bobDb = bob.firestore();
  await assertSucceeds(bobDb.collection('projects').doc('p1').collection('notifications').add({
    userId: 'alice',
    type: 'comment',
    taskId: 'task3',
    actorId: 'bob',
    read: false,
    createdAt: new Date(),
  }));

  // Test 4: User can update (mark as read) their own notifications
  console.log('✓ Test 4: User can update own notifications');
  await assertSucceeds(aliceDb.collection('projects').doc('p1').collection('notifications').doc('notif1').update({
    read: true,
  }));

  // Test 5: User CANNOT update other users' notifications
  console.log('✓ Test 5: User cannot update other users\' notifications');
  await assertFails(aliceDb.collection('projects').doc('p1').collection('notifications').doc('notif2').update({
    read: true,
  }));

  // Test 6: Non-member CANNOT read notifications
  console.log('✓ Test 6: Non-member cannot read notifications');
  const outsider = testEnv.authenticatedContext('outsider');
  const outsiderDb = outsider.firestore();
  await assertFails(outsiderDb.collection('projects').doc('p1').collection('notifications').doc('notif1').get());

  // Test 7: Non-member CANNOT create notifications
  console.log('✓ Test 7: Non-member cannot create notifications');
  await assertFails(outsiderDb.collection('projects').doc('p1').collection('notifications').add({
    userId: 'alice',
    type: 'mention',
    taskId: 'task4',
    actorId: 'outsider',
    read: false,
    createdAt: new Date(),
  }));

  // Test 8: Unauthenticated user CANNOT access notifications
  console.log('✓ Test 8: Unauthenticated user cannot access notifications');
  const unauth = testEnv.unauthenticatedContext();
  const unauthDb = unauth.firestore();
  await assertFails(unauthDb.collection('projects').doc('p1').collection('notifications').doc('notif1').get());

  await testEnv.cleanup();
  console.log('\n✅ All notifications subcollection security tests passed!');
};

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
