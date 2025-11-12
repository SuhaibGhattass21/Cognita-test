import { Kafka } from 'kafkajs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testMeetingEventFlow() {
  console.log('Testing Meeting -> Transcripts Event Flow...');

  const kafka = new Kafka({
    clientId: 'event-flow-test',
    brokers: ['localhost:9092']
  });

  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId: 'transcript-test-group' });

  try {
  // Connect
  console.log('Connecting to Kafka...');
    await producer.connect();
    await consumer.connect();

  // Subscribe to meeting events
  console.log('Setting up consumer for meeting events...');
    await consumer.subscribe({ topic: 'meeting.created' });

    // Set up message handler
    let eventReceived = false;
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
  console.log(`Transcripts service received event:`, {
          topic,
          eventType: event.eventType,
          meetingId: event.data?.meetingId,
          meetingTitle: event.data?.title
        });

  // Simulate transcript session creation
  console.log('Creating transcript session for meeting:', event.data?.meetingId);
        eventReceived = true;
      },
    });

    // Wait for consumer to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate meeting service producing event
  console.log('Meeting service: Creating new meeting...');
    const meetingEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'meeting.created',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'meeting-service',
      data: {
        meetingId: 'test-meeting-kafka-001',
        title: 'Event Flow Test Meeting',
        tenantId: 'test-tenant',
        startTime: new Date().toISOString(),
        participants: []
      }
    };

    await producer.send({
      topic: 'meeting.created',
      messages: [{
        key: meetingEvent.data.meetingId,
        value: JSON.stringify(meetingEvent)
      }]
    });

  console.log('Meeting event published successfully');

  // Wait for event processing
  console.log('Waiting for transcript service to process event...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (eventReceived) {
  console.log('EVENT FLOW TEST SUCCESSFUL!');
  console.log('Summary:');
      console.log('  - Meeting service published meeting.created event');
      console.log('  - Transcripts service received and processed event');
      console.log('  - Real-time event flow working correctly');
    } else {
  console.log('EVENT FLOW TEST FAILED!');
      console.log('  - Event was published but not received by consumer');
    }

  } catch (error) {
    console.error('Event flow test failed:', error);
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    console.log('Kafka connections closed');
  }
}

testMeetingEventFlow();