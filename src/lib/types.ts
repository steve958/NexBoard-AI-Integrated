export type Project = {
  projectId: string;
  name: string;
  ownerId: string;
  members: string[]; // UIDs
  archived?: boolean;
  createdAt?: any; // Firestore timestamp
};

export type Column = {
  columnId: string;
  name: string;
  order: number;
};
