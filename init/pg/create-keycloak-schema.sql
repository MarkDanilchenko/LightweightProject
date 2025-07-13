create schema if not exists keycloak;

-- "guset" is the default user for keycloak defined in env;
grant all privileges on schema keycloak to guest;