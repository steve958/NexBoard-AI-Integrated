import { describe, it, expect } from "vitest";
import { getUserRole, hasRoleOrHigher, canEditTasks, canComment, canModerate, canManageProject } from "../../src/lib/roles";
import type { Project } from "../../src/lib/types";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    projectId: "p1",
    name: "Test",
    ownerId: "owner-uid",
    members: ["owner-uid", "editor-uid", "commenter-uid"],
    roles: {
      "editor-uid": "editor",
      "commenter-uid": "commenter",
    },
    ...overrides,
  };
}

describe("roles", () => {
  const project = makeProject();

  describe("getUserRole", () => {
    it("returns owner for project owner", () => {
      expect(getUserRole(project, "owner-uid")).toBe("owner");
    });
    it("returns editor for editor member", () => {
      expect(getUserRole(project, "editor-uid")).toBe("editor");
    });
    it("returns commenter for commenter member", () => {
      expect(getUserRole(project, "commenter-uid")).toBe("commenter");
    });
    it("returns null for unknown user", () => {
      expect(getUserRole(project, "stranger")).toBeNull();
    });
  });

  describe("hasRoleOrHigher", () => {
    it("owner satisfies all role levels", () => {
      expect(hasRoleOrHigher(project, "owner-uid", "commenter")).toBe(true);
      expect(hasRoleOrHigher(project, "owner-uid", "editor")).toBe(true);
      expect(hasRoleOrHigher(project, "owner-uid", "owner")).toBe(true);
    });
    it("editor satisfies editor and commenter", () => {
      expect(hasRoleOrHigher(project, "editor-uid", "commenter")).toBe(true);
      expect(hasRoleOrHigher(project, "editor-uid", "editor")).toBe(true);
      expect(hasRoleOrHigher(project, "editor-uid", "owner")).toBe(false);
    });
    it("commenter satisfies only commenter", () => {
      expect(hasRoleOrHigher(project, "commenter-uid", "commenter")).toBe(true);
      expect(hasRoleOrHigher(project, "commenter-uid", "editor")).toBe(false);
    });
  });

  describe("permission helpers", () => {
    it("canEditTasks is true for owner and editor", () => {
      expect(canEditTasks(project, "owner-uid")).toBe(true);
      expect(canEditTasks(project, "editor-uid")).toBe(true);
      expect(canEditTasks(project, "commenter-uid")).toBe(false);
    });
    it("canComment is true for all roles", () => {
      expect(canComment(project, "owner-uid")).toBe(true);
      expect(canComment(project, "commenter-uid")).toBe(true);
    });
    it("canModerate requires at least editor", () => {
      expect(canModerate(project, "editor-uid")).toBe(true);
      expect(canModerate(project, "commenter-uid")).toBe(false);
    });
    it("canManageProject is owner-only", () => {
      expect(canManageProject(project, "owner-uid")).toBe(true);
      expect(canManageProject(project, "editor-uid")).toBe(false);
    });
  });
});
