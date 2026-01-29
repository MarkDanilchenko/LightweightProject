import { DataSource, DataSourceOptions } from "typeorm";
import appConfiguration from "./app.configuration";

/**
 * This is a singleton data source, that can be used to share the same database connection
 * across different parts of the application.
 *
 * The same data source instance is used to create repositories and perform database operations.
 * However, it is not used directly across the application, instead it is used by TypeORM modules in its inner logic.
 */
export default new DataSource(appConfiguration().dbConfiguration as DataSourceOptions);
