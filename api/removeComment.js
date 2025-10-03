import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (!client.isConnected?.()) {
    await client.connect();
  }
  cachedDb = client.db('InstaClone');
  return cachedDb;
}

export default async function handler(req, res) {
  // Obsługa CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { commentId, userId } = req.body;

    if (!commentId || !userId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing parameters' });
    }

    const db = await connectToDatabase();
    const commentsCollection = db.collection('Comments');

    const comment = await commentsCollection.findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: 'Comment not found' });
    if (comment.Author._id !== userId)
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized' });

    const deleteResult = await commentsCollection.deleteOne({
      _id: new ObjectId(commentId),
    });

    if (deleteResult.deletedCount === 1) {
      return res.status(200).json({ success: true, deletedId: commentId });
    } else {
      return res
        .status(500)
        .json({ success: false, message: 'Failed to delete comment' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
