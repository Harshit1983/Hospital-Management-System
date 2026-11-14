const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  // If MONGODB_URI is provided and not pointing to in-memory, use it, else use MongoMemoryServer
  if (process.env.TEST_USE_LOCAL_MONGO === 'true') {
    await mongoose.connect('mongodb://127.0.0.1:27017/hospital_management_test');
  } else {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
    } catch (err) {
      console.warn('MongoMemoryServer fallback to local MongoDB:', err.message);
      await mongoose.connect('mongodb://127.0.0.1:27017/hospital_management_test');
    }
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clear all collections between test cases
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

