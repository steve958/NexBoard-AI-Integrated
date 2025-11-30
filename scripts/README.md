# NexBoard API Client Scripts

JavaScript client library and examples for interacting with the NexBoard API.

## 📦 Files

- **`nexboard-api-client.js`** - Main client library (works in Node.js and browser)
- **`examples/node-example.js`** - Node.js usage example
- **`examples/browser-example.html`** - Browser usage example with UI

## 🚀 Quick Start

### Node.js Usage

```javascript
const { NexBoardClient } = require('./nexboard-api-client.js');

const client = new NexBoardClient(
  'https://your-nexboard.vercel.app',
  'nex_yourTokenHere'
);

// List tasks
const tasks = await client.getTasks('project-id');
console.log(tasks);

// Create a task
const newTask = await client.createTask({
  projectId: 'project-id',
  title: 'New task',
  columnId: 'column-id'
});

// Update a task
await client.updateTask('task-id', {
  title: 'Updated title',
  description: 'New description'
});

// Delete a task
await client.deleteTask('task-id');
```

### Browser Usage

```html
<script src="nexboard-api-client.js"></script>
<script>
  const client = new NexBoardClient(
    'https://your-nexboard.vercel.app',
    'nex_yourTokenHere'
  );

  // Use async/await or promises
  client.getTasks('project-id')
    .then(tasks => console.log(tasks))
    .catch(error => console.error(error));
</script>
```

## 📖 API Reference

### Constructor

```javascript
new NexBoardClient(baseUrl, apiToken)
```

- `baseUrl` (string): Your NexBoard instance URL
- `apiToken` (string): Your API token from Settings

### Methods

#### `getTasks(projectId)`

List all tasks in a project.

```javascript
const tasks = await client.getTasks('project-123');
```

Returns: `Promise<Array<Task>>`

#### `getTask(taskId)`

Get a single task by ID.

```javascript
const task = await client.getTask('task-456');
```

Returns: `Promise<Task>`

#### `createTask(taskData)`

Create a new task.

```javascript
const task = await client.createTask({
  projectId: 'project-123',      // Required
  title: 'Task title',           // Required
  columnId: 'column-789',        // Required
  description: 'Description',    // Optional
  assigneeId: 'user-456',        // Optional
  dueDate: '2024-02-01T00:00:00Z', // Optional (ISO 8601)
  parentTaskId: 'parent-123'     // Optional (for subtasks)
});
```

Returns: `Promise<Task>`

#### `updateTask(taskId, updates)`

Update a task.

```javascript
const task = await client.updateTask('task-456', {
  title: 'New title',           // Optional
  description: 'New desc',      // Optional
  status: 'column-id',          // Optional (moves to new column)
  assigneeId: 'user-123',       // Optional
  dueDate: '2024-03-01T00:00:00Z' // Optional
});
```

Returns: `Promise<Task>`

#### `deleteTask(taskId)`

Delete a task.

```javascript
await client.deleteTask('task-456');
```

Returns: `Promise<{success: true, message: string}>`

#### `moveTask(taskId, columnId)`

Move a task to a different column/status.

```javascript
await client.moveTask('task-456', 'done-column-id');
```

Returns: `Promise<Task>`

#### `assignTask(taskId, userId)`

Assign a task to a user.

```javascript
await client.assignTask('task-456', 'user-123');
```

Returns: `Promise<Task>`

#### `setDueDate(taskId, dueDate)`

Set a task's due date.

```javascript
await client.setDueDate('task-456', new Date('2024-02-01'));
// or
await client.setDueDate('task-456', '2024-02-01T00:00:00Z');
```

Returns: `Promise<Task>`

## 🧪 Running Examples

### Node.js Example

1. Edit `examples/node-example.js`:
   - Set `BASE_URL` to your NexBoard URL
   - Set `API_TOKEN` to your API token
   - Set `PROJECT_ID` to your project ID

2. Run:
   ```bash
   node examples/node-example.js
   ```

**Requirements:**
- Node.js 18+ (has native `fetch`)
- OR install `node-fetch`: `npm install node-fetch`

### Browser Example

1. Open `examples/browser-example.html` in a web browser

2. Enter your configuration:
   - Base URL
   - API Token
   - Project ID
   - Column ID

3. Click buttons to test different API operations

**Note:** For production use, serve the HTML file from a web server to avoid CORS issues.

## 🔍 Finding IDs

### Project ID

1. Open a board in NexBoard
2. Check the URL: `https://your-app.vercel.app/boards/[projectId]`
3. The `projectId` is in the URL

### Column ID

**Method 1: Browser DevTools**
1. Open a board
2. Press F12 (DevTools)
3. Go to Console tab
4. Type: `document.querySelector('[data-column-id]')?.dataset.columnId`

**Method 2: Network Tab**
1. Open DevTools → Network tab
2. Move a task between columns
3. Look at the request payload
4. Find the `columnId` field

**Method 3: API Call**
```javascript
// List tasks and check their columnIds
const tasks = await client.getTasks('project-id');
console.log(tasks[0].columnId);
```

## ⚠️ Error Handling

The client throws `NexBoardError` for API errors:

```javascript
try {
  const tasks = await client.getTasks('invalid-project');
} catch (error) {
  if (error.name === 'NexBoardError') {
    console.error(`API Error (${error.statusCode}):`, error.message);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

**Common error codes:**
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `429` - Rate limit exceeded (300 requests/hour)
- `500` - Server error

## 🔐 Security Best Practices

1. **Never commit tokens to version control**
   ```bash
   # Add to .gitignore
   echo "*.token" >> .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment variables**
   ```javascript
   const API_TOKEN = process.env.NEXBOARD_TOKEN;
   ```

3. **Revoke compromised tokens immediately**
   - Go to Settings → Personal API Tokens
   - Click "Revoke" on the compromised token

4. **Use appropriate scopes**
   - Read-only tasks: `tasks:read`
   - Full access: `tasks:read` + `tasks:write`

## 🌐 CORS Considerations

When using in the browser from a different domain:

- The NexBoard API must allow CORS from your domain
- Or serve your HTML from the same domain as NexBoard
- Or use a backend proxy to make API calls

## 📝 TypeScript Support

For TypeScript projects, you can add type definitions:

```typescript
interface Task {
  taskId: string;
  title: string;
  description?: string;
  columnId: string;
  order: string;
  assigneeId?: string;
  parentTaskId?: string;
  dueDate?: string;
  subtasks: any[];
  createdAt: string;
  updatedAt: string;
}

interface NexBoardClient {
  getTasks(projectId: string): Promise<Task[]>;
  getTask(taskId: string): Promise<Task>;
  createTask(taskData: Partial<Task> & {
    projectId: string;
    title: string;
    columnId: string;
  }): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(taskId: string): Promise<{success: boolean; message: string}>;
}
```

## 📚 More Information

- API Documentation: `docs/api-documentation.md`
- NexBoard Settings: Settings → Personal API Tokens
- Rate Limits: 300 requests/hour per token
