using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Extensions;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

// SECURED: Week 1 Day 2 - Test endpoints only available in DEBUG builds
#if DEBUG
[ApiController]
[Route("api/test")]
[Authorize(Roles = "Admin")] // Require Admin role even in DEBUG
public class TestController : ControllerBase
{
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
    
    [HttpPost("echo")]
    [AllowAnonymous]
    public IActionResult Echo([FromBody] object? data)
    {
        return Ok(new { echo = data, timestamp = DateTime.UtcNow });
    }

    [HttpGet("data")]
    [AllowAnonymous]
    public IActionResult GetTestData()
    {
        return Ok(new { 
            message = "Test data", 
            timestamp = DateTime.UtcNow,
            items = new[] { "item1", "item2", "item3" }
        });
    }

    [HttpGet("status")]
    [AllowAnonymous]
    public IActionResult GetStatus()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }

    [HttpPost("validate")]
    [AllowAnonymous]
    public IActionResult ValidateData([FromBody] TestValidationModel? model)
    {
        if (model == null)
        {
            return this.StandardBadRequest("Model cannot be null");
        }

        if (!ModelState.IsValid)
        {
            return this.StandardBadRequest("Invalid model");
        }

        return Ok(new { 
            message = "Validation successful", 
            data = model,
            timestamp = DateTime.UtcNow 
        });
    }
}

public class TestValidationModel
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Range(0, 150)]
    public int Age { get; set; }
}
#endif // DEBUG - Test controller only available in debug builds