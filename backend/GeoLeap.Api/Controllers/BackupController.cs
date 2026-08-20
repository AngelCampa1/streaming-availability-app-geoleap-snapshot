using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/backup")]
public class BackupController : ControllerBase
{
    private readonly IBackupService _backupService;
    private readonly ILogger<BackupController> _logger;

    public BackupController(IBackupService backupService, ILogger<BackupController> logger)
    {
        _backupService = backupService;
        _logger = logger;
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateBackup([FromBody] CreateBackupRequest request)
    {
        try
        {
            _logger.LogInformation("Creating backup requested");
            var result = await _backupService.CreateBackupAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create backup");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Backup creation failed" });
        }
    }

    [HttpPost("restore")]
    public async Task<IActionResult> RestoreBackup([FromBody] RestoreBackupRequest request)
    {
        try
        {
            _logger.LogInformation("Restoring from backup: {BackupId}", request.BackupId);
            var result = await _backupService.RestoreBackupAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore backup");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Backup restoration failed" });
        }
    }

    [HttpPost("schedule")]
    public async Task<IActionResult> ScheduleBackup([FromBody] ScheduleBackupRequest request)
    {
        try
        {
            _logger.LogInformation("Scheduling backup: {Name}", request.Name);
            var result = await _backupService.ScheduleBackupAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to schedule backup");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Backup scheduling failed" });
        }
    }

    [HttpPost("verify")]
    public async Task<IActionResult> VerifyBackup([FromBody] BackupVerificationRequest request)
    {
        try
        {
            _logger.LogInformation("Verifying backup: {BackupId}", request.BackupId);
            var result = await _backupService.VerifyBackupAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify backup");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Backup verification failed" });
        }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetBackupHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            _logger.LogInformation("Retrieving backup history");
            var result = await _backupService.GetBackupHistoryAsync(page, pageSize);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve backup history");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Failed to retrieve backup history" });
        }
    }

    [HttpPost("cleanup")]
    public async Task<IActionResult> CleanupBackups([FromBody] BackupCleanupRequest request)
    {
        try
        {
            _logger.LogInformation("Cleaning up old backups");
            var result = await _backupService.CleanupOldBackupsAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup backups");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Backup cleanup failed" });
        }
    }

    [HttpPost("configuration")]
    public async Task<IActionResult> BackupConfiguration([FromBody] ConfigurationBackupRequest request)
    {
        try
        {
            _logger.LogInformation("Backing up configuration");
            var result = await _backupService.BackupConfigurationAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to backup configuration");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Configuration backup failed" });
        }
    }

    [HttpPost("create-encrypted")]
    public async Task<IActionResult> CreateEncryptedBackup([FromBody] EncryptedBackupRequest request)
    {
        try
        {
            _logger.LogInformation("Creating encrypted backup");
            var result = await _backupService.CreateEncryptedBackupAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create encrypted backup");
            // FIXED: Round 15 - Don't expose internal error details to prevent information disclosure
            return StatusCode(500, new { message = "Encrypted backup creation failed" });
        }
    }
}