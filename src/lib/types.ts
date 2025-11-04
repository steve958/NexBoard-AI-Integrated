export type UserRole = "owner" | "editor" | "commenter";

export type Project = {
  projectId: string;
  name: string;
  ownerId: string;
  members: string[]; // UIDs
  roles?: { [uid: string]: UserRole }; // Map of user ID to role
  archived?: boolean;
  createdAt?: import("firebase/firestore").Timestamp | null;
};

export type Column = {
  columnId: string;
  name: string;
  order: number;
};

export type TokenScope = "tasks:read" | "tasks:write";

export type ApiToken = {
  tokenId: string;
  userId: string;
  label: string;
  scopes: TokenScope[];
  tokenHash: string;
  salt: string;
  createdAt: import("firebase/firestore").Timestamp;
  revokedAt?: import("firebase/firestore").Timestamp | null;
};
