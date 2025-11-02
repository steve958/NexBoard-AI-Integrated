import type { Project, UserRole } from "@/lib/types";

/**
 * Get the role of a user in a project
 */
export function getUserRole(project: Project, userId: string): UserRole | null {
  if (project.ownerId === userId) return "owner";
  return project.roles?.[userId] || null;
}

/**
 * Check if a user has at least the specified role level
 * Hierarchy: owner > editor > commenter
 */
export function hasRoleOrHigher(project: Project, userId: string, minRole: UserRole): boolean {
  const userRole = getUserRole(project, userId);
  if (!userRole) return false;
  
  const roleHierarchy: { [key in UserRole]: number } = {
    owner: 3,
    editor: 2,
    commenter: 1,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[minRole];
}

/**
 * Check if user can edit tasks
 */
export function canEditTasks(project: Project, userId: string): boolean {
  return hasRoleOrHigher(project, userId, "editor");
}

/**
 * Check if user can manage project (members, roles, settings)
 */
export function canManageProject(project: Project, userId: string): boolean {
  return project.ownerId === userId;
}

/**
 * Check if user can comment
 */
export function canComment(project: Project, userId: string): boolean {
  return hasRoleOrHigher(project, userId, "commenter");
}

/**
 * Check if user can delete/moderate content
 */
export function canModerate(project: Project, userId: string): boolean {
  return hasRoleOrHigher(project, userId, "editor");
}

/**
 * Get default role for new members
 */
export function getDefaultRole(): UserRole {
  return "editor";
}
