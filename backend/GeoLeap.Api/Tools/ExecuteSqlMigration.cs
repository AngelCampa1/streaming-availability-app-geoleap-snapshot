// SQL Migration Executor - Runs raw SQL migration files
// Usage: dotnet run --project GeoLeap.Api -- migrate Migrations/20250113_AddPerformanceIndexes.sql

using System;
using System.IO;
using System.Threading.Tasks;
using Npgsql;

namespace GeoLeap.Api.Tools
{
    public class ExecuteSqlMigration
    {
        public static async Task Main(string[] args)
        {
            if (args.Length < 2 || args[0] != "migrate")
            {
                Console.WriteLine("Usage: dotnet run --project GeoLeap.Api -- migrate <sql-file-path>");
                return;
            }

            string sqlFilePath = args[1];

            if (!File.Exists(sqlFilePath))
            {
                Console.Error.WriteLine($"Error: File not found: {sqlFilePath}");
                return;
            }

            // CRITICAL FIX: Use environment variable instead of hardcoded credentials
            string connectionString = Environment.GetEnvironmentVariable("GEOLEAP_MIGRATION_CONNECTION_STRING")
                ?? throw new InvalidOperationException("GEOLEAP_MIGRATION_CONNECTION_STRING environment variable must be set for migrations");

            try
            {
                Console.WriteLine($"Reading SQL file: {sqlFilePath}");
                string sqlContent = await File.ReadAllTextAsync(sqlFilePath);

                Console.WriteLine($"Connecting to database...");

                using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                Console.WriteLine("Connected successfully");
                Console.WriteLine("Executing migration...\n");

                try
                {
                    using var command = new NpgsqlCommand(sqlContent, connection);
                    command.CommandTimeout = 300; // 5 minutes timeout

                    await command.ExecuteNonQueryAsync();
                    Console.WriteLine("Migration executed successfully");
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Error executing migration: {ex.Message}");
                    throw;
                }

                Console.WriteLine($"\nMigration completed successfully!");

                // Verify indexes were created
                Console.WriteLine("\nVerifying indexes...");
                using var verifyCommand = new NpgsqlCommand(@"
                    SELECT
                        indexname AS index_name,
                        tablename AS table_name
                    FROM pg_indexes
                    WHERE schemaname = 'public'
                    AND indexname LIKE 'ix_%'
                    ORDER BY tablename, indexname
                ", connection);

                using var reader = await verifyCommand.ExecuteReaderAsync();
                int indexCount = 0;

                while (await reader.ReadAsync())
                {
                    indexCount++;
                    Console.WriteLine($"  {indexCount}. {reader["table_name"]}.{reader["index_name"]}");
                }

                Console.WriteLine($"\nTotal indexes verified: {indexCount}");

            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"\nMigration failed: {ex.Message}");
                Console.Error.WriteLine(ex.StackTrace);
                Environment.Exit(1);
            }
        }
    }
}
