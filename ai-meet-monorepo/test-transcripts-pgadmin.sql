-- Test insertion for transcripts database
INSERT INTO transcript_sessions (id, "meetingId", "meetingTitle", "tenantId", "updatedAt") 
VALUES ('pgadmin-transcript-001', 'pgadmin-test-001', 'pgAdmin Test Meeting Transcript', 'test-tenant', NOW());

-- Verify the insertion
SELECT id, "meetingId", "meetingTitle", "tenantId", "createdAt" FROM transcript_sessions WHERE id = 'pgadmin-transcript-001';