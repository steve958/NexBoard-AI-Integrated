import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');

const projectId = 'demo-test';

const run = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  // Seed a project with a different member
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('projects').doc('p1').set({
      name: 'Test',
      members: ['userA'],
    });
  });

  // As userB (non-member), try to read the project — should fail
  const userB = testEnv.authenticatedContext('userB');
  const dbB = userB.firestore();
  const ref = dbB.collection('projects').doc('p1');
  await assertFails(ref.get());

  await testEnv.cleanup();
  console.log('Rules test passed: non-member denied as expected');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
