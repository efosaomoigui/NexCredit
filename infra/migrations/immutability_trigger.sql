-- Enforce Audit Log Immutability
-- Blocks all UPDATE and DELETE operations on the audit_logs table

CREATE OR REPLACE FUNCTION block_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Modification of audit_logs is strictly prohibited by NexCredit Compliance Engine';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_audit_log_updates
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION block_audit_log_modification();
