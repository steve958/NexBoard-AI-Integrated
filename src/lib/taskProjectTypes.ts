export type TaskProject = {
  projectId: string;
  name: string;
  color?: string;
  userId: string; // owner of the project
  createdAt?: import("firebase/firestore").Timestamp | null;
  updatedAt?: import("firebase/firestore").Timestamp | null;
};
