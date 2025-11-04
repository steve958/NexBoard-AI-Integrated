import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const projectId = 'demo-projects-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  console.log('Testing projects collection security rules...\n');

  // Test 1: User can create project where they are owner and member
  console.log('✓ Test 1: User can create project as owner');
  const alice = testEnv.authenticatedContext('alice');
  const aliceDb = alice.firestore();
  await assertSucceeds(aliceDb.collection('projects').add({
    name: 'Alice Project',
    ownerId: 'alice',
    members: ['alice'],
    roles: {},
  }));

  // Test 2: User CANNOT create project for another user as owner
  console.log('✓ Test 2: User cannot create project for another user');
  await assertFails(aliceDb.collection('projects').add({
    name: 'Fake Project',
    ownerId: 'bob',
    members: ['bob'],
    roles: {},
  }));

  // Test 3: User CANNOT create project without including themselves as member
  console.log('✓ Test 3: User cannot create project without being member');
  await assertFails(aliceDb.collection('projects').add({
    name: 'Invalid Project',
    ownerId: 'alice',
    members: ['bob'],
    roles: {},
  }));

  // Setup: Create projects for read/update/delete tests
  let aliceProjectId, bobProjectId;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const aliceProject = await db.collection('projects').add({
      name: 'Alice Project',
      ownerId: 'alice',
      members: ['alice', 'bob'],
      roles: { bob: 'editor' },
    });
    aliceProjectId = aliceProject.id;

    const bobProject = await db.collection('projects').add({
      name: 'Bob Project',
      ownerId: 'bob',
      members: ['bob'],
      roles: {},
    });
    bobProjectId = bobProject.id;
  });

  // Test 4: Member can read project
  console.log('✓ Test 4: Member can read project');
  await assertSucceeds(aliceDb.collection('projects').doc(aliceProjectId).get());

  // Test 5: Non-member CANNOT read project
  console.log('✓ Test 5: Non-member cannot read project');
  await assertFails(aliceDb.collection('projects').doc(bobProjectId).get());

  // Test 6: Owner can update project
  console.log('✓ Test 6: Owner can update project');
  await assertSucceeds(aliceDb.collection('projects').doc(aliceProjectId).update({
    name: 'Alice Updated Project',
  }));

  // Test 7: Non-owner member CANNOT update project
  console.log('✓ Test 7: Non-owner member cannot update project');
  const bob = testEnv.authenticatedContext('bob');
  const bobDb = bob.firestore();
  await assertFails(bobDb.collection('projects').doc(aliceProjectId).update({
    name: 'Bob Hacked Project',
  }));

  // Test 8: Owner can delete project
  console.log('✓ Test 8: Owner can delete project');
  await assertSucceeds(aliceDb.collection('projects').doc(aliceProjectId).delete());

  // Test 9: Non-owner CANNOT delete project
  console.log('✓ Test 9: Non-owner cannot delete project');
  await assertFails(bobDb.collection('projects').doc(bobProjectId).delete());

  // Test 10: Unauthenticated user CANNOT create project
  console.log('✓ Test 10: Unauthenticated user cannot create project');
  const unauth = testEnv.unauthenticatedContext();
  const unauthDb = unauth.firestore();
  await assertFails(unauthDb.collection('projects').add({
    name: 'Unauth Project',
    ownerId: 'unauth',
    members: ['unauth'],
    roles: {},
  }));

  // Test 11: Unauthenticated user CANNOT read project
  console.log('✓ Test 11: Unauthenticated user cannot read project');
  await assertFails(unauthDb.collection('projects').doc(bobProjectId).get());

  await testEnv.cleanup();
  console.log('\n✅ All projects collection security tests passed!');
};

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
