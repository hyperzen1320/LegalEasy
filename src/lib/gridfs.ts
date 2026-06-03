import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

// GridFS bucket for case-document binaries. We reach the driver through
// `mongoose.mongo` (the bundled mongodb package) so there's no separate
// "mongodb" dependency to keep in sync with mongoose's own.
const BUCKET_NAME = "case_documents";

export async function getDocsBucket(): Promise<
  InstanceType<typeof mongoose.mongo.GridFSBucket>
> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not ready for GridFS.");
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}
