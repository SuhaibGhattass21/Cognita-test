-- Test insertion for pgAdmin verification
INSERT INTO meetings (id, title, "startTime", "tenantId", "updatedAt") 
VALUES ('pgadmin-test-001', 'pgAdmin Test Meeting', NOW(), 'test-tenant', NOW());

-- Verify the insertion
SELECT id, title, "startTime", "tenantId", "createdAt" FROM meetings WHERE id = 'pgadmin-test-001';