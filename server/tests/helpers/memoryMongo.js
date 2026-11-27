import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function createTestMongo() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  if (!replSet.getUri().includes('replicaSet=')) throw new Error('createTestMongo must start a replica set');
  return replSet;
}

export { createTestMongo };
