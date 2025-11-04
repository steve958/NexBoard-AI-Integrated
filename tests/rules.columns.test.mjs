import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const projectId = 'demo-columns-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  console.log('Testing columns subcollection security rules...\n');

  // Setup: Create a project with different roles
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('projects').doc('p1').set({
      name: 'Test Project',
      ownerId: 'owner1',
      members: ['owner1', 'editor1', 'commenter1'],
      roles: {
        editor1: 'editor',
        commenter1: 'commenter',
      },
    });

    // Seed a column
    await db.collection('projects').doc('p1').collection('columns').doc('col1').set({
      name: 'To Do',
      order: 1,
    });
  });

  // Test 1: Members can read columns
  console.log('✓ Test 1: Member can read columns');
  const commenter = testEnv.authenticatedContext('commenter1');
  const commenterDb = commenter.firestore();
  await assertSucceeds(commenterDb.collection('projects').doc('p1').collection('columns').doc('col1').get());

  // Test 2: Editor can create columns
  console.log('✓ Test 2: Editor can create columns');
  const editor = testEnv.authenticatedContext('editor1');
  const editorDb = editor.firestore();
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('columns').add({
    name: 'In Progress',
    order: 2,
  }));

  // Test 3: Editor can update columns
  console.log('✓ Test 3: Editor can update columns');
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('columns').doc('col1').update({
    name: 'Backlog',
  }));

  // Test 4: Editor can delete columns
  console.log('✓ Test 4: Editor can delete columns');
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('columns').doc('col1').delete());

  // Test 5: Owner can manage columns
  console.log('✓ Test 5: Owner can create columns');
  const owner = testEnv.authenticatedContext('owner1');
  const ownerDb = owner.firestore();
  await assertSucceeds(ownerDb.collection('projects').doc('p1').collection('columns').add({
    name: 'Done',
    order: 3,
  }));

  // Test 6: Commenter CANNOT create columns
  console.log('✓ Test 6: Commenter cannot create columns');
  await assertFails(commenterDb.collection('projects').doc('p1').collection('columns').add({
    name: 'Unauthorized Column',
    order: 4,
  }));

  // Test 7: Commenter CANNOT update columns
  console.log('✓ Test 7: Commenter cannot update columns');
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('projects').doc('p1').collection('columns').doc('col2').set({
      name: 'Test Column',
      order: 5,
    });
  });
  await assertFails(commenterDb.collection('projects').doc('p1').collection('columns').doc('col2').update({
    name: 'Hacked',
  }));

  // Test 8: Commenter CANNOT delete columns
  console.log('✓ Test 8: Commenter cannot delete columns');
  await assertFails(commenterDb.collection('projects').doc('p1').collection('columns').doc('col2').delete());

  // Test 9: Non-member CANNOT read columns
  console.log('✓ Test 9: Non-member cannot read columns');
  const outsider = testEnv.authenticatedContext('outsider1');
  const outsiderDb = outsider.firestore();
  await assertFails(outsiderDb.collection('projects').doc('p1').collection('columns').doc('col2').get());

  // Test 10: Non-member CANNOT create columns
  console.log('✓ Test 10: Non-member cannot create columns');
  await assertFails(outsiderDb.collection('projects').doc('p1').collection('columns').add({
    name: 'Unauthorized',
    order: 6,
  }));

  await testEnv.cleanup();
  console.log('\n✅ All columns subcollection security tests passed!');
};

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
