using System.Security.Claims;
using GeoLeap.Api.Controllers;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoLeap.Api.Tests;

public class UserProfileChangePasswordSecurityTests
{
    [Fact]
    public async Task ChangePassword_WhenCurrentPasswordIsInvalid_DoesNotReturnSuccess()
    {
        var userId = Guid.NewGuid();
        var userProfileService = new Mock<IUserProfileService>(MockBehavior.Strict);
        var rbacService = new Mock<IRbacService>(MockBehavior.Strict);
        var passwordResetService = new Mock<IPasswordResetService>(MockBehavior.Strict);
        var logger = new Mock<ILogger<UserProfileController>>();

        rbacService
            .Setup(service => service.HasPermissionAsync(userId, "User", "ChangePassword"))
            .ReturnsAsync(true);
        userProfileService
            .Setup(service => service.LogUserActivityAsync(
                userId,
                "PasswordChanged",
                "User changed their password",
                It.IsAny<string>(),
                It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        passwordResetService
            .Setup(service => service.ChangePasswordAsync(
                userId,
                "wrong-current-password",
                "ValidNewPassword123!",
                It.IsAny<string>()))
            .ReturnsAsync(false);

        var controller = new UserProfileController(
            userProfileService.Object,
            rbacService.Object,
            passwordResetService.Object,
            logger.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) },
                        "TestAuth"))
                }
            }
        };

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "wrong-current-password",
            NewPassword = "ValidNewPassword123!",
            ConfirmPassword = "ValidNewPassword123!"
        };

        var result = await controller.ChangePassword(request);

        Assert.IsType<BadRequestObjectResult>(result);
        passwordResetService.Verify(
            service => service.ChangePasswordAsync(
                userId,
                request.CurrentPassword,
                request.NewPassword,
                It.IsAny<string>()),
            Times.Once);
        userProfileService.Verify(
            service => service.LogUserActivityAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task ChangePassword_WhenPasswordServiceSucceeds_ReturnsSuccessAndLogsActivity()
    {
        var userId = Guid.NewGuid();
        var userProfileService = new Mock<IUserProfileService>(MockBehavior.Strict);
        var rbacService = new Mock<IRbacService>(MockBehavior.Strict);
        var passwordResetService = new Mock<IPasswordResetService>(MockBehavior.Strict);
        var logger = new Mock<ILogger<UserProfileController>>();

        rbacService
            .Setup(service => service.HasPermissionAsync(userId, "User", "ChangePassword"))
            .ReturnsAsync(true);
        passwordResetService
            .Setup(service => service.ChangePasswordAsync(
                userId,
                "correct-current-password",
                "ValidNewPassword123!",
                It.IsAny<string>()))
            .ReturnsAsync(true);
        userProfileService
            .Setup(service => service.LogUserActivityAsync(
                userId,
                "PasswordChanged",
                "User changed their password",
                It.IsAny<string>(),
                It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var controller = CreateController(
            userId,
            userProfileService.Object,
            rbacService.Object,
            passwordResetService.Object,
            logger.Object);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "correct-current-password",
            NewPassword = "ValidNewPassword123!",
            ConfirmPassword = "ValidNewPassword123!"
        };

        var result = await controller.ChangePassword(request);

        Assert.IsType<OkObjectResult>(result);
        passwordResetService.Verify(
            service => service.ChangePasswordAsync(
                userId,
                request.CurrentPassword,
                request.NewPassword,
                It.IsAny<string>()),
            Times.Once);
        userProfileService.Verify(
            service => service.LogUserActivityAsync(
                userId,
                "PasswordChanged",
                "User changed their password",
                It.IsAny<string>(),
                It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task DeleteMyAccount_WhenConfirmationIsValid_DeletesAccount()
    {
        var userId = Guid.NewGuid();
        var userProfileService = new Mock<IUserProfileService>(MockBehavior.Strict);
        var rbacService = new Mock<IRbacService>(MockBehavior.Strict);
        var passwordResetService = new Mock<IPasswordResetService>(MockBehavior.Strict);
        var logger = new Mock<ILogger<UserProfileController>>();

        userProfileService
            .Setup(service => service.DeleteAccountAsync(userId))
            .Returns(Task.CompletedTask);

        var controller = CreateController(
            userId,
            userProfileService.Object,
            rbacService.Object,
            passwordResetService.Object,
            logger.Object);

        var result = await controller.DeleteMyAccount(new GeoLeap.Api.Models.DeleteAccountRequestDto { Confirmation = "DELETE" });

        Assert.IsType<OkObjectResult>(result);
        userProfileService.Verify(service => service.DeleteAccountAsync(userId), Times.Once);
    }

    [Fact]
    public async Task DeleteMyAccount_WhenConfirmationIsInvalid_DoesNotDeleteAccount()
    {
        var userId = Guid.NewGuid();
        var userProfileService = new Mock<IUserProfileService>(MockBehavior.Strict);
        var rbacService = new Mock<IRbacService>(MockBehavior.Strict);
        var passwordResetService = new Mock<IPasswordResetService>(MockBehavior.Strict);
        var logger = new Mock<ILogger<UserProfileController>>();

        var controller = CreateController(
            userId,
            userProfileService.Object,
            rbacService.Object,
            passwordResetService.Object,
            logger.Object);
        controller.ModelState.AddModelError("Confirmation", "Confirmation must be DELETE");

        var result = await controller.DeleteMyAccount(new GeoLeap.Api.Models.DeleteAccountRequestDto { Confirmation = "delete" });

        Assert.IsType<BadRequestObjectResult>(result);
        userProfileService.Verify(service => service.DeleteAccountAsync(It.IsAny<Guid>()), Times.Never);
    }

    private static UserProfileController CreateController(
        Guid userId,
        IUserProfileService userProfileService,
        IRbacService rbacService,
        IPasswordResetService passwordResetService,
        ILogger<UserProfileController> logger)
    {
        return new UserProfileController(
            userProfileService,
            rbacService,
            passwordResetService,
            logger)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) },
                        "TestAuth"))
                }
            }
        };
    }
}
