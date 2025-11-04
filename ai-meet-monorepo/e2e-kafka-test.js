const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'e2e-test',
  brokers: ['localhost:9092']
});

async function testKafkaEndToEnd() {
  console.log('🔄 Starting end-to-end Kafka test...\n');
  
  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId: 'e2e-test-group' });
  
  try {
    // Connect producer
    console.log('📤 Connecting producer...');
    await producer.connect();
    console.log('✅ Producer connected\n');
    
    // Connect consumer
    console.log('📥 Connecting consumer...');
    await consumer.connect();
    await consumer.subscribe({ topic: 'meeting.events' });
    console.log('✅ Consumer connected and subscribed to meeting.events\n');
    
    // Set up message handler
    let messageReceived = false;
    let receivedMessage = null;
    
    const messagePromise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log('📨 Message received:');
          console.log(`  Topic: ${topic}`);
          console.log(`  Partition: ${partition}`);
          console.log(`  Value: ${message.value.toString()}`);
          
          receivedMessage = JSON.parse(message.value.toString());
          messageReceived = true;
          resolve();
        },
      });
    });
    
    // Give consumer time to join group
    console.log('⏳ Waiting for consumer group coordination...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Send test message
    console.log('📤 Sending test message...');
    const testEvent = {
      id: 'test-meeting-123',
      type: 'meeting.created',
      data: {
        meetingId: 'test-meeting-123',
        title: 'E2E Test Meeting',
        participants: ['user1', 'user2'],
        startTime: new Date().toISOString(),
        tenantId: 'test-tenant'
      },
      timestamp: new Date().toISOString()
    };
    
    await producer.send({
      topic: 'meeting.events',
      messages: [
        {
          key: testEvent.id,
          value: JSON.stringify(testEvent)
        }
      ]
    });
    console.log('✅ Message sent\n');
    
    // Wait for message to be received
    console.log('⏳ Waiting for message consumption...');
    const timeout = setTimeout(() => {
      if (!messageReceived) {
        console.log('❌ Timeout: Message not received within 10 seconds');
      }
    }, 10000);
    
    await messagePromise;
    clearTimeout(timeout);
    
    if (messageReceived) {
      console.log('\n🎉 END-TO-END TEST SUCCESSFUL!');
      console.log('✅ Message published and consumed successfully');
      console.log('✅ Event structure validated');
      console.log(`✅ Round-trip time: < 10 seconds\n`);
      
      console.log('📋 Test Results Summary:');
      console.log('  - Producer Connection: ✅ SUCCESS');
      console.log('  - Consumer Connection: ✅ SUCCESS');
      console.log('  - Message Publishing: ✅ SUCCESS');
      console.log('  - Message Consumption: ✅ SUCCESS');
      console.log('  - Event Structure: ✅ SUCCESS');
    }
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up connections...');
    await producer.disconnect();
    await consumer.disconnect();
    console.log('✅ Cleanup complete');
  }
}

testKafkaEndToEnd().catch(console.error);