import { MongoClient } from 'mongodb';

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
  // Handle CORS preflight requests
  res.setHeader('Access-Control-Allow-Origin', '*'); // Restrict in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond to preflight
  }

  try {
    const requestBody = req.body || (await req.json());
    const { postId, userId, commentBody } = requestBody;

    if (!postId || !userId || !commentBody) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields' });
    }

    const db = await connectToDatabase();
    const commentsCollection = db.collection('Comments');

    const comment = {
      commentBody,
      postId,
      Author: { _id: userId },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await commentsCollection.insertOne(comment);

    if (result.insertedId) {
      return res
        .status(200)
        .json({ success: true, insertedId: result.insertedId });
    } else {
      return res
        .status(500)
        .json({ success: false, message: 'Failed to insert comment' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
