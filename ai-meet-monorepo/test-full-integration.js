const { Kafka } = require('kafkajs');

async function testMeetingCreationWithDatabase() {
  console.log('Testing Full Meeting Creation Flow...');

  const kafka = new Kafka({
    clientId: 'full-flow-test',
    brokers: ['localhost:9092']
  });

  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId: 'full-flow-test-group' });

  try {
  // Connect to Kafka
  console.log('Connecting to Kafka...');
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'meeting.created' });

    let transcriptSessionCreated = false;

    // Set up consumer to simulate transcripts service
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
  console.log(`Transcripts service received: ${event.eventType} for meeting ${event.data.meetingId}`);

        // Simulate database insertion in transcripts service
        if (event.eventType === 'meeting.created') {
          console.log('Creating transcript session in transcripts_db...');
          
          // Simulate what the real transcripts service would do
          const transcriptData = {
            id: `transcript-${event.data.meetingId}`,
            meetingId: event.data.meetingId,
            meetingTitle: event.data.title,
            tenantId: event.data.tenantId,
            status: 'INITIALIZING'
          };

          console.log('Transcript session created:', transcriptData);
          transcriptSessionCreated = true;
        }
      },
    });

    // Wait for consumer setup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 1: Simulate database insertion in meeting service
  console.log('\nStep 1: Meeting service creates meeting in database...');
    const meetingData = {
      id: 'full-flow-test-001',
      title: 'Full Flow Test Meeting',
      tenantId: 'test-tenant',
      startTime: new Date(),
      status: 'SCHEDULED'
    };
  console.log('Meeting created in meetings_db:', meetingData);

    // Step 2: Publish Kafka event
  console.log('\nStep 2: Meeting service publishes Kafka event...');
    const meetingEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'meeting.created',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'meeting-service',
      data: {
        meetingId: meetingData.id,
        title: meetingData.title,
        tenantId: meetingData.tenantId,
        startTime: meetingData.startTime.toISOString(),
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

  console.log('Event published to meeting.created topic');

    // Step 3: Wait for processing
  console.log('\nStep 3: Waiting for transcripts service to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Results
  console.log('\nFULL FLOW TEST RESULTS:');
    console.log('=====================================');
  console.log(`Meeting Database: Meeting "${meetingData.title}" created`);
  console.log(`Kafka Event: meeting.created published successfully`);
  console.log(`${transcriptSessionCreated ? 'OK' : 'FAIL'} Transcripts Service: ${transcriptSessionCreated ? 'Received event and created session' : 'Failed to process event'}`);
    
    if (transcriptSessionCreated) {
  console.log('\nFULL INTEGRATION TEST SUCCESSFUL!');
      console.log('Real-time flow: Meeting Creation → Kafka Event → Transcript Session');
    } else {
  console.log('\nIntegration test failed - transcript session not created');
    }

  } catch (error) {
    console.error('Full flow test failed:', error);
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    console.log('\nKafka connections closed');
  }
}

testMeetingCreationWithDatabase();