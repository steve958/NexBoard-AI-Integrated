# NexBoard API Documentation

## Overview

The NexBoard API allows external applications and integrations to interact with your tasks programmatically. All API endpoints require authentication using API tokens.

## Base URL

```
Production: https://your-nexboard-domain.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

All API requests must include a Bearer token in the Authorization header:

```
Authorization: Bearer nex_yourTokenHere
```

### Creating an API Token

1. Navigate to **Settings** in your NexBoard application
2. Scroll to **Personal API Tokens**
3. Enter a label (e.g., "CI/CD Pipeline", "Zapier Integration")
4. Select the required scopes:
   - `tasks:read` - Read tasks
   - `tasks:write` - Create, update, and delete tasks
5. Click **Generate Token**
6. **Copy the token immediately** - it will only be shown once!

### Token Scopes

- **tasks:read**: Allows reading task data
- **tasks:write**: Allows creating, updating, and deleting tasks

## Rate Limiting

- **300 requests per hour** per token
- Rate limit resets every hour
- Response headers include rate limit information

## API Endpoints

### List Tasks

Get all tasks in a project.

```http
GET /api/tasks?projectId={projectId}
```

**Required Scope:** `tasks:read`

**Query Parameters:**
- `projectId` (required): The project ID to fetch tasks from

**Response:**
```json
{
  "tasks": [
    {
      "taskId": "task123",
      "title": "Fix login bug",
      "description": "Users can't log in with Google",
      "columnId": "col456",
      "order": "2024-01-15T10:30:00Z",
      "assigneeId": "user789",
      "parentTaskId": null,
      "dueDate": "2024-01-20T00:00:00Z",
      "subtasks": [],
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

**Example:**
```bash
curl https://your-app.vercel.app/api/tasks?projectId=abc123 \
  -H "Authorization: Bearer nex_yourTokenHere"
```

---

### Get Single Task

Retrieve a specific task by ID.

```http
GET /api/tasks/{taskId}
```

**Required Scope:** `tasks:read`

**Response:**
```json
{
  "taskId": "task123",
  "projectId": "proj456",
  "title": "Fix login bug",
  "description": "...",
  "columnId": "col789",
  "assigneeId": "user123",
  "dueDate": "2024-01-20T00:00:00Z",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T09:00:00Z"
}
```

**Example:**
```bash
curl https://your-app.vercel.app/api/tasks/task123 \
  -H "Authorization: Bearer nex_yourTokenHere"
```

---

### Create Task

Create a new task in a project.

```http
POST /api/tasks
```

**Required Scope:** `tasks:write`

**Request Body:**
```json
{
  "projectId": "proj123",
  "title": "New task title",
  "description": "Task description (optional)",
  "columnId": "col456",
  "assigneeId": "user789",
  "dueDate": "2024-02-01T00:00:00Z"
}
```

**Required Fields:**
- `projectId`: Project to create the task in
- `title`: Task title (non-empty string)
- `columnId`: Column/status to place the task in

**Optional Fields:**
- `description`: Task description
- `assigneeId`: User ID to assign the task to
- `dueDate`: ISO 8601 date string
- `parentTaskId`: ID of parent task (for subtasks)

**Response:**
```json
{
  "taskId": "task123",
  "title": "New task title",
  "description": "Task description",
  "columnId": "col456",
  "assigneeId": "user789",
  "dueDate": "2024-02-01T00:00:00Z",
  "createdAt": "2024-01-16T10:00:00Z",
  "updatedAt": "2024-01-16T10:00:00Z"
}
```

**Example:**
```bash
curl -X POST https://your-app.vercel.app/api/tasks \
  -H "Authorization: Bearer nex_yourTokenHere" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj123",
    "title": "Implement new feature",
    "description": "Add dark mode support",
    "columnId": "col456"
  }'
```

---

### Update Task

Update an existing task.

```http
PATCH /api/tasks/{taskId}
```

**Required Scope:** `tasks:write`

**Request Body** (all fields optional):
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "col789",
  "assigneeId": "user456",
  "dueDate": "2024-02-15T00:00:00Z",
  "order": "new-order-value"
}
```

**Note:** `status` field maps to `columnId` internally.

**Response:**
```json
{
  "taskId": "task123",
  "title": "Updated title",
  "description": "Updated description",
  "columnId": "col789",
  "assigneeId": "user456",
  "dueDate": "2024-02-15T00:00:00Z",
  "updatedAt": "2024-01-16T11:00:00Z"
}
```

**Example:**
```bash
curl -X PATCH https://your-app.vercel.app/api/tasks/task123 \
  -H "Authorization: Bearer nex_yourTokenHere" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated task title",
    "status": "done-column-id"
  }'
```

---

### Delete Task

Delete a task.

```http
DELETE /api/tasks/{taskId}
```

**Required Scope:** `tasks:write`

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE https://your-app.vercel.app/api/tasks/task123 \
  -H "Authorization: Bearer nex_yourTokenHere"
```

---

### List Tasks by Project

Alternative endpoint for listing tasks.

```http
GET /api/projects/{projectId}/tasks
```

**Required Scope:** `tasks:read`

**Response:** Same as `GET /api/tasks`

---

## Error Responses

All errors return a JSON object with an `error` field:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient scope or not a project member)
- `404` - Not Found (task/project doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Integration Examples

### GitHub Actions

Create a task when a deployment fails:

```yaml
name: Deploy
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        id: deploy
        run: ./deploy.sh
        continue-on-error: true

      - name: Create NexBoard Task on Failure
        if: steps.deploy.outcome == 'failure'
        run: |
          curl -X POST https://your-app.vercel.app/api/tasks \
            -H "Authorization: Bearer ${{ secrets.NEXBOARD_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "projectId": "${{ secrets.NEXBOARD_PROJECT_ID }}",
              "title": "Deployment failed for ${{ github.sha }}",
              "description": "Check GitHub Actions run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
              "columnId": "${{ secrets.NEXBOARD_TODO_COLUMN }}"
            }'
```

### Zapier/Make.com

1. Create a new Zap/Scenario
2. Add a "Webhooks by Zapier" action
3. Choose "POST"
4. URL: `https://your-app.vercel.app/api/tasks`
5. Headers:
   ```
   Authorization: Bearer nex_yourTokenHere
   Content-Type: application/json
   ```
6. Data:
   ```json
   {
     "projectId": "your-project-id",
     "title": "{{trigger_data}}",
     "columnId": "your-column-id"
   }
   ```

### Custom GPT

Configure a Custom GPT with this OpenAPI schema:

```yaml
openapi: 3.0.0
info:
  title: NexBoard API
  version: 1.0.0
servers:
  - url: https://your-app.vercel.app/api
paths:
  /tasks:
    get:
      summary: List tasks
      parameters:
        - name: projectId
          in: query
          required: true
          schema:
            type: string
      security:
        - BearerAuth: []
    post:
      summary: Create task
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, title, columnId]
              properties:
                projectId:
                  type: string
                title:
                  type: string
                columnId:
                  type: string
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Best Practices

1. **Keep tokens secure**: Never commit tokens to version control
2. **Use environment variables**: Store tokens in secrets/environment variables
3. **Use appropriate scopes**: Only request the minimum scopes needed
4. **Handle errors gracefully**: Check response status codes
5. **Respect rate limits**: Implement exponential backoff
6. **Revoke compromised tokens**: Immediately revoke any exposed tokens

## Security

- Tokens are hashed using PBKDF2-SHA256 with 100,000 iterations
- Each token has a unique salt
- Tokens are verified using constant-time comparison
- All API requests require valid project membership
- Firestore security rules enforce access control

## Getting Project and Column IDs

### Find Project ID:
1. Open a board in NexBoard
2. Check the URL: `https://your-app.vercel.app/boards/[projectId]`
3. The `projectId` is the value after `/boards/`

### Find Column ID:
1. Open browser DevTools (F12)
2. Go to Application > IndexedDB > firestore > ...
3. Look for your project's columns
4. Each column has a `columnId` field

Alternatively, use the browser console:
```javascript
// In the board view
console.log("Columns:", window.location.pathname);
// Then inspect the network tab for API calls
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/issues
- Documentation: https://github.com/your-repo/docs
