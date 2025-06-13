import { DataSource, DataSourceOptions } from "typeorm";
import appConfiguration from "./app.configuration";

const dataSourceConfiguration = appConfiguration().dbConfiguration;

export const dataSource = new DataSource(dataSourceConfiguration as DataSourceOptions);
