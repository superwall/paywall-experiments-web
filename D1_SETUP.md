# D1 Database Setup Instructions

## Step 1: Create the D1 Database

Run this command to create a new D1 database:

```bash
wrangler d1 create paywall-experiments-db
```

This will output something like:

```
✅ Successfully created DB 'paywall-experiments-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "paywall-experiments-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 2: Update wrangler.toml

Copy the `database_id` from the output above and replace `YOUR_DATABASE_ID_HERE` in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "paywall-experiments-db"
database_id = "your-actual-database-id-here"
```

## Step 3: Run the Migrations

Run the migrations to create the tables:

```bash
# Create emails table
wrangler d1 execute paywall-experiments-db --file=./migrations/0001_create_emails.sql

# Create generations table
wrangler d1 execute paywall-experiments-db --file=./migrations/0002_create_generations.sql
```

Or for remote (production) database:

```bash
# Create emails table
wrangler d1 execute paywall-experiments-db --remote --file=./migrations/0001_create_emails.sql

# Create generations table
wrangler d1 execute paywall-experiments-db --remote --file=./migrations/0002_create_generations.sql
```

## Step 4: Verify the Migrations

Check that the tables were created:

```bash
wrangler d1 execute paywall-experiments-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

You should see both the `emails` and `generations` tables listed.

## Step 5: Deploy

Once the database is set up, you can deploy:

```bash
bun run deploy
```

## Querying Data

### Querying Emails

You can query emails using wrangler:

```bash
# Get all emails
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM emails ORDER BY created_at DESC LIMIT 10;"

# Get emails for a specific slug
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM emails WHERE slug = 'your-slug-here';"

# Count total emails
wrangler d1 execute paywall-experiments-db --command="SELECT COUNT(*) as count FROM emails;"
```

### Querying Generations

You can query generations (every AI generation is stored here with the prompt and output):

```bash
# Get all generations
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM generations ORDER BY created_at DESC LIMIT 10;"

# Get generations for a specific slug
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM generations WHERE slug = 'your-slug-here';"

# Get generations with email addresses
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM generations WHERE email IS NOT NULL ORDER BY created_at DESC LIMIT 10;"

# Count total generations
wrangler d1 execute paywall-experiments-db --command="SELECT COUNT(*) as count FROM generations;"
```

## Exporting Data

To export data as JSON:

```bash
# Export emails
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM emails;" --json > emails.json

# Export generations
wrangler d1 execute paywall-experiments-db --command="SELECT * FROM generations;" --json > generations.json
```
