const { Kafka } = require('kafkajs');

async function testKafkaConnection() {
  console.log('Testing Kafka Connection...');

  // Create client with only localhost:9092
  const kafka = new Kafka({
    clientId: 'connection-test',
    brokers: ['localhost:9092']
  });

  const admin = kafka.admin();

  try {
  console.log('Connecting to Kafka admin...');
    await admin.connect();

  console.log('Listing topics...');
  const topics = await admin.listTopics();
  console.log('Available topics:', topics);

  console.log('Kafka connection successful!');
    
  // Test topic creation
  console.log('Creating test topic...');
    await admin.createTopics({
      topics: [{
        topic: 'test-connection',
        numPartitions: 1,
        replicationFactor: 1
      }]
    });
    
  console.log('Test topic created successfully!');
    
  } catch (error) {
    console.error('Kafka connection test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await admin.disconnect();
    console.log('Disconnected from Kafka admin');
  }
}

testKafkaConnection();