import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const projectId = 'demo-roles-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  console.log('Testing role-based permissions...\n');

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
    
    // Seed a task
    await db.collection('projects').doc('p1').collection('tasks').doc('task1').set({
      title: 'Test Task',
      columnId: 'col1',
      order: 'a0',
    });
    
    // Seed a comment
    await db.collection('projects').doc('p1').collection('comments').doc('comment1').set({
      text: 'Test comment',
      authorId: 'commenter1',
      taskId: 'task1',
    });
  });

  // Test 1: Owner can update project
  console.log('✓ Test 1: Owner permissions');
  const owner = testEnv.authenticatedContext('owner1');
  const ownerDb = owner.firestore();
  await assertSucceeds(ownerDb.collection('projects').doc('p1').update({ name: 'Updated' }));

  // Test 2: Editor CANNOT update project
  console.log('✓ Test 2: Editor cannot manage project');
  const editor = testEnv.authenticatedContext('editor1');
  const editorDb = editor.firestore();
  await assertFails(editorDb.collection('projects').doc('p1').update({ name: 'Hacked' }));

  // Test 3: Editor CAN create tasks
  console.log('✓ Test 3: Editor can create tasks');
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('tasks').add({
    title: 'New Task',
    columnId: 'col1',
    order: 'a1',
  }));

  // Test 4: Editor CAN update tasks
  console.log('✓ Test 4: Editor can update tasks');
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('tasks').doc('task1').update({
    title: 'Updated Task',
  }));

  // Test 5: Editor CAN delete tasks
  console.log('✓ Test 5: Editor can delete tasks');
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('tasks').doc('task1').delete());

  // Test 6: Commenter CANNOT create tasks
  console.log('✓ Test 6: Commenter cannot create tasks');
  const commenter = testEnv.authenticatedContext('commenter1');
  const commenterDb = commenter.firestore();
  await assertFails(commenterDb.collection('projects').doc('p1').collection('tasks').add({
    title: 'Unauthorized Task',
    columnId: 'col1',
    order: 'a2',
  }));

  // Test 7: Commenter CAN read tasks
  console.log('✓ Test 7: Commenter can read tasks');
  await assertSucceeds(commenterDb.collection('projects').doc('p1').collection('tasks').get());

  // Test 8: Commenter CAN create comments
  console.log('✓ Test 8: Commenter can create comments');
  await assertSucceeds(commenterDb.collection('projects').doc('p1').collection('comments').add({
    text: 'New comment',
    authorId: 'commenter1',
    taskId: 'task1',
  }));

  // Test 9: Commenter CAN update own comments
  console.log('✓ Test 9: Commenter can update own comments');
  await assertSucceeds(commenterDb.collection('projects').doc('p1').collection('comments').doc('comment1').update({
    text: 'Updated comment',
  }));

  // Test 10: Commenter CAN delete own comments
  console.log('✓ Test 10: Commenter can delete own comments');
  await assertSucceeds(commenterDb.collection('projects').doc('p1').collection('comments').doc('comment1').delete());

  // Test 11: Editor CAN moderate (delete) others' comments
  console.log('✓ Test 11: Editor can moderate comments');
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('projects').doc('p1').collection('comments').doc('comment2').set({
      text: 'Another comment',
      authorId: 'commenter1',
      taskId: 'task1',
    });
  });
  await assertSucceeds(editorDb.collection('projects').doc('p1').collection('comments').doc('comment2').delete());

  // Test 12: Non-member CANNOT read project
  console.log('✓ Test 12: Non-member denied access');
  const outsider = testEnv.authenticatedContext('outsider1');
  const outsiderDb = outsider.firestore();
  await assertFails(outsiderDb.collection('projects').doc('p1').get());

  await testEnv.cleanup();
  console.log('\n✅ All role-based permission tests passed!');
};

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
