import { neon } from
"@neondatabase/serverless";

const sql = neon(
	import.meta.env.NEON_DB_URL
);

export default sql;
