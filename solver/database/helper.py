import os
from typing import Any

import pandas as pd
import numpy as np
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv


def create_connection():

	load_dotenv()

	conn = psycopg2.connect(
		host=os.getenv("NEON_HOST"),
		port=os.getenv("NEON_PORT", 5432),
		database=os.getenv("NEON_DATABASE"),
		user=os.getenv("NEON_USER"),
		password=os.getenv("NEON_PASSWORD"),
		sslmode="require"
	)
	return conn


def fetch_data(
	sql: str,
	connection=None
) -> pd.DataFrame:

	close_conn = False

	if connection is None:
		connection = create_connection()
		close_conn = True

	try:

		df = pd.read_sql_query(
			sql,
			connection
		)

		return df

	finally:

		if close_conn:
			connection.close()


def _get_table_metadata(
	full_table_path: str,
	connection=None
):

	database_name, schema_name, table_name = full_table_path.lower().split(".")

	sql = f"""
        SELECT
            column_name,
            data_type
            FROM information_schema.columns
        WHERE 
            table_catalog = '{database_name}'
            AND table_schema = '{schema_name}'
            AND table_name = '{table_name}'
        ORDER BY ordinal_position
    """

	return fetch_data(
		sql,
		connection
	)


def _convert_series(
    series: pd.Series,
    postgres_type: str
):

    if postgres_type in (
        "integer",
        "smallint",
        "bigint"
    ):
        return pd.to_numeric(
            series,
            errors="coerce"
        ).astype("Int64")

    elif postgres_type in (
        "numeric",
        "decimal",
        "double precision",
        "real"
    ):
        return pd.to_numeric(
            series,
            errors="coerce"
        )

    elif postgres_type in (
        "date"
    ):
        return pd.to_datetime(
            series,
            errors="coerce"
        ).dt.date

    elif postgres_type in (
        "timestamp without time zone",
        "timestamp with time zone"
    ):
        return pd.to_datetime(
            series,
            errors="coerce"
        )

    elif postgres_type == "boolean":

        mapping = {
            "true": True,
            "false": False,
            "1": True,
            "0": False
        }

        return (
            series.astype(str)
            .str.lower()
            .map(mapping)
        )

    return series


def convert_datatype(
    full_table_path: str,
    dataframe: pd.DataFrame,
    connection=None
):

    df = dataframe.copy()

    metadata = _get_table_metadata(
        full_table_path,
        connection
    )

    metadata_map = dict(
        zip(
            metadata["column_name"],
            metadata["data_type"]
        )
    )

    for col in df.columns:

        if col not in metadata_map:
            continue

        df[col] = _convert_series(
            df[col],
            metadata_map[col]
        )

    return df



def insert_data(
    full_table_path: str,
    dataframe: pd.DataFrame
):

    conn = create_connection()

    try:

        df = convert_datatype(
            full_table_path=full_table_path,
            dataframe=dataframe,
            connection=conn
        )

        columns = list(df.columns)

        insert_sql = f"""
        INSERT INTO {full_table_path}
        ({",".join(columns)})
        VALUES %s
        """

        success_count = 0

        error_rows = []

        cursor = conn.cursor()

        for idx, row in df.iterrows():

            try:

                extras.execute_values(
                    cursor,
                    insert_sql,
                    [tuple(row)]
                )

                success_count += 1

            except Exception as ex:

                error_rows.append({
                    "row_number": idx,
                    "error": str(ex),
                    "record": row.to_dict()
                })

                conn.rollback()

        conn.commit()

        error_df = pd.DataFrame(error_rows)

        return (
            success_count,
            len(error_rows),
            error_df
        )

    finally:
        conn.close()


def execute_update(
    table_path: str,
    update_df: pd.DataFrame,
    update_columns: list[str],
    where_columns: list[str]
):

    conn = create_connection()

    try:

        df = convert_datatype(
            full_table_path=table_path,
            dataframe=update_df,
            connection=conn
        )

        cursor = conn.cursor()

        success = 0
        errors = []

        for idx, row in df.iterrows():

            try:

                set_clause = ", ".join(
                    [
                        f"{col} = %s"
                        for col in update_columns
                    ]
                )

                where_clause = " AND ".join(
                    [
                        f"{col} = %s"
                        for col in where_columns
                    ]
                )

                sql = f"""
                UPDATE {table_path}
                SET {set_clause}
                WHERE {where_clause}
                """

                values = (
                    [row[col] for col in update_columns]
                    +
                    [row[col] for col in where_columns]
                )

                cursor.execute(
                    sql,
                    values
                )

                success += 1

            except Exception as ex:

                errors.append({
                    "row_number": idx,
                    "error": str(ex)
                })

                conn.rollback()

        conn.commit()

        return (
            success,
            len(errors),
            pd.DataFrame(errors)
        )

    finally:

        conn.close()


if __name__=='__main__':
    
    conn = create_connection()
    print(fetch_data("select * from inventory_management.PUBLIC.item_master", connection=conn))
    