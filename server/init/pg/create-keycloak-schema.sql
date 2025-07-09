create schema if not exists keycloak;

-- "guset" is the default user for keycloak from .env.public:KC_DB_USERNAME
grant all privileges on schema keycloak to guest;