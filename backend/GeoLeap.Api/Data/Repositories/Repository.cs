using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Generic repository implementation for Entity Framework
/// </summary>
/// <typeparam name="TEntity">The entity type</typeparam>
/// <typeparam name="TKey">The primary key type</typeparam>
public class Repository<TEntity, TKey> : IRepository<TEntity, TKey> where TEntity : class
{
    protected readonly ApplicationDbContext _context;
    protected readonly DbSet<TEntity> _dbSet;

    public Repository(ApplicationDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _dbSet = context.Set<TEntity>();
    }

    public virtual async Task<TEntity?> GetByIdAsync(TKey id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id! }, cancellationToken);
    }

    public virtual async Task<TEntity?> GetAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public virtual async Task<IEnumerable<TEntity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.ToListAsync(cancellationToken);
    }

    public virtual async Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.Where(predicate).ToListAsync(cancellationToken);
    }

    public virtual async Task<bool> ExistsAsync(TKey id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id! }, cancellationToken) != null;
    }

    public virtual async Task<bool> ExistsAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(predicate, cancellationToken);
    }

    public virtual async Task<int> CountAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.CountAsync(cancellationToken);
    }

    public virtual async Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.CountAsync(predicate, cancellationToken);
    }

    public virtual async Task<(IEnumerable<TEntity> Items, int TotalCount)> GetPagedAsync(
        int page, 
        int pageSize, 
        Expression<Func<TEntity, bool>>? filter = null,
        Expression<Func<TEntity, object>>? orderBy = null,
        bool orderByDescending = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsQueryable();

        if (filter != null)
            query = query.Where(filter);

        var totalCount = await query.CountAsync(cancellationToken);

        if (orderBy != null)
        {
            query = orderByDescending 
                ? query.OrderByDescending(orderBy) 
                : query.OrderBy(orderBy);
        }

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public virtual async Task<TEntity> AddAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        var entry = await _dbSet.AddAsync(entity, cancellationToken);
        return entry.Entity;
    }

    public virtual async Task<IEnumerable<TEntity>> AddRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
    {
        var entityList = entities.ToList();
        await _dbSet.AddRangeAsync(entityList, cancellationToken);
        return entityList;
    }

    public virtual Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public virtual Task UpdateRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
    {
        _dbSet.UpdateRange(entities);
        return Task.CompletedTask;
    }

    public virtual async Task DeleteAsync(TKey id, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity != null)
        {
            _dbSet.Remove(entity);
        }
    }

    public virtual Task DeleteAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }

    public virtual Task DeleteRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
    {
        _dbSet.RemoveRange(entities);
        return Task.CompletedTask;
    }

    public virtual async Task DeleteRangeAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        var entities = await FindAsync(predicate, cancellationToken);
        _dbSet.RemoveRange(entities);
    }

    public virtual async Task<TResult?> GetProjectedAsync<TResult>(
        Expression<Func<TEntity, bool>> predicate,
        Expression<Func<TEntity, TResult>> projection,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(predicate)
            .Select(projection)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public virtual async Task<IEnumerable<TResult>> GetProjectedAsync<TResult>(
        Expression<Func<TEntity, TResult>> projection,
        Expression<Func<TEntity, bool>>? filter = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsQueryable();
        
        if (filter != null)
            query = query.Where(filter);

        return await query.Select(projection).ToListAsync(cancellationToken);
    }

    public virtual async Task<int> BulkUpdateAsync(
        Expression<Func<TEntity, bool>> predicate,
        Expression<Func<TEntity, TEntity>> updateExpression,
        CancellationToken cancellationToken = default)
    {
        // Note: This is a basic implementation. For production use, consider EF Core Extensions
        var entities = await FindAsync(predicate, cancellationToken);
        var entityList = entities.ToList();
        
        foreach (var entity in entityList)
        {
            var compiled = updateExpression.Compile();
            var updated = compiled(entity);
            _context.Entry(entity).CurrentValues.SetValues(updated);
        }

        return entityList.Count;
    }

    public virtual async Task<int> BulkDeleteAsync(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        var entities = await FindAsync(predicate, cancellationToken);
        var entityList = entities.ToList();
        _dbSet.RemoveRange(entityList);
        return entityList.Count;
    }

    /// <summary>
    /// Executes raw SQL query and returns entities.
    /// SECURITY WARNING: Only use with compile-time SQL constants or properly parameterized queries.
    /// Never pass user input directly to the sql parameter.
    /// </summary>
    /// <param name="sql">SQL query - MUST be from trusted source (compile-time constant or stored procedure name)</param>
    /// <param name="parameters">Parameters for the query - use these for ALL user input</param>
    /// <exception cref="ArgumentException">Thrown if SQL contains potentially dangerous patterns</exception>
    public virtual async Task<IEnumerable<TEntity>> FromSqlAsync(
        string sql,
        params object[] parameters)
    {
        // SQL Injection Protection: Validate SQL doesn't contain user-controllable dynamic SQL patterns
        ValidateSqlSecurity(sql, nameof(FromSqlAsync));

        return await _dbSet.FromSqlRaw(sql, parameters).ToListAsync();
    }

    /// <summary>
    /// Executes raw SQL command (INSERT, UPDATE, DELETE).
    /// SECURITY WARNING: Only use with compile-time SQL constants or properly parameterized queries.
    /// Never pass user input directly to the sql parameter.
    /// </summary>
    /// <param name="sql">SQL command - MUST be from trusted source (compile-time constant or stored procedure name)</param>
    /// <param name="parameters">Parameters for the command - use these for ALL user input</param>
    /// <exception cref="ArgumentException">Thrown if SQL contains potentially dangerous patterns</exception>
    public virtual async Task<int> ExecuteSqlAsync(
        string sql,
        params object[] parameters)
    {
        // SQL Injection Protection: Validate SQL doesn't contain user-controllable dynamic SQL patterns
        ValidateSqlSecurity(sql, nameof(ExecuteSqlAsync));

        return await _context.Database.ExecuteSqlRawAsync(sql, parameters);
    }

    /// <summary>
    /// Validates that SQL query doesn't contain potentially dangerous patterns that could indicate SQL injection.
    /// This is a defense-in-depth measure - the primary protection is using parameterized queries.
    /// SECURITY FIX: Enhanced pattern detection and removed duplicate patterns
    /// </summary>
    private void ValidateSqlSecurity(string sql, string methodName)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            throw new ArgumentException("SQL cannot be null or empty", nameof(sql));
        }

        // SECURITY FIX: Added input length validation to prevent DOS attacks
        const int MaxSqlLength = 10000;
        if (sql.Length > MaxSqlLength)
        {
            throw new ArgumentException($"SQL exceeds maximum allowed length of {MaxSqlLength} characters", nameof(sql));
        }

        // SECURITY FIX: Enhanced dangerous patterns list (removed duplicate, added new patterns)
        var dangerousPatterns = new[]
        {
            // String concatenation patterns
            "'+",              // String concatenation in SQL
            "||",              // Oracle/PostgreSQL concatenation
            "CONCAT(",         // Dynamic concatenation function

            // Dynamic execution patterns
            "EXEC(",           // Dynamic execution
            "EXECUTE(",        // Dynamic execution
            "sp_executesql",   // Dynamic SQL execution

            // Extended stored procedure attacks
            "xp_cmdshell",     // Command shell execution
            "xp_regread",      // Registry access
            "xp_regwrite",     // Registry modification
            "xp_servicecontrol", // Service control
            "xp_",             // Any extended stored procedure

            // File system attacks
            "INTO OUTFILE",    // MySQL file write
            "INTO DUMPFILE",   // MySQL file write
            "LOAD_FILE(",      // MySQL file read
            "BULK INSERT",     // SQL Server file import
            "OPENROWSET",      // SQL Server remote data access
            "OPENDATASOURCE",  // SQL Server remote data access

            // SQL injection patterns
            "UNION SELECT",    // Union-based injection
            "UNION ALL SELECT", // Union-based injection
            ";--",             // Comment-based injection
            "/*",              // Block comment (can hide malicious code)

            // Information disclosure
            "INFORMATION_SCHEMA", // Schema enumeration
            "sysobjects",      // SQL Server system tables
            "syscolumns",      // SQL Server system tables

            // Time-based attacks
            "WAITFOR DELAY",   // SQL Server time delay
            "BENCHMARK(",      // MySQL time delay
            "SLEEP(",          // MySQL time delay
            "pg_sleep(",       // PostgreSQL time delay
        };

        foreach (var pattern in dangerousPatterns)
        {
            if (sql.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            {
                var errorMessage = $"Potentially unsafe SQL detected in {methodName}. " +
                    $"SQL contains '{pattern}' which may indicate SQL injection risk. " +
                    "Use parameterized queries instead. " +
                    "If this is a legitimate stored procedure call, ensure the procedure name is a compile-time constant.";

                // Log the security violation
                // Note: Don't log the actual SQL as it might contain sensitive data
                System.Diagnostics.Debug.WriteLine($"SECURITY: SQL Injection attempt blocked in {methodName}");
                throw new ArgumentException(errorMessage, nameof(sql));
            }
        }

        // Additional validation: Warn about missing parameters when SQL contains WHERE clauses
        if (sql.Contains("WHERE", StringComparison.OrdinalIgnoreCase) &&
            !sql.Contains("@", StringComparison.Ordinal) &&
            !sql.Contains("?", StringComparison.Ordinal))
        {
            // This might be acceptable for static queries, but log a warning
            // In production, consider injecting ILogger to log this
            System.Diagnostics.Debug.WriteLine(
                $"WARNING: {methodName} called with WHERE clause but no parameters. " +
                "Ensure this is intentional and not missing parameterization.");
        }
    }

    public virtual async Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> operation)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var result = await operation();
            await transaction.CommitAsync();
            return result;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}