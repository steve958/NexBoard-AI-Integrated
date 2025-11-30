/**
 * Node.js Example - Using NexBoard API Client
 *
 * Run with: node node-example.js
 *
 * Requirements:
 * - Node.js 18+ (for native fetch support)
 * - OR install node-fetch: npm install node-fetch
 */

// For Node.js < 18, uncomment this:
// global.fetch = require('node-fetch');

const { NexBoardClient } = require('../nexboard-api-client.js');

// Configuration
const BASE_URL = 'https://your-nexboard.vercel.app'; // Replace with your URL
const API_TOKEN = 'nex_yourTokenHere'; // Replace with your token
const PROJECT_ID = 'your-project-id'; // Replace with your project ID

async function main() {
  // Create client
  const client = new NexBoardClient(BASE_URL, API_TOKEN);

  console.log('🚀 NexBoard API Client - Node.js Example\n');

  try {
    // Example 1: List all tasks
    console.log('📋 Fetching tasks...');
    const tasks = await client.getTasks(PROJECT_ID);
    console.log(`Found ${tasks.length} tasks:`);
    tasks.forEach(task => {
      console.log(`  - ${task.title} (${task.taskId})`);
    });
    console.log();

    // Example 2: Create a new task
    console.log('✨ Creating a new task...');
    const newTask = await client.createTask({
      projectId: PROJECT_ID,
      title: 'Test task from Node.js',
      description: 'This task was created using the NexBoard API client',
      status: 'backlog', // Optional: defaults to "backlog" if not provided
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    });
    console.log(`Created task: ${newTask.title} (${newTask.taskId})`);
    console.log();

    // Example 3: Update the task
    console.log('📝 Updating the task...');
    const updatedTask = await client.updateTask(newTask.taskId, {
      description: 'Updated description from Node.js script'
    });
    console.log(`Updated task: ${updatedTask.title}`);
    console.log();

    // Example 4: Get single task
    console.log('🔍 Fetching single task...');
    const task = await client.getTask(newTask.taskId);
    console.log(`Task details:`, task);
    console.log();

    // Example 5: Move task to different column
    console.log('➡️  Moving task...');
    await client.moveTask(newTask.taskId, 'done-column-id'); // Replace with actual column ID
    console.log('Task moved successfully');
    console.log();

    // Example 6: Delete the task
    console.log('🗑️  Deleting the task...');
    await client.deleteTask(newTask.taskId);
    console.log('Task deleted successfully');
    console.log();

    console.log('✅ All examples completed successfully!');

  } catch (error) {
    if (error.name === 'NexBoardError') {
      console.error(`❌ API Error (${error.statusCode}):`, error.message);
      if (error.details) {
        console.error('Details:', error.details);
      }
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
    process.exit(1);
  }
}

// Run the examples
main();
