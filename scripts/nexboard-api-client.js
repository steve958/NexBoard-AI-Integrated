/**
 * NexBoard API Client
 *
 * A JavaScript client for interacting with the NexBoard API.
 * Can be used in Node.js or browser environments.
 *
 * Usage:
 *   const client = new NexBoardClient('https://your-app.vercel.app', 'nex_yourToken');
 *   const tasks = await client.getTasks('project123');
 */

class NexBoardClient {
  /**
   * Create a new NexBoard API client
   * @param {string} baseUrl - Base URL of your NexBoard instance (e.g., 'https://your-app.vercel.app')
   * @param {string} apiToken - Your NexBoard API token (starts with 'nex_')
   */
  constructor(baseUrl, apiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiToken = apiToken;
    this.headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make an HTTP request to the API
   * @private
   */
  async _request(method, endpoint, body = null, queryParams = {}) {
    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] !== null && queryParams[key] !== undefined) {
        url.searchParams.append(key, queryParams[key]);
      }
    });

    const options = {
      method,
      headers: this.headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), options);

      // Parse response
      const data = await response.json();

      // Check for errors
      if (!response.ok) {
        throw new NexBoardError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof NexBoardError) {
        throw error;
      }
      throw new NexBoardError(`Request failed: ${error.message}`, 0, error);
    }
  }

  /**
   * List all tasks in a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of tasks
   */
  async getTasks(projectId) {
    const data = await this._request('GET', `/api/projects/${projectId}/tasks`);
    return data.tasks || [];
  }

  /**
   * Get a single task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task object
   */
  async getTask(taskId) {
    return await this._request('GET', `/api/tasks/${taskId}`);
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @param {string} taskData.projectId - Project ID (required)
   * @param {string} taskData.title - Task title (required)
   * @param {string} taskData.status - Column/status ID (optional, defaults to "backlog")
   * @param {string} [taskData.description] - Task description
   * @param {string} [taskData.assigneeId] - User ID to assign to
   * @param {string} [taskData.dueDate] - Due date (ISO 8601 format)
   * @param {string} [taskData.parentTaskId] - Parent task ID (for subtasks)
   * @returns {Promise<Object>} Created task object
   */
  async createTask(taskData) {
    const { projectId, title, status, description, assigneeId, dueDate, parentTaskId } = taskData;

    if (!projectId || !title) {
      throw new NexBoardError('Missing required fields: projectId, title', 400);
    }

    return await this._request('POST', `/api/projects/${projectId}/tasks`, {
      title,
      status,
      description,
      assigneeId,
      dueDate,
      parentTaskId
    });
  }

  /**
   * Update a task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Fields to update
   * @param {string} [updates.title] - New title
   * @param {string} [updates.description] - New description
   * @param {string} [updates.status] - New status/column ID
   * @param {string} [updates.assigneeId] - New assignee ID
   * @param {string} [updates.dueDate] - New due date
   * @returns {Promise<Object>} Updated task object
   */
  async updateTask(taskId, updates) {
    return await this._request('PATCH', `/api/tasks/${taskId}`, updates);
  }

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Success message
   */
  async deleteTask(taskId) {
    return await this._request('DELETE', `/api/tasks/${taskId}`);
  }

  /**
   * Move a task to a different column/status
   * @param {string} taskId - Task ID
   * @param {string} columnId - Target column ID
   * @returns {Promise<Object>} Updated task object
   */
  async moveTask(taskId, columnId) {
    return await this.updateTask(taskId, { status: columnId });
  }

  /**
   * Assign a task to a user
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID to assign to
   * @returns {Promise<Object>} Updated task object
   */
  async assignTask(taskId, userId) {
    return await this.updateTask(taskId, { assigneeId: userId });
  }

  /**
   * Set a task's due date
   * @param {string} taskId - Task ID
   * @param {Date|string} dueDate - Due date (Date object or ISO string)
   * @returns {Promise<Object>} Updated task object
   */
  async setDueDate(taskId, dueDate) {
    const dateString = dueDate instanceof Date ? dueDate.toISOString() : dueDate;
    return await this.updateTask(taskId, { dueDate: dateString });
  }
}

/**
 * Custom error class for NexBoard API errors
 */
class NexBoardError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'NexBoardError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { NexBoardClient, NexBoardError };
} else if (typeof window !== 'undefined') {
  // Browser
  window.NexBoardClient = NexBoardClient;
  window.NexBoardError = NexBoardError;
}
