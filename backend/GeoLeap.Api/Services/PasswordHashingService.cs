using BC = BCrypt.Net.BCrypt;

namespace GeoLeap.Api.Services;

public interface IPasswordHashingService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}

public class PasswordHashingService : IPasswordHashingService
{
    private const int WorkFactor = 12; // BCrypt work factor (cost)

    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password cannot be null or empty", nameof(password));

        return BC.HashPassword(password, WorkFactor);
    }

    public bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;
        
        if (string.IsNullOrWhiteSpace(hash))
            return false;

        try
        {
            return BC.Verify(password, hash);
        }
        catch
        {
            // Log the exception in a real application
            return false;
        }
    }
}