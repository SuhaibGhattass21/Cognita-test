const { Kafka } = require('kafkajs');

async function testKafkaEventFlow() {
  console.log('🚀 Starting Kafka Event Flow Test...');

  const kafka = new Kafka({
    clientId: 'test-client',
    brokers: ['localhost:9092'],
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  });

  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId: 'test-group' });

  try {
    // Connect producer and consumer
    console.log('📡 Connecting to Kafka...');
    await producer.connect();
    await consumer.connect();

    // Subscribe to topics
    console.log('📮 Subscribing to topics...');
    await consumer.subscribe({ topics: ['meeting.created', 'meeting.ended', 'meeting.participant.joined'] });

    // Set up message handler
    let receivedMessages = [];
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
          value: JSON.parse(message.value.toString())
        };
        console.log(`📥 Received event:`, event);
        receivedMessages.push(event);
      },
    });

    // Wait a bit for consumer to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 1: Meeting Created Event
    console.log('\n🎯 Test 1: Producing Meeting Created Event...');
    const meetingCreatedEvent = {
      eventId: `test-event-${Date.now()}`,
      eventType: 'meeting.created',
      timestamp: new Date().toISOString(),
      tenantId: 'test-tenant',
      data: {
        meetingId: 'test-meeting-001',
        title: 'DevOps Testing Session',
        startTime: new Date().toISOString(),
        participants: [],
        metadata: {
          source: 'manual-test',
          environment: 'development'
        }
      }
    };

    await producer.send({
      topic: 'meeting.created',
      messages: [{
        key: meetingCreatedEvent.data.meetingId,
        value: JSON.stringify(meetingCreatedEvent)
      }]
    });

    // Test 2: Participant Joined Event
    console.log('\n🎯 Test 2: Producing Participant Joined Event...');
    const participantJoinedEvent = {
      eventId: `test-event-${Date.now()}`,
      eventType: 'meeting.participant.joined',
      timestamp: new Date().toISOString(),
      tenantId: 'test-tenant',
      data: {
        meetingId: 'test-meeting-001',
        participant: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        },
        joinedAt: new Date().toISOString()
      }
    };

    await producer.send({
      topic: 'meeting.participant.joined',
      messages: [{
        key: participantJoinedEvent.data.meetingId,
        value: JSON.stringify(participantJoinedEvent)
      }]
    });

    // Test 3: Meeting Ended Event
    console.log('\n🎯 Test 3: Producing Meeting Ended Event...');
    const meetingEndedEvent = {
      eventId: `test-event-${Date.now()}`,
      eventType: 'meeting.ended',
      timestamp: new Date().toISOString(),
      tenantId: 'test-tenant',
      data: {
        meetingId: 'test-meeting-001',
        endTime: new Date().toISOString(),
        duration: 1800, // 30 minutes
        summary: {
          participantCount: 1,
          recordingGenerated: false
        }
      }
    };

    await producer.send({
      topic: 'meeting.ended',
      messages: [{
        key: meetingEndedEvent.data.meetingId,
        value: JSON.stringify(meetingEndedEvent)
      }]
    });

    // Wait for messages to be processed
    console.log('\n⏳ Waiting for message processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Results
    console.log('\n📊 Test Results:');
    console.log(`✅ Events produced: 3`);
    console.log(`📥 Events received: ${receivedMessages.length}`);
    
    if (receivedMessages.length > 0) {
      console.log('\n📋 Received Events Summary:');
      receivedMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. Topic: ${msg.topic}, EventType: ${msg.value.eventType}, MeetingId: ${msg.value.data.meetingId}`);
      });
    }

    console.log('\n✅ Kafka Event Flow Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Kafka Event Flow Test Failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up connections...');
    await consumer.disconnect();
    await producer.disconnect();
    process.exit(0);
  }
}

// Run the test
testKafkaEventFlow().catch(console.error);