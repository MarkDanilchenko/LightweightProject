-- Create Keycloak schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS keycloak;

-- Grant all privileges on the keycloak schema to the admin user
-- Note: "admin" is the default user for Keycloak defined in environment variables
GRANT ALL PRIVILEGES
    ON SCHEMA keycloak
    TO admin;
