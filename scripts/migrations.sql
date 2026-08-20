IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] uniqueidentifier NOT NULL,
        [FirstName] nvarchar(100) NOT NULL,
        [LastName] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastLoginAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [GoogleId] nvarchar(100) NULL,
        [AppleId] nvarchar(100) NULL,
        [CreatedBy] uniqueidentifier NULL,
        [ModifiedAt] datetime2 NOT NULL,
        [ModifiedBy] uniqueidentifier NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [CustomRoles] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [IsSystemRole] bit NOT NULL,
        [Priority] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CustomRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [Permissions] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Resource] nvarchar(100) NOT NULL,
        [Action] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Permissions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] uniqueidentifier NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] uniqueidentifier NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [EmailVerificationTokens] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Token] nvarchar(255) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsUsed] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_EmailVerificationTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmailVerificationTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [UserSessions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [RefreshToken] nvarchar(255) NOT NULL,
        [DeviceInfo] nvarchar(500) NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastAccessedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_UserSessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserSessions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [CustomUserRoles] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [RoleId] uniqueidentifier NOT NULL,
        [AssignedBy] uniqueidentifier NULL,
        [AssignedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_CustomUserRoles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CustomUserRoles_AspNetUsers_AssignedBy] FOREIGN KEY ([AssignedBy]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_CustomUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CustomUserRoles_CustomRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [CustomRoles] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [RolePermissions] (
        [Id] uniqueidentifier NOT NULL,
        [RoleId] uniqueidentifier NOT NULL,
        [PermissionId] uniqueidentifier NOT NULL,
        [GrantedAt] datetime2 NOT NULL,
        [GrantedBy] uniqueidentifier NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RolePermissions_CustomRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [CustomRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RolePermissions_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE TABLE [UserAuditLogs] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Action] nvarchar(100) NOT NULL,
        [Resource] nvarchar(100) NOT NULL,
        [Details] nvarchar(1000) NOT NULL,
        [IpAddress] nvarchar(50) NOT NULL,
        [UserAgent] nvarchar(500) NOT NULL,
        [Success] bit NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [AffectedUserId] uniqueidentifier NULL,
        [RoleId] uniqueidentifier NULL,
        [PermissionId] uniqueidentifier NULL,
        CONSTRAINT [PK_UserAuditLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserAuditLogs_AspNetUsers_AffectedUserId] FOREIGN KEY ([AffectedUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_UserAuditLogs_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_UserAuditLogs_CustomRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [CustomRoles] ([Id]),
        CONSTRAINT [FK_UserAuditLogs_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AspNetUsers_AppleId] ON [AspNetUsers] ([AppleId]) WHERE [AppleId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AspNetUsers_GoogleId] ON [AspNetUsers] ([GoogleId]) WHERE [GoogleId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CustomRoles_Name] ON [CustomRoles] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_CustomUserRoles_AssignedBy] ON [CustomUserRoles] ([AssignedBy]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_CustomUserRoles_RoleId] ON [CustomUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CustomUserRoles_UserId_RoleId] ON [CustomUserRoles] ([UserId], [RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_EmailVerificationTokens_ExpiresAt] ON [EmailVerificationTokens] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EmailVerificationTokens_Token] ON [EmailVerificationTokens] ([Token]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_EmailVerificationTokens_UserId_IsUsed] ON [EmailVerificationTokens] ([UserId], [IsUsed]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Permissions_Name] ON [Permissions] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Permissions_Resource_Action] ON [Permissions] ([Resource], [Action]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_RolePermissions_PermissionId] ON [RolePermissions] ([PermissionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RolePermissions_RoleId_PermissionId] ON [RolePermissions] ([RoleId], [PermissionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserAuditLogs_AffectedUserId] ON [UserAuditLogs] ([AffectedUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserAuditLogs_PermissionId] ON [UserAuditLogs] ([PermissionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserAuditLogs_Resource_Action] ON [UserAuditLogs] ([Resource], [Action]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserAuditLogs_RoleId] ON [UserAuditLogs] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserAuditLogs_Timestamp] ON [UserAuditLogs] ([Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserAuditLogs_UserId_Timestamp] ON [UserAuditLogs] ([UserId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserSessions_ExpiresAt] ON [UserSessions] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserSessions_LastAccessedAt] ON [UserSessions] ([LastAccessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserSessions_RefreshToken] ON [UserSessions] ([RefreshToken]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    CREATE INDEX [IX_UserSessions_UserId_IsActive] ON [UserSessions] ([UserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823165900_CleanJwtAuthSystemFixed'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250823165900_CleanJwtAuthSystemFixed', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    CREATE TABLE [PasswordHistory] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [PasswordHash] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PasswordHistory] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PasswordHistory_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    CREATE TABLE [PasswordResetTokens] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Token] nvarchar(255) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsUsed] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PasswordResetTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PasswordResetTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    CREATE INDEX [IX_PasswordHistory_UserId_CreatedAt] ON [PasswordHistory] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    CREATE INDEX [IX_PasswordResetTokens_ExpiresAt] ON [PasswordResetTokens] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PasswordResetTokens_Token] ON [PasswordResetTokens] ([Token]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    CREATE INDEX [IX_PasswordResetTokens_UserId_IsUsed] ON [PasswordResetTokens] ([UserId], [IsUsed]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823200305_PasswordManagementSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250823200305_PasswordManagementSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [Bio] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [DisplayName] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [Language] nvarchar(10) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [ProfileImageUrl] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [TimeZone] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    CREATE TABLE [NotificationPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EmailNotifications] bit NOT NULL,
        [PushNotifications] bit NOT NULL,
        [MarketingEmails] bit NOT NULL,
        [WeeklyDigest] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ModifiedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NotificationPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationPreferences_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    CREATE TABLE [UserActivityLogs] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ActivityType] nvarchar(50) NOT NULL,
        [Description] nvarchar(500) NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserActivityLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserActivityLogs_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NotificationPreferences_UserId] ON [NotificationPreferences] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    CREATE INDEX [IX_UserActivityLogs_ActivityType] ON [UserActivityLogs] ([ActivityType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    CREATE INDEX [IX_UserActivityLogs_CreatedAt] ON [UserActivityLogs] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    CREATE INDEX [IX_UserActivityLogs_UserId_CreatedAt] ON [UserActivityLogs] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202619_UserProfileManagement'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250823202619_UserProfileManagement', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202921_EmailVerificationTokenUpdates'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [RevokedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202921_EmailVerificationTokenUpdates'
)
BEGIN
    ALTER TABLE [EmailVerificationTokens] ADD [Email] nvarchar(320) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202921_EmailVerificationTokenUpdates'
)
BEGIN
    ALTER TABLE [EmailVerificationTokens] ADD [IsEmailChange] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202921_EmailVerificationTokenUpdates'
)
BEGIN
    ALTER TABLE [EmailVerificationTokens] ADD [UsedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823202921_EmailVerificationTokenUpdates'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250823202921_EmailVerificationTokenUpdates', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [Browser] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [DeviceName] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [IsCurrentSession] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [Location] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [OperatingSystem] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [UserId1] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE TABLE [SecurityEvents] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EventType] nvarchar(50) NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        [Location] nvarchar(200) NULL,
        [RiskScore] int NOT NULL,
        [Details] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SecurityEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SecurityEvents_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE TABLE [SecurityPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EmailSecurityAlerts] bit NOT NULL,
        [EmailLoginNotifications] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [SecurityQuestionEnabled] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ModifiedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SecurityPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SecurityPreferences_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE INDEX [IX_UserSessions_UserId1] ON [UserSessions] ([UserId1]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE INDEX [IX_SecurityEvents_CreatedAt] ON [SecurityEvents] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE INDEX [IX_SecurityEvents_EventType] ON [SecurityEvents] ([EventType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE INDEX [IX_SecurityEvents_RiskScore] ON [SecurityEvents] ([RiskScore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE INDEX [IX_SecurityEvents_UserId_CreatedAt] ON [SecurityEvents] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE INDEX [IX_SecurityEvents_UserId_EventType] ON [SecurityEvents] ([UserId], [EventType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SecurityPreferences_UserId] ON [SecurityPreferences] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    ALTER TABLE [UserSessions] ADD CONSTRAINT [FK_UserSessions_AspNetUsers_UserId1] FOREIGN KEY ([UserId1]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823204235_AccountSecuritySessionManagement'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250823204235_AccountSecuritySessionManagement', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE TABLE [UserContentPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ContentType] nvarchar(50) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [Priority] int NOT NULL,
        [AddedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserContentPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserContentPreferences_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE TABLE [UserOnboardings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [IsCompleted] bit NOT NULL,
        [CurrentStep] int NOT NULL,
        [CompletedAt] datetime2 NULL,
        [SkippedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserOnboardings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserOnboardings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE TABLE [UserRegionPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [CountryCode] nvarchar(2) NOT NULL,
        [IsPrimary] bit NOT NULL,
        [Priority] int NOT NULL,
        [AddedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserRegionPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserRegionPreferences_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE TABLE [UserStreamingServices] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ServiceName] nvarchar(100) NOT NULL,
        [IsActive] bit NOT NULL,
        [AddedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserStreamingServices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserStreamingServices_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserContentPreferences_UserId_ContentType] ON [UserContentPreferences] ([UserId], [ContentType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserOnboardings_UserId] ON [UserOnboardings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserRegionPreferences_UserId_CountryCode] ON [UserRegionPreferences] ([UserId], [CountryCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserStreamingServices_UserId_ServiceName] ON [UserStreamingServices] ([UserId], [ServiceName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250823205530_UserOnboardingSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250823205530_UserOnboardingSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [IsSuspended] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [LastAdminAction] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [SuspendedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [SuspendedBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [SuspensionReason] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE TABLE [AdminActions] (
        [Id] uniqueidentifier NOT NULL,
        [AdminUserId] uniqueidentifier NOT NULL,
        [TargetUserId] uniqueidentifier NULL,
        [ActionType] nvarchar(100) NOT NULL,
        [Details] nvarchar(4000) NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        [CorrelationId] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_AdminActions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AdminActions_AspNetUsers_AdminUserId] FOREIGN KEY ([AdminUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_AdminActions_AspNetUsers_TargetUserId] FOREIGN KEY ([TargetUserId]) REFERENCES [AspNetUsers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE TABLE [UserImpersonationSessions] (
        [Id] uniqueidentifier NOT NULL,
        [AdminUserId] uniqueidentifier NOT NULL,
        [ImpersonatedUserId] uniqueidentifier NOT NULL,
        [SessionToken] nvarchar(255) NOT NULL,
        [Reason] nvarchar(500) NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [EndedAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [EndReason] nvarchar(100) NULL,
        CONSTRAINT [PK_UserImpersonationSessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserImpersonationSessions_AspNetUsers_AdminUserId] FOREIGN KEY ([AdminUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_UserImpersonationSessions_AspNetUsers_ImpersonatedUserId] FOREIGN KEY ([ImpersonatedUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AspNetUsers_IsSuspended] ON [AspNetUsers] ([IsSuspended]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AspNetUsers_IsSuspended_SuspendedAt] ON [AspNetUsers] ([IsSuspended], [SuspendedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AspNetUsers_SuspendedBy] ON [AspNetUsers] ([SuspendedBy]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AdminActions_ActionType] ON [AdminActions] ([ActionType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AdminActions_AdminUserId_CreatedAt] ON [AdminActions] ([AdminUserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AdminActions_CorrelationId] ON [AdminActions] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AdminActions_CreatedAt] ON [AdminActions] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_AdminActions_TargetUserId_CreatedAt] ON [AdminActions] ([TargetUserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_UserImpersonationSessions_AdminUserId_StartedAt] ON [UserImpersonationSessions] ([AdminUserId], [StartedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_UserImpersonationSessions_ImpersonatedUserId_StartedAt] ON [UserImpersonationSessions] ([ImpersonatedUserId], [StartedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE INDEX [IX_UserImpersonationSessions_IsActive] ON [UserImpersonationSessions] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserImpersonationSessions_SessionToken] ON [UserImpersonationSessions] ([SessionToken]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD CONSTRAINT [FK_AspNetUsers_AspNetUsers_SuspendedBy] FOREIGN KEY ([SuspendedBy]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824011642_AdminUserManagementSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250824011642_AdminUserManagementSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824012304_UserRoleRevocationFields'
)
BEGIN
    ALTER TABLE [CustomUserRoles] ADD [RevokedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824012304_UserRoleRevocationFields'
)
BEGIN
    ALTER TABLE [CustomUserRoles] ADD [RevokedBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824012304_UserRoleRevocationFields'
)
BEGIN
    CREATE INDEX [IX_CustomUserRoles_RevokedBy] ON [CustomUserRoles] ([RevokedBy]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824012304_UserRoleRevocationFields'
)
BEGIN
    ALTER TABLE [CustomUserRoles] ADD CONSTRAINT [FK_CustomUserRoles_AspNetUsers_RevokedBy] FOREIGN KEY ([RevokedBy]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824012304_UserRoleRevocationFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250824012304_UserRoleRevocationFields', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    DROP INDEX [IX_UserStreamingServices_UserId_ServiceName] ON [UserStreamingServices];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    ALTER TABLE [UserStreamingServices] ADD [PrioritizeInResults] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    ALTER TABLE [UserStreamingServices] ADD [RemovedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    ALTER TABLE [UserStreamingServices] ADD [ShowInRecommendations] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    ALTER TABLE [UserStreamingServices] ADD [StreamingServiceId] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE TABLE [StreamingServices] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [DisplayName] nvarchar(200) NULL,
        [Description] nvarchar(1000) NULL,
        [LogoUrl] nvarchar(500) NULL,
        [WebsiteUrl] nvarchar(500) NULL,
        [Type] int NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [IsGlobal] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ModifiedAt] datetime2 NOT NULL,
        [SortOrder] int NOT NULL,
        [AvailableRegions] nvarchar(2000) NOT NULL,
        [PopularRegions] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_StreamingServices] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE INDEX [IX_UserStreamingServices_StreamingServiceId] ON [UserStreamingServices] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE INDEX [IX_UserStreamingServices_UserId_IsActive] ON [UserStreamingServices] ([UserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserStreamingServices_UserId_StreamingServiceId] ON [UserStreamingServices] ([UserId], [StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE INDEX [IX_StreamingServices_Category] ON [StreamingServices] ([Category]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE INDEX [IX_StreamingServices_IsActive_SortOrder] ON [StreamingServices] ([IsActive], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StreamingServices_Name] ON [StreamingServices] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    ALTER TABLE [UserStreamingServices] ADD CONSTRAINT [FK_UserStreamingServices_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250824021307_StreamingServiceManagementSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250824021307_StreamingServiceManagementSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    CREATE TABLE [ApiUsageRecords] (
        [Id] int NOT NULL IDENTITY,
        [Endpoint] nvarchar(500) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [Success] bit NOT NULL,
        [ResponseTimeMs] int NOT NULL,
        [EstimatedCost] decimal(18,6) NOT NULL,
        [CorrelationId] nvarchar(100) NULL,
        [ErrorMessage] nvarchar(2000) NULL,
        [HttpStatusCode] int NOT NULL,
        CONSTRAINT [PK_ApiUsageRecords] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    CREATE INDEX [IX_ApiUsageRecords_CorrelationId] ON [ApiUsageRecords] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    CREATE INDEX [IX_ApiUsageRecords_Endpoint] ON [ApiUsageRecords] ([Endpoint]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    CREATE INDEX [IX_ApiUsageRecords_Success_Timestamp] ON [ApiUsageRecords] ([Success], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    CREATE INDEX [IX_ApiUsageRecords_Timestamp] ON [ApiUsageRecords] ([Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    CREATE INDEX [IX_ApiUsageRecords_Timestamp_EstimatedCost] ON [ApiUsageRecords] ([Timestamp], [EstimatedCost]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825141312_StreamingApiIntegration'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250825141312_StreamingApiIntegration', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    CREATE TABLE [CachePersistenceEntries] (
        [Id] uniqueidentifier NOT NULL,
        [Key] nvarchar(250) NOT NULL,
        [Value] nvarchar(max) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [LastAccessedAt] datetime2 NOT NULL,
        [IsCompressed] bit NOT NULL,
        [OriginalSize] bigint NOT NULL,
        [CompressedSize] bigint NOT NULL,
        [AccessCount] int NOT NULL,
        [ContentType] nvarchar(50) NULL,
        CONSTRAINT [PK_CachePersistenceEntries] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    CREATE INDEX [IX_CachePersistenceEntries_AccessCount] ON [CachePersistenceEntries] ([AccessCount]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    CREATE INDEX [IX_CachePersistenceEntries_Category_CreatedAt] ON [CachePersistenceEntries] ([Category], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    CREATE INDEX [IX_CachePersistenceEntries_Category_LastAccessedAt] ON [CachePersistenceEntries] ([Category], [LastAccessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    CREATE INDEX [IX_CachePersistenceEntries_ExpiresAt] ON [CachePersistenceEntries] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CachePersistenceEntries_Key] ON [CachePersistenceEntries] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825153315_CachePersistenceSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250825153315_CachePersistenceSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE TABLE [ApiCostRecords] (
        [Id] uniqueidentifier NOT NULL,
        [ProviderId] nvarchar(50) NOT NULL,
        [Endpoint] nvarchar(100) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [Success] bit NOT NULL,
        [ResponseTime] int NOT NULL,
        [EstimatedCost] decimal(18,4) NOT NULL,
        [RequestSize] int NOT NULL,
        [ResponseSize] int NOT NULL,
        [UserId] uniqueidentifier NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ApiCostRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ApiCostRecords_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE TABLE [BudgetAlerts] (
        [Id] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [Threshold] decimal(5,2) NOT NULL,
        [CurrentUtilization] decimal(5,2) NOT NULL,
        [CurrentCost] decimal(18,2) NOT NULL,
        [BudgetLimit] decimal(18,2) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [ProviderId] nvarchar(50) NULL,
        [IsProcessed] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_BudgetAlerts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE TABLE [BudgetConfigurations] (
        [Id] uniqueidentifier NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [Limit] decimal(18,2) NOT NULL,
        [Period] int NOT NULL,
        [IsActive] bit NOT NULL,
        [ProviderId] nvarchar(50) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_BudgetConfigurations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE TABLE [CostOptimizationRecommendations] (
        [Id] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [EstimatedMonthlySavings] decimal(18,2) NOT NULL,
        [ImplementationEffort] int NOT NULL,
        [Actions] nvarchar(max) NOT NULL,
        [GeneratedAt] datetime2 NOT NULL,
        [IsImplemented] bit NOT NULL,
        [ImplementedAt] datetime2 NULL,
        CONSTRAINT [PK_CostOptimizationRecommendations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_ApiCostRecords_CorrelationId] ON [ApiCostRecords] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_ApiCostRecords_Endpoint_Timestamp] ON [ApiCostRecords] ([Endpoint], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_ApiCostRecords_ProviderId_Timestamp] ON [ApiCostRecords] ([ProviderId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_ApiCostRecords_Success_Timestamp] ON [ApiCostRecords] ([Success], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_ApiCostRecords_Timestamp] ON [ApiCostRecords] ([Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_ApiCostRecords_UserId_Timestamp] ON [ApiCostRecords] ([UserId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_BudgetAlerts_ProviderId_Timestamp] ON [BudgetAlerts] ([ProviderId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_BudgetAlerts_Timestamp] ON [BudgetAlerts] ([Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_BudgetAlerts_Type_IsProcessed] ON [BudgetAlerts] ([Type], [IsProcessed]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_BudgetConfigurations_Category_IsActive] ON [BudgetConfigurations] ([Category], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_BudgetConfigurations_Period] ON [BudgetConfigurations] ([Period]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_BudgetConfigurations_ProviderId_IsActive] ON [BudgetConfigurations] ([ProviderId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_CostOptimizationRecommendations_EstimatedMonthlySavings] ON [CostOptimizationRecommendations] ([EstimatedMonthlySavings]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_CostOptimizationRecommendations_GeneratedAt] ON [CostOptimizationRecommendations] ([GeneratedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    CREATE INDEX [IX_CostOptimizationRecommendations_Type_IsImplemented] ON [CostOptimizationRecommendations] ([Type], [IsImplemented]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250825213911_ApiCostManagementSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250825213911_ApiCostManagementSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE TABLE [PaywallAnalytics] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EventType] int NOT NULL,
        [UserTier] int NOT NULL,
        [SearchQuery] nvarchar(max) NULL,
        [ResultsShown] int NULL,
        [TotalAvailableResults] int NULL,
        [MessageIntensity] int NULL,
        [UpgradeAction] nvarchar(max) NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [CorrelationId] nvarchar(450) NULL,
        CONSTRAINT [PK_PaywallAnalytics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaywallAnalytics_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE TABLE [UserSearchUsages] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Date] datetime2 NOT NULL,
        [SearchCount] int NOT NULL,
        [ResultsViewed] int NOT NULL,
        [LastSearchAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserSearchUsages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserSearchUsages_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE TABLE [UserSubscriptions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Tier] int NOT NULL,
        [IsActive] bit NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NULL,
        [LastPayment] datetime2 NULL,
        [SubscriptionId] nvarchar(max) NULL,
        [PaymentProvider] nvarchar(max) NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_UserSubscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserSubscriptions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE INDEX [IX_PaywallAnalytics_CorrelationId] ON [PaywallAnalytics] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE INDEX [IX_PaywallAnalytics_EventType] ON [PaywallAnalytics] ([EventType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE INDEX [IX_PaywallAnalytics_UserId_Timestamp] ON [PaywallAnalytics] ([UserId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE INDEX [IX_UserSearchUsages_Date] ON [UserSearchUsages] ([Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserSearchUsages_UserId_Date] ON [UserSearchUsages] ([UserId], [Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE INDEX [IX_UserSubscriptions_EndDate] ON [UserSubscriptions] ([EndDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    CREATE INDEX [IX_UserSubscriptions_UserId_IsActive] ON [UserSubscriptions] ([UserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826162529_PaywallSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250826162529_PaywallSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE TABLE [SearchableContents] (
        [Id] uniqueidentifier NOT NULL,
        [TmdbId] int NULL,
        [Title] nvarchar(500) NOT NULL,
        [OriginalTitle] nvarchar(500) NULL,
        [SearchableTitle] nvarchar(1000) NOT NULL,
        [Overview] nvarchar(2000) NULL,
        [SearchableOverview] nvarchar(4000) NULL,
        [Type] int NOT NULL,
        [Year] int NULL,
        [Rating] decimal(3,1) NULL,
        [VoteCount] int NOT NULL,
        [Popularity] decimal(10,2) NOT NULL,
        [RuntimeMinutes] int NULL,
        [Language] nvarchar(10) NULL,
        [ContentRating] nvarchar(10) NULL,
        [IsAdult] bit NOT NULL,
        [PosterUrl] nvarchar(500) NULL,
        [BackdropUrl] nvarchar(500) NULL,
        [GenresJson] nvarchar(1000) NOT NULL,
        [SearchableGenres] nvarchar(2000) NOT NULL,
        [CastJson] nvarchar(max) NOT NULL,
        [SearchableCast] nvarchar(3000) NOT NULL,
        [CrewJson] nvarchar(3000) NOT NULL,
        [SearchableCrew] nvarchar(2000) NOT NULL,
        [AvailableCountriesCount] int NOT NULL,
        [AvailableServicesCount] int NOT NULL,
        [SearchScore] decimal(10,4) NOT NULL,
        [ClickThroughRate] decimal(5,4) NOT NULL,
        [ViewCount] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [LastAvailabilityUpdate] datetime2 NULL,
        CONSTRAINT [PK_SearchableContents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE TABLE [SearchAnalytics] (
        [Id] uniqueidentifier NOT NULL,
        [QueryHash] nvarchar(64) NOT NULL,
        [SearchTerms] nvarchar(500) NULL,
        [ResultCount] int NOT NULL,
        [ExecutionTimeMs] int NOT NULL,
        [UsedCache] bit NOT NULL,
        [CacheHitRate] decimal(5,2) NULL,
        [HitCount] int NOT NULL,
        [EffectiveStrategy] nvarchar(50) NULL,
        [HasClickthrough] bit NOT NULL,
        [PerformanceTier] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastExecutedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SearchAnalytics] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE TABLE [ContentAlternativeTitles] (
        [Id] uniqueidentifier NOT NULL,
        [ContentId] uniqueidentifier NOT NULL,
        [Title] nvarchar(500) NOT NULL,
        [SearchableTitle] nvarchar(1000) NOT NULL,
        [Language] nvarchar(10) NULL,
        [CountryCode] nvarchar(2) NULL,
        [TitleType] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_ContentAlternativeTitles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContentAlternativeTitles_SearchableContents_ContentId] FOREIGN KEY ([ContentId]) REFERENCES [SearchableContents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE TABLE [ContentStreamingOptions] (
        [Id] uniqueidentifier NOT NULL,
        [ContentId] uniqueidentifier NOT NULL,
        [CountryCode] nvarchar(2) NOT NULL,
        [ServiceId] nvarchar(100) NOT NULL,
        [ServiceName] nvarchar(200) NOT NULL,
        [ServiceLogoUrl] nvarchar(500) NULL,
        [StreamingType] int NOT NULL,
        [Price] decimal(10,2) NULL,
        [Currency] nvarchar(3) NULL,
        [VideoQualityJson] nvarchar(200) NOT NULL,
        [AudioLanguagesJson] nvarchar(500) NOT NULL,
        [SubtitleLanguagesJson] nvarchar(500) NOT NULL,
        [ExpiresAt] datetime2 NULL,
        [StreamingUrl] nvarchar(1000) NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_ContentStreamingOptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContentStreamingOptions_SearchableContents_ContentId] FOREIGN KEY ([ContentId]) REFERENCES [SearchableContents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentAlternativeTitle_Content_Type] ON [ContentAlternativeTitles] ([ContentId], [TitleType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentAlternativeTitle_SearchableTitle_Language] ON [ContentAlternativeTitles] ([SearchableTitle], [Language]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentAlternativeTitles_ContentId] ON [ContentAlternativeTitles] ([ContentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentAlternativeTitles_SearchableTitle] ON [ContentAlternativeTitles] ([SearchableTitle]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentAlternativeTitles_Title_Language] ON [ContentAlternativeTitles] ([Title], [Language]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentStreamingOption_Content_Country_Type] ON [ContentStreamingOptions] ([ContentId], [CountryCode], [StreamingType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentStreamingOption_Country_Service_Updated] ON [ContentStreamingOptions] ([CountryCode], [ServiceId], [LastUpdated]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_ContentStreamingOption_ExpiresAt] ON [ContentStreamingOptions] ([ExpiresAt]) WHERE [ExpiresAt] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentStreamingOption_Service_Type_Price] ON [ContentStreamingOptions] ([ServiceId], [StreamingType], [Price]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentStreamingOptions_ContentId_CountryCode_ServiceId] ON [ContentStreamingOptions] ([ContentId], [CountryCode], [ServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentStreamingOptions_LastUpdated] ON [ContentStreamingOptions] ([LastUpdated]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_ContentStreamingOptions_StreamingType_Price] ON [ContentStreamingOptions] ([StreamingType], [Price]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_Availability] ON [SearchableContents] ([AvailableCountriesCount], [AvailableServicesCount]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_Filtering] ON [SearchableContents] ([Type], [IsAdult], [Language]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_Freshness] ON [SearchableContents] ([UpdatedAt], [LastAvailabilityUpdate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_FullTextSearch] ON [SearchableContents] ([SearchableTitle], [SearchableOverview], [SearchableCast], [SearchableCrew], [SearchableGenres]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_Ranking] ON [SearchableContents] ([Rating], [Popularity], [ViewCount]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_SearchableText] ON [SearchableContents] ([SearchableTitle], [SearchableGenres]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContent_Title_Type_Year] ON [SearchableContents] ([Title], [Type], [Year]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContents_CreatedAt_UpdatedAt] ON [SearchableContents] ([CreatedAt], [UpdatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContents_Rating_Popularity] ON [SearchableContents] ([Rating], [Popularity]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContents_SearchableTitle] ON [SearchableContents] ([SearchableTitle]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContents_Title_OriginalTitle] ON [SearchableContents] ([Title], [OriginalTitle]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_SearchableContents_TmdbId] ON [SearchableContents] ([TmdbId]) WHERE [TmdbId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchableContents_Type_Year] ON [SearchableContents] ([Type], [Year]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchAnalytics_Cache] ON [SearchAnalytics] ([UsedCache], [CacheHitRate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchAnalytics_CreatedAt_HitCount] ON [SearchAnalytics] ([CreatedAt], [HitCount]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchAnalytics_CreatedAt_Tier] ON [SearchAnalytics] ([CreatedAt], [PerformanceTier]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchAnalytics_ExecutionTimeMs] ON [SearchAnalytics] ([ExecutionTimeMs]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchAnalytics_Performance] ON [SearchAnalytics] ([ExecutionTimeMs], [ResultCount]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SearchAnalytics_QueryHash] ON [SearchAnalytics] ([QueryHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    CREATE INDEX [IX_SearchAnalytics_Usage] ON [SearchAnalytics] ([HitCount], [HasClickthrough]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250826193300_SearchPerformanceOptimization'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250826193300_SearchPerformanceOptimization', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE TABLE [BusinessAlerts] (
        [Id] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [Severity] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [BusinessMetrics] nvarchar(max) NOT NULL,
        [RevenueImpact] decimal(18,2) NULL,
        [TriggeredAt] datetime2 NOT NULL,
        [AcknowledgedAt] datetime2 NULL,
        [RequiresAction] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [RecommendedActions] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_BusinessAlerts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE TABLE [SearchAnalyticsEvents] (
        [Id] uniqueidentifier NOT NULL,
        [EventType] nvarchar(450) NOT NULL,
        [UserId] uniqueidentifier NULL,
        [SessionId] nvarchar(450) NULL,
        [AnonymousId] nvarchar(max) NOT NULL,
        [Query] nvarchar(450) NOT NULL,
        [NormalizedQuery] nvarchar(max) NULL,
        [ContentType] int NULL,
        [ResultCount] int NULL,
        [ResponseTimeMs] bigint NOT NULL,
        [UsedStrategy] int NULL,
        [UsedCache] bit NOT NULL,
        [DataSources] nvarchar(max) NOT NULL,
        [ClickedResultId] nvarchar(max) NULL,
        [ClickedPosition] int NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [CorrelationId] nvarchar(max) NOT NULL,
        [IpAddress] nvarchar(max) NULL,
        [UserAgent] nvarchar(max) NULL,
        [Country] nvarchar(max) NULL,
        [Region] nvarchar(max) NULL,
        CONSTRAINT [PK_SearchAnalyticsEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE TABLE [SearchJourneys] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] nvarchar(450) NOT NULL,
        [UserId] uniqueidentifier NULL,
        [AnonymousId] nvarchar(max) NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        [Outcome] int NOT NULL,
        [TotalSearches] int NOT NULL,
        [TotalClicks] int NOT NULL,
        [FinalClickedContentId] nvarchar(max) NULL,
        [TotalDuration] time NOT NULL,
        [ConvertedToSubscription] bit NOT NULL,
        [JourneyMetadata] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SearchJourneys] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE TABLE [SearchPerformanceAlerts] (
        [Id] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [Severity] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [Metrics] nvarchar(max) NOT NULL,
        [TriggeredAt] datetime2 NOT NULL,
        [ResolvedAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [RecommendedActions] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SearchPerformanceAlerts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE TABLE [SearchSteps] (
        [Id] uniqueidentifier NOT NULL,
        [JourneyId] uniqueidentifier NOT NULL,
        [StepNumber] int NOT NULL,
        [Action] nvarchar(max) NOT NULL,
        [Query] nvarchar(max) NULL,
        [ContentId] nvarchar(max) NULL,
        [Position] int NULL,
        [ActionMetadata] nvarchar(max) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [TimeFromPrevious] time NOT NULL,
        CONSTRAINT [PK_SearchSteps] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SearchSteps_SearchJourneys_JourneyId] FOREIGN KEY ([JourneyId]) REFERENCES [SearchJourneys] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_BusinessAlert_Active_Type] ON [BusinessAlerts] ([IsActive], [Type]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchAnalyticsEvent_EventType_Timestamp] ON [SearchAnalyticsEvents] ([EventType], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchAnalyticsEvent_Query] ON [SearchAnalyticsEvents] ([Query]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchAnalyticsEvent_User_Session] ON [SearchAnalyticsEvents] ([UserId], [SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchJourney_Session_Outcome] ON [SearchJourneys] ([SessionId], [Outcome]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchJourney_User_StartedAt] ON [SearchJourneys] ([UserId], [StartedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchPerformanceAlert_Active_Severity] ON [SearchPerformanceAlerts] ([IsActive], [Severity]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    CREATE INDEX [IX_SearchStep_Journey_StepNumber] ON [SearchSteps] ([JourneyId], [StepNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250827140607_SearchAnalyticsAndInsights'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250827140607_SearchAnalyticsAndInsights', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [PaymentAnalytics] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NULL,
        [EventType] nvarchar(50) NOT NULL,
        [PaymentMethod] nvarchar(50) NOT NULL,
        [Amount] decimal(18,2) NULL,
        [Currency] nvarchar(3) NOT NULL,
        [FailureCode] nvarchar(100) NOT NULL,
        [FailureMessage] nvarchar(500) NOT NULL,
        [ProcessingTimeMs] int NOT NULL,
        [Country] nvarchar(2) NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        CONSTRAINT [PK_PaymentAnalytics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentAnalytics_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [PaymentConfigurations] (
        [Id] uniqueidentifier NOT NULL,
        [Key] nvarchar(100) NOT NULL,
        [Value] nvarchar(max) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [IsActive] bit NOT NULL,
        [IsSecure] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [UpdatedBy] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_PaymentConfigurations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [SearchHistories] (
        [Id] int NOT NULL IDENTITY,
        [UserId] uniqueidentifier NOT NULL,
        [Query] nvarchar(500) NOT NULL,
        [SearchedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [ResultCount] int NOT NULL,
        [ExecutionTimeMs] int NOT NULL,
        [SearchType] nvarchar(50) NOT NULL DEFAULT N'General',
        [CorrelationId] nvarchar(100) NULL,
        [Metadata] nvarchar(max) NULL,
        CONSTRAINT [PK_SearchHistories] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SearchHistories_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [SearchTrends] (
        [Id] int NOT NULL IDENTITY,
        [Query] nvarchar(500) NOT NULL,
        [Date] datetime2 NOT NULL DEFAULT (CAST(GETUTCDATE() AS DATE)),
        [SearchCount] int NOT NULL,
        [UniqueUsers] int NOT NULL,
        [TrendingScore] decimal(18,2) NOT NULL,
        [IsRising] bit NOT NULL,
        [TimeWindowHours] int NOT NULL DEFAULT 24,
        [LastUpdated] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_SearchTrends] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [StripeCustomers] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [StripeCustomerId] nvarchar(100) NOT NULL,
        [Email] nvarchar(255) NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_StripeCustomers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StripeCustomers_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [WebhookEvents] (
        [Id] uniqueidentifier NOT NULL,
        [StripeEventId] nvarchar(100) NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [EventData] nvarchar(max) NOT NULL,
        [ProcessingStatus] nvarchar(50) NOT NULL,
        [ProcessingError] nvarchar(2000) NOT NULL,
        [ProcessingAttempts] int NOT NULL,
        [ProcessedAt] datetime2 NULL,
        [NextRetryAt] datetime2 NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_WebhookEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [PaymentMethods] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [StripePaymentMethodId] nvarchar(100) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [Last4] nvarchar(4) NOT NULL,
        [Brand] nvarchar(50) NOT NULL,
        [ExpiryMonth] int NULL,
        [ExpiryYear] int NULL,
        [Fingerprint] nvarchar(100) NOT NULL,
        [Country] nvarchar(2) NOT NULL,
        [IsDefault] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        [StripeCustomerId] uniqueidentifier NULL,
        CONSTRAINT [PK_PaymentMethods] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentMethods_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_PaymentMethods_StripeCustomers_StripeCustomerId] FOREIGN KEY ([StripeCustomerId]) REFERENCES [StripeCustomers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [Subscriptions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [StripeCustomerId] uniqueidentifier NOT NULL,
        [StripeSubscriptionId] nvarchar(100) NOT NULL,
        [StripePriceId] nvarchar(100) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [PlanType] nvarchar(50) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [Interval] nvarchar(20) NOT NULL,
        [IntervalCount] int NOT NULL,
        [CurrentPeriodStart] datetime2 NOT NULL,
        [CurrentPeriodEnd] datetime2 NOT NULL,
        [CanceledAt] datetime2 NULL,
        [CancelAtPeriodEnd] datetime2 NULL,
        [IsCanceled] bit NOT NULL,
        [TrialStart] datetime2 NULL,
        [TrialEnd] datetime2 NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Subscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Subscriptions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Subscriptions_StripeCustomers_StripeCustomerId] FOREIGN KEY ([StripeCustomerId]) REFERENCES [StripeCustomers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE TABLE [PaymentTransactions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [StripePaymentIntentId] nvarchar(100) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [PaymentMethodId] uniqueidentifier NULL,
        [StripeCustomerId] nvarchar(100) NOT NULL,
        [StripeSubscriptionId] nvarchar(100) NOT NULL,
        [FailureReason] nvarchar(2000) NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProcessedAt] datetime2 NULL,
        [RetryCount] int NOT NULL,
        [NextRetryAt] datetime2 NULL,
        [LastRetryAt] datetime2 NULL,
        [IpAddress] nvarchar(45) NOT NULL,
        [UserAgent] nvarchar(500) NOT NULL,
        [StripeCustomerId1] uniqueidentifier NULL,
        [SubscriptionId] uniqueidentifier NULL,
        CONSTRAINT [PK_PaymentTransactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentTransactions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PaymentTransactions_PaymentMethods_PaymentMethodId] FOREIGN KEY ([PaymentMethodId]) REFERENCES [PaymentMethods] ([Id]),
        CONSTRAINT [FK_PaymentTransactions_StripeCustomers_StripeCustomerId1] FOREIGN KEY ([StripeCustomerId1]) REFERENCES [StripeCustomers] ([Id]),
        CONSTRAINT [FK_PaymentTransactions_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentAnalytics_CorrelationId] ON [PaymentAnalytics] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentAnalytics_EventType_Timestamp] ON [PaymentAnalytics] ([EventType], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentAnalytics_User_Timestamp] ON [PaymentAnalytics] ([UserId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentConfiguration_Category_IsActive] ON [PaymentConfigurations] ([Category], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PaymentConfigurations_Key] ON [PaymentConfigurations] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentMethod_User_IsActive] ON [PaymentMethods] ([UserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_PaymentMethod_User_IsDefault] ON [PaymentMethods] ([UserId], [IsDefault]) WHERE [IsDefault] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentMethods_StripeCustomerId] ON [PaymentMethods] ([StripeCustomerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PaymentMethods_StripePaymentMethodId] ON [PaymentMethods] ([StripePaymentMethodId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentTransaction_CorrelationId] ON [PaymentTransactions] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_PaymentTransaction_NextRetryAt_Status] ON [PaymentTransactions] ([NextRetryAt], [Status]) WHERE [NextRetryAt] IS NOT NULL AND [Status] = ''pending''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentTransaction_Status_CreatedAt] ON [PaymentTransactions] ([Status], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentTransaction_User_CreatedAt] ON [PaymentTransactions] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentTransactions_PaymentMethodId] ON [PaymentTransactions] ([PaymentMethodId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentTransactions_StripeCustomerId1] ON [PaymentTransactions] ([StripeCustomerId1]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PaymentTransactions_StripePaymentIntentId] ON [PaymentTransactions] ([StripePaymentIntentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_PaymentTransactions_SubscriptionId] ON [PaymentTransactions] ([SubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_SearchHistory_Date] ON [SearchHistories] ([SearchedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_SearchHistory_Query_Date] ON [SearchHistories] ([Query], [SearchedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_SearchHistory_User_Date] ON [SearchHistories] ([UserId], [SearchedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_SearchTrend_Date_Score] ON [SearchTrends] ([Date], [TrendingScore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SearchTrend_Query_Date_Unique] ON [SearchTrends] ([Query], [Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_SearchTrend_Rising_Score] ON [SearchTrends] ([IsRising], [TrendingScore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_StripeCustomer_Email] ON [StripeCustomers] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StripeCustomers_StripeCustomerId] ON [StripeCustomers] ([StripeCustomerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StripeCustomers_UserId] ON [StripeCustomers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_Subscription_Status_CurrentPeriodEnd] ON [Subscriptions] ([Status], [CurrentPeriodEnd]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_Subscription_User_Status] ON [Subscriptions] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_Subscriptions_StripeCustomerId] ON [Subscriptions] ([StripeCustomerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Subscriptions_StripeSubscriptionId] ON [Subscriptions] ([StripeSubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_WebhookEvent_CorrelationId] ON [WebhookEvents] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE INDEX [IX_WebhookEvent_EventType_CreatedAt] ON [WebhookEvents] ([EventType], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_WebhookEvent_ProcessingStatus_NextRetryAt] ON [WebhookEvents] ([ProcessingStatus], [NextRetryAt]) WHERE [ProcessingStatus] = ''pending'' AND [NextRetryAt] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_WebhookEvents_StripeEventId] ON [WebhookEvents] ([StripeEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828000631_StripePaymentIntegration'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250828000631_StripePaymentIntegration', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142325_AddAutoRenewToUserSubscription'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [AutoRenew] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142325_AddAutoRenewToUserSubscription'
)
BEGIN
    DECLARE @var sysname;
    SELECT @var = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Subscriptions]') AND [c].[name] = N'CancelAtPeriodEnd');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Subscriptions] DROP CONSTRAINT [' + @var + '];');
    ALTER TABLE [Subscriptions] DROP COLUMN [CancelAtPeriodEnd];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142325_AddAutoRenewToUserSubscription'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [CancelAtPeriodEnd] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142325_AddAutoRenewToUserSubscription'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250828142325_AddAutoRenewToUserSubscription', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142554_FixSuspendedByCascadeIssue'
)
BEGIN
    ALTER TABLE [AspNetUsers] DROP CONSTRAINT [FK_AspNetUsers_AspNetUsers_SuspendedBy];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142554_FixSuspendedByCascadeIssue'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD CONSTRAINT [FK_AspNetUsers_AspNetUsers_SuspendedBy] FOREIGN KEY ([SuspendedBy]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142554_FixSuspendedByCascadeIssue'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250828142554_FixSuspendedByCascadeIssue', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142850_RemoveSuspendedByField'
)
BEGIN
    ALTER TABLE [AspNetUsers] DROP CONSTRAINT [FK_AspNetUsers_AspNetUsers_SuspendedBy];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142850_RemoveSuspendedByField'
)
BEGIN
    DROP INDEX [IX_AspNetUsers_SuspendedBy] ON [AspNetUsers];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142850_RemoveSuspendedByField'
)
BEGIN
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AspNetUsers]') AND [c].[name] = N'SuspendedBy');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [AspNetUsers] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [AspNetUsers] DROP COLUMN [SuspendedBy];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828142850_RemoveSuspendedByField'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250828142850_RemoveSuspendedByField', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    ALTER TABLE [PaymentMethods] ADD [Nickname] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE TABLE [BillingAddresses] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [CompanyName] nvarchar(255) NOT NULL,
        [FullName] nvarchar(255) NOT NULL,
        [AddressLine1] nvarchar(255) NOT NULL,
        [AddressLine2] nvarchar(255) NOT NULL,
        [City] nvarchar(100) NOT NULL,
        [State] nvarchar(100) NOT NULL,
        [PostalCode] nvarchar(20) NOT NULL,
        [Country] nvarchar(2) NOT NULL,
        [TaxId] nvarchar(50) NOT NULL,
        [TaxIdType] nvarchar(100) NOT NULL,
        [IsDefault] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_BillingAddresses] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BillingAddresses_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE TABLE [InvoiceTemplates] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [TemplateType] nvarchar(50) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [HtmlTemplate] nvarchar(max) NOT NULL,
        [CssStyles] nvarchar(max) NOT NULL,
        [Language] nvarchar(5) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [IsDefault] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        [UpdatedBy] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_InvoiceTemplates] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE TABLE [Invoices] (
        [Id] uniqueidentifier NOT NULL,
        [InvoiceNumber] nvarchar(50) NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [StripeCustomerId] uniqueidentifier NULL,
        [PaymentTransactionId] uniqueidentifier NULL,
        [SubscriptionId] uniqueidentifier NULL,
        [StripeInvoiceId] nvarchar(100) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [Subtotal] decimal(18,2) NOT NULL,
        [TaxAmount] decimal(18,2) NOT NULL,
        [DiscountAmount] decimal(18,2) NOT NULL,
        [Total] decimal(18,2) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [IssueDate] datetime2 NOT NULL,
        [DueDate] datetime2 NOT NULL,
        [PaidAt] datetime2 NULL,
        [PeriodStart] datetime2 NOT NULL,
        [PeriodEnd] datetime2 NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Notes] nvarchar(1000) NOT NULL,
        [BillingAddressId] uniqueidentifier NULL,
        [InvoiceTemplate] nvarchar(50) NOT NULL,
        [Language] nvarchar(5) NOT NULL,
        [IsPdfGenerated] bit NOT NULL,
        [PdfGeneratedAt] datetime2 NULL,
        [IsEmailSent] bit NOT NULL,
        [EmailSentAt] datetime2 NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Invoices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Invoices_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Invoices_BillingAddresses_BillingAddressId] FOREIGN KEY ([BillingAddressId]) REFERENCES [BillingAddresses] ([Id]),
        CONSTRAINT [FK_Invoices_PaymentTransactions_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransactions] ([Id]),
        CONSTRAINT [FK_Invoices_StripeCustomers_StripeCustomerId] FOREIGN KEY ([StripeCustomerId]) REFERENCES [StripeCustomers] ([Id]),
        CONSTRAINT [FK_Invoices_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE TABLE [InvoiceDeliveries] (
        [Id] uniqueidentifier NOT NULL,
        [InvoiceId] uniqueidentifier NOT NULL,
        [DeliveryMethod] nvarchar(50) NOT NULL,
        [DeliveryAddress] nvarchar(255) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [SentAt] datetime2 NULL,
        [DeliveredAt] datetime2 NULL,
        [FailedAt] datetime2 NULL,
        [FailureReason] nvarchar(1000) NOT NULL,
        [AttemptCount] int NOT NULL,
        [NextRetryAt] datetime2 NULL,
        [MessageId] nvarchar(100) NOT NULL,
        [DeliveryTrackingId] nvarchar(100) NOT NULL,
        [DeliveryMetadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_InvoiceDeliveries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InvoiceDeliveries_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE TABLE [InvoiceLineItems] (
        [Id] uniqueidentifier NOT NULL,
        [InvoiceId] uniqueidentifier NOT NULL,
        [ItemType] nvarchar(100) NOT NULL,
        [Description] nvarchar(255) NOT NULL,
        [Quantity] int NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [ServicePeriodStart] datetime2 NULL,
        [ServicePeriodEnd] datetime2 NULL,
        [StripePriceId] nvarchar(100) NOT NULL,
        [StripeProductId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_InvoiceLineItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InvoiceLineItems_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE TABLE [TaxCalculations] (
        [Id] uniqueidentifier NOT NULL,
        [InvoiceId] uniqueidentifier NOT NULL,
        [TaxType] nvarchar(50) NOT NULL,
        [TaxName] nvarchar(100) NOT NULL,
        [Rate] decimal(18,4) NOT NULL,
        [TaxableAmount] decimal(18,2) NOT NULL,
        [TaxAmount] decimal(18,2) NOT NULL,
        [Country] nvarchar(2) NOT NULL,
        [StateProvince] nvarchar(10) NOT NULL,
        [Jurisdiction] nvarchar(100) NOT NULL,
        [TaxServiceProvider] nvarchar(100) NOT NULL,
        [ExternalTaxId] nvarchar(100) NOT NULL,
        [TaxDetails] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_TaxCalculations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TaxCalculations_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_BillingAddress_Country] ON [BillingAddresses] ([Country]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_BillingAddress_User_IsActive] ON [BillingAddresses] ([UserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_BillingAddress_User_IsDefault] ON [BillingAddresses] ([UserId], [IsDefault]) WHERE [IsDefault] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_InvoiceDelivery_Invoice_Method] ON [InvoiceDeliveries] ([InvoiceId], [DeliveryMethod]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_InvoiceDelivery_Status_NextRetryAt] ON [InvoiceDeliveries] ([Status], [NextRetryAt]) WHERE [Status] = ''failed'' AND [NextRetryAt] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_InvoiceLineItem_Invoice_ItemType] ON [InvoiceLineItems] ([InvoiceId], [ItemType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoice_CorrelationId] ON [Invoices] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoice_Period] ON [Invoices] ([PeriodStart], [PeriodEnd]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoice_Status_DueDate] ON [Invoices] ([Status], [DueDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoice_User_IssueDate] ON [Invoices] ([UserId], [IssueDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoices_BillingAddressId] ON [Invoices] ([BillingAddressId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Invoices_InvoiceNumber] ON [Invoices] ([InvoiceNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Invoices_PaymentTransactionId] ON [Invoices] ([PaymentTransactionId]) WHERE [PaymentTransactionId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoices_StripeCustomerId] ON [Invoices] ([StripeCustomerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Invoices_StripeInvoiceId] ON [Invoices] ([StripeInvoiceId]) WHERE [StripeInvoiceId] != ''''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_Invoices_SubscriptionId] ON [Invoices] ([SubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_InvoiceTemplate_Type_IsActive] ON [InvoiceTemplates] ([TemplateType], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InvoiceTemplates_Name_Language] ON [InvoiceTemplates] ([Name], [Language]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_TaxCalculation_Country_State] ON [TaxCalculations] ([Country], [StateProvince]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    CREATE INDEX [IX_TaxCalculation_Invoice_TaxType] ON [TaxCalculations] ([InvoiceId], [TaxType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828191528_PaymentMethodManagement'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250828191528_PaymentMethodManagement', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [DunningCampaigns] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [TriggerType] nvarchar(50) NOT NULL,
        [CustomerSegment] nvarchar(50) NOT NULL,
        [IsActive] bit NOT NULL,
        [Priority] int NOT NULL,
        [DelayAfterTrigger] time NOT NULL,
        [SequenceInterval] time NULL,
        [MaxExecutions] int NOT NULL,
        [RequireGracePeriod] bit NOT NULL,
        [StopOnPaymentSuccess] bit NOT NULL,
        [StopOnAccountCancellation] bit NOT NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ArchivedAt] datetime2 NULL,
        CONSTRAINT [PK_DunningCampaigns] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [DunningConfigurations] (
        [Id] uniqueidentifier NOT NULL,
        [Key] nvarchar(100) NOT NULL,
        [Value] nvarchar(max) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [DataType] nvarchar(50) NOT NULL,
        [IsActive] bit NOT NULL,
        [IsEditable] bit NOT NULL,
        [UpdatedBy] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_DunningConfigurations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [FailedPayments] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [PaymentTransactionId] uniqueidentifier NOT NULL,
        [SubscriptionId] uniqueidentifier NULL,
        [FailureType] nvarchar(50) NOT NULL,
        [StripeDeclineCode] nvarchar(100) NOT NULL,
        [FailureReason] nvarchar(500) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [RecoveryStatus] nvarchar(50) NOT NULL,
        [RetryCount] int NOT NULL,
        [MaxRetryAttempts] int NOT NULL,
        [NextRetryAt] datetime2 NULL,
        [LastRetryAt] datetime2 NULL,
        [ResolvedAt] datetime2 NULL,
        [IsRetriable] bit NOT NULL,
        [RequiresAction] bit NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_FailedPayments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FailedPayments_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_FailedPayments_PaymentTransactions_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransactions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_FailedPayments_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [DunningSteps] (
        [Id] uniqueidentifier NOT NULL,
        [CampaignId] uniqueidentifier NOT NULL,
        [StepNumber] int NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [NotificationType] nvarchar(50) NOT NULL,
        [Subject] nvarchar(200) NOT NULL,
        [MessageTemplate] nvarchar(max) NOT NULL,
        [DelayFromPrevious] time NOT NULL,
        [UrgencyLevel] nvarchar(50) NOT NULL,
        [RequiresResponse] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [TestVariant] nvarchar(100) NOT NULL,
        [TrafficAllocation] int NOT NULL,
        [TemplateVariables] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_DunningSteps] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DunningSteps_DunningCampaigns_CampaignId] FOREIGN KEY ([CampaignId]) REFERENCES [DunningCampaigns] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [DunningCampaignExecutions] (
        [Id] uniqueidentifier NOT NULL,
        [CampaignId] uniqueidentifier NOT NULL,
        [FailedPaymentId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [CurrentStepNumber] int NOT NULL,
        [TotalExecutions] int NOT NULL,
        [NextExecutionAt] datetime2 NULL,
        [LastExecutedAt] datetime2 NULL,
        [CompletedAt] datetime2 NULL,
        [CompletionReason] nvarchar(100) NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [ExecutionMetadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_DunningCampaignExecutions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DunningCampaignExecutions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DunningCampaignExecutions_DunningCampaigns_CampaignId] FOREIGN KEY ([CampaignId]) REFERENCES [DunningCampaigns] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DunningCampaignExecutions_FailedPayments_FailedPaymentId] FOREIGN KEY ([FailedPaymentId]) REFERENCES [FailedPayments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [GracePeriods] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [FailedPaymentId] uniqueidentifier NOT NULL,
        [SubscriptionId] uniqueidentifier NULL,
        [Status] nvarchar(50) NOT NULL,
        [GracePeriodType] nvarchar(50) NOT NULL,
        [GracePeriodDays] int NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [ResolvedAt] datetime2 NULL,
        [LimitFeatures] bit NOT NULL,
        [RestrictedFeatures] nvarchar(max) NOT NULL,
        [ShowGracePeriodWarnings] bit NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_GracePeriods] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_GracePeriods_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_GracePeriods_FailedPayments_FailedPaymentId] FOREIGN KEY ([FailedPaymentId]) REFERENCES [FailedPayments] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_GracePeriods_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [PaymentRecoverySessions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [FailedPaymentId] uniqueidentifier NOT NULL,
        [SessionToken] nvarchar(100) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [RecoveryUrl] nvarchar(200) NOT NULL,
        [LastAccessedAt] datetime2 NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        [CompletionType] nvarchar(50) NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [SessionMetadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PaymentRecoverySessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentRecoverySessions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PaymentRecoverySessions_FailedPayments_FailedPaymentId] FOREIGN KEY ([FailedPaymentId]) REFERENCES [FailedPayments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [PaymentRetryAttempts] (
        [Id] uniqueidentifier NOT NULL,
        [FailedPaymentId] uniqueidentifier NOT NULL,
        [PaymentTransactionId] uniqueidentifier NOT NULL,
        [AttemptType] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [StripeDeclineCode] nvarchar(100) NOT NULL,
        [FailureReason] nvarchar(500) NOT NULL,
        [AttemptNumber] int NOT NULL,
        [DelayFromPrevious] time NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [AttemptedAt] datetime2 NULL,
        [CompletedAt] datetime2 NULL,
        CONSTRAINT [PK_PaymentRetryAttempts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentRetryAttempts_FailedPayments_FailedPaymentId] FOREIGN KEY ([FailedPaymentId]) REFERENCES [FailedPayments] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_PaymentRetryAttempts_PaymentTransactions_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransactions] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [DunningAnalytics] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NULL,
        [EventType] nvarchar(50) NOT NULL,
        [FailureType] nvarchar(50) NOT NULL,
        [CampaignId] uniqueidentifier NULL,
        [StepId] uniqueidentifier NULL,
        [Amount] decimal(18,2) NULL,
        [Currency] nvarchar(3) NOT NULL,
        [NotificationType] nvarchar(50) NOT NULL,
        [WasSuccessful] bit NOT NULL,
        [DaysSinceFailure] int NOT NULL,
        [RecoveryAttempt] int NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [AnalyticsMetadata] nvarchar(max) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        CONSTRAINT [PK_DunningAnalytics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DunningAnalytics_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_DunningAnalytics_DunningCampaigns_CampaignId] FOREIGN KEY ([CampaignId]) REFERENCES [DunningCampaigns] ([Id]),
        CONSTRAINT [FK_DunningAnalytics_DunningSteps_StepId] FOREIGN KEY ([StepId]) REFERENCES [DunningSteps] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE TABLE [DunningNotifications] (
        [Id] uniqueidentifier NOT NULL,
        [CampaignExecutionId] uniqueidentifier NOT NULL,
        [StepId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [NotificationType] nvarchar(50) NOT NULL,
        [Subject] nvarchar(200) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [ErrorMessage] nvarchar(500) NOT NULL,
        [RetryCount] int NOT NULL,
        [NextRetryAt] datetime2 NULL,
        [SentAt] datetime2 NULL,
        [DeliveredAt] datetime2 NULL,
        [OpenedAt] datetime2 NULL,
        [ClickedAt] datetime2 NULL,
        [ExternalId] nvarchar(100) NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [DeliveryMetadata] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_DunningNotifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DunningNotifications_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DunningNotifications_DunningCampaignExecutions_CampaignExecutionId] FOREIGN KEY ([CampaignExecutionId]) REFERENCES [DunningCampaignExecutions] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DunningNotifications_DunningSteps_StepId] FOREIGN KEY ([StepId]) REFERENCES [DunningSteps] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningAnalytics_CampaignId] ON [DunningAnalytics] ([CampaignId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningAnalytics_EventType_Timestamp] ON [DunningAnalytics] ([EventType], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningAnalytics_FailureType_Success] ON [DunningAnalytics] ([FailureType], [WasSuccessful]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningAnalytics_StepId] ON [DunningAnalytics] ([StepId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningAnalytics_User_Timestamp] ON [DunningAnalytics] ([UserId], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DunningCampaignExecution_FailedPayment_Campaign] ON [DunningCampaignExecutions] ([FailedPaymentId], [CampaignId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_DunningCampaignExecution_Status_NextExecutionAt] ON [DunningCampaignExecutions] ([Status], [NextExecutionAt]) WHERE [NextExecutionAt] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningCampaignExecution_User_Status] ON [DunningCampaignExecutions] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningCampaignExecutions_CampaignId] ON [DunningCampaignExecutions] ([CampaignId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningCampaign_CustomerSegment_Priority] ON [DunningCampaigns] ([CustomerSegment], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningCampaign_TriggerType_IsActive] ON [DunningCampaigns] ([TriggerType], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningConfiguration_Category_IsActive] ON [DunningConfigurations] ([Category], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DunningConfiguration_Key] ON [DunningConfigurations] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_DunningNotification_Status_NextRetryAt] ON [DunningNotifications] ([Status], [NextRetryAt]) WHERE [Status] = ''failed'' AND [NextRetryAt] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningNotification_Type_Status] ON [DunningNotifications] ([NotificationType], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningNotification_User_Status] ON [DunningNotifications] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningNotifications_CampaignExecutionId] ON [DunningNotifications] ([CampaignExecutionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningNotifications_StepId] ON [DunningNotifications] ([StepId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DunningStep_Campaign_StepNumber] ON [DunningSteps] ([CampaignId], [StepNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_DunningStep_NotificationType_IsActive] ON [DunningSteps] ([NotificationType], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_FailedPayment_CorrelationId] ON [FailedPayments] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_FailedPayment_FailureType_CreatedAt] ON [FailedPayments] ([FailureType], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_FailedPayment_RecoveryStatus_NextRetryAt] ON [FailedPayments] ([RecoveryStatus], [NextRetryAt]) WHERE [NextRetryAt] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_FailedPayment_User_RecoveryStatus] ON [FailedPayments] ([UserId], [RecoveryStatus]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FailedPayments_PaymentTransactionId] ON [FailedPayments] ([PaymentTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_FailedPayments_SubscriptionId] ON [FailedPayments] ([SubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_GracePeriod_FailedPaymentId] ON [GracePeriods] ([FailedPaymentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_GracePeriod_Status_ExpiresAt] ON [GracePeriods] ([Status], [ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_GracePeriod_User_Status] ON [GracePeriods] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_GracePeriods_SubscriptionId] ON [GracePeriods] ([SubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PaymentRecoverySession_SessionToken] ON [PaymentRecoverySessions] ([SessionToken]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_PaymentRecoverySession_Status_ExpiresAt] ON [PaymentRecoverySessions] ([Status], [ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_PaymentRecoverySession_User_Status] ON [PaymentRecoverySessions] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_PaymentRecoverySessions_FailedPaymentId] ON [PaymentRecoverySessions] ([FailedPaymentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PaymentRetryAttempt_FailedPayment_AttemptNumber] ON [PaymentRetryAttempts] ([FailedPaymentId], [AttemptNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_PaymentRetryAttempt_Status_AttemptedAt] ON [PaymentRetryAttempts] ([Status], [AttemptedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    CREATE INDEX [IX_PaymentRetryAttempts_PaymentTransactionId] ON [PaymentRetryAttempts] ([PaymentTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250828194534_FailedPaymentHandlingDunning'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250828194534_FailedPaymentHandlingDunning', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [ContentAlternativeTitles] DROP CONSTRAINT [FK_ContentAlternativeTitles_SearchableContents_ContentId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [ContentStreamingOptions] DROP CONSTRAINT [FK_ContentStreamingOptions_SearchableContents_ContentId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [FailedPayments] DROP CONSTRAINT [FK_FailedPayments_PaymentTransactions_PaymentTransactionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Invoices] DROP CONSTRAINT [FK_Invoices_PaymentTransactions_PaymentTransactionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentRetryAttempts] DROP CONSTRAINT [FK_PaymentRetryAttempts_PaymentTransactions_PaymentTransactionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransactions] DROP CONSTRAINT [FK_PaymentTransactions_AspNetUsers_UserId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransactions] DROP CONSTRAINT [FK_PaymentTransactions_PaymentMethods_PaymentMethodId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransactions] DROP CONSTRAINT [FK_PaymentTransactions_StripeCustomers_StripeCustomerId1];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransactions] DROP CONSTRAINT [FK_PaymentTransactions_Subscriptions_SubscriptionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [WebhookEvents] DROP CONSTRAINT [PK_WebhookEvents];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [SearchableContents] DROP CONSTRAINT [PK_SearchableContents];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransactions] DROP CONSTRAINT [PK_PaymentTransactions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    DECLARE @var2 sysname;
    SELECT @var2 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[BusinessAlerts]') AND [c].[name] = N'Description');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [BusinessAlerts] DROP CONSTRAINT [' + @var2 + '];');
    ALTER TABLE [BusinessAlerts] DROP COLUMN [Description];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    DECLARE @var3 sysname;
    SELECT @var3 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[BusinessAlerts]') AND [c].[name] = N'RecommendedActions');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [BusinessAlerts] DROP CONSTRAINT [' + @var3 + '];');
    ALTER TABLE [BusinessAlerts] DROP COLUMN [RecommendedActions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    DECLARE @var4 sysname;
    SELECT @var4 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[BusinessAlerts]') AND [c].[name] = N'RevenueImpact');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [BusinessAlerts] DROP CONSTRAINT [' + @var4 + '];');
    ALTER TABLE [BusinessAlerts] DROP COLUMN [RevenueImpact];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[WebhookEvents]', N'WebhookEvent', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContents]', N'SearchableContent', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[PaymentTransactions]', N'PaymentTransaction', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[BusinessAlerts].[TriggeredAt]', N'CreatedAt', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[BusinessAlerts].[Title]', N'Message', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[BusinessAlerts].[RequiresAction]', N'IsResolved', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[WebhookEvent].[IX_WebhookEvents_StripeEventId]', N'IX_WebhookEvent_StripeEventId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContent].[IX_SearchableContents_Type_Year]', N'IX_SearchableContent_Type_Year', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContent].[IX_SearchableContents_TmdbId]', N'IX_SearchableContent_TmdbId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContent].[IX_SearchableContents_Title_OriginalTitle]', N'IX_SearchableContent_Title_OriginalTitle', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContent].[IX_SearchableContents_SearchableTitle]', N'IX_SearchableContent_SearchableTitle', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContent].[IX_SearchableContents_Rating_Popularity]', N'IX_SearchableContent_Rating_Popularity', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[SearchableContent].[IX_SearchableContents_CreatedAt_UpdatedAt]', N'IX_SearchableContent_CreatedAt_UpdatedAt', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[PaymentTransaction].[IX_PaymentTransactions_SubscriptionId]', N'IX_PaymentTransaction_SubscriptionId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[PaymentTransaction].[IX_PaymentTransactions_StripePaymentIntentId]', N'IX_PaymentTransaction_StripePaymentIntentId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[PaymentTransaction].[IX_PaymentTransactions_StripeCustomerId1]', N'IX_PaymentTransaction_StripeCustomerId1', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC sp_rename N'[PaymentTransaction].[IX_PaymentTransactions_PaymentMethodId]', N'IX_PaymentTransaction_PaymentMethodId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [CanceledAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [CancellationReason] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [CreatedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [CurrentPeriodEnd] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [CurrentPeriodStart] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [PlanId] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [StartedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [Status] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [StripeSubscriptionId] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSubscriptions] ADD [SubscriptionType] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserStreamingServices] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [EndedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserSessions] ADD [SessionToken] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserAuditLogs] ADD [CorrelationId] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserAuditLogs] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserAuditLogs] ADD [EntityId] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserAuditLogs] ADD [EntityType] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserAuditLogs] ADD [NewValues] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [UserAuditLogs] ADD [OldValues] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [BillingCycle] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [CancellationReason] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [EndDate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [PausedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [ResumeAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [StartDate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [StartedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Subscriptions] ADD [UpdatedDate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [SecurityEvents] ADD [Description] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [SecurityEvents] ADD [Metadata] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [SearchHistories] ADD [Region] nvarchar(10) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentConfigurations] ADD [CreatedBy] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PasswordResetTokens] ADD [Email] nvarchar(255) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PasswordResetTokens] ADD [UsedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [BusinessAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [MarketingNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [PaymentAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [SecurityAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [SmsNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [SystemAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [UpdateNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [UpdatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [UserActionAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    DROP INDEX [IX_BusinessAlert_Active_Type] ON [BusinessAlerts];
    DECLARE @var5 sysname;
    SELECT @var5 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[BusinessAlerts]') AND [c].[name] = N'Type');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [BusinessAlerts] DROP CONSTRAINT [' + @var5 + '];');
    ALTER TABLE [BusinessAlerts] ALTER COLUMN [Type] nvarchar(450) NOT NULL;
    CREATE INDEX [IX_BusinessAlert_Active_Type] ON [BusinessAlerts] ([IsActive], [Type]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    DECLARE @var6 sysname;
    SELECT @var6 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[BusinessAlerts]') AND [c].[name] = N'Severity');
    IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [BusinessAlerts] DROP CONSTRAINT [' + @var6 + '];');
    ALTER TABLE [BusinessAlerts] ALTER COLUMN [Severity] nvarchar(max) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    DECLARE @var7 sysname;
    SELECT @var7 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[BusinessAlerts]') AND [c].[name] = N'BusinessMetrics');
    IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [BusinessAlerts] DROP CONSTRAINT [' + @var7 + '];');
    ALTER TABLE [BusinessAlerts] ALTER COLUMN [BusinessMetrics] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [DateOfBirth] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [LastPasswordChangeDate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [SubscriptionTier] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [ApiUsageRecords] ADD [UserId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [WebhookEvent] ADD [RetryCount] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [WebhookEvent] ADD CONSTRAINT [PK_WebhookEvent] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [SearchableContent] ADD CONSTRAINT [PK_SearchableContent] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransaction] ADD CONSTRAINT [PK_PaymentTransaction] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ABExperiments] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NULL,
        [ActualStartDate] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [TrafficPercentage] float NOT NULL,
        [TrafficAllocation] float NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [VariantA] nvarchar(max) NOT NULL,
        [VariantB] nvarchar(max) NOT NULL,
        [Metadata] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_ABExperiments] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [AdminConfigurationSetting] (
        [Key] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NOT NULL,
        [Type] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [Category] nvarchar(max) NOT NULL,
        [IsEncrypted] bit NOT NULL,
        [IsReadOnly] bit NOT NULL,
        [LastModified] datetime2 NOT NULL,
        [ModifiedBy] uniqueidentifier NULL,
        [ValidationRule] nvarchar(max) NULL,
        [Id] uniqueidentifier NOT NULL,
        [DataType] nvarchar(max) NOT NULL,
        [IsSecure] bit NOT NULL,
        [DefaultValue] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        CONSTRAINT [PK_AdminConfigurationSetting] PRIMARY KEY ([Key])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [AdminDataExports] (
        [Id] uniqueidentifier NOT NULL,
        [ExportType] nvarchar(max) NOT NULL,
        [Format] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [FileName] nvarchar(max) NULL,
        [FilePath] nvarchar(max) NULL,
        [FileSizeBytes] bigint NULL,
        [RecordCount] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        [ExpiresAt] datetime2 NULL,
        [RequestedBy] uniqueidentifier NOT NULL,
        [ErrorMessage] nvarchar(max) NULL,
        [Parameters] nvarchar(max) NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_AdminDataExports] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [AdminNotifications] (
        [Id] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [Severity] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [ActionUrl] nvarchar(max) NULL,
        [Priority] int NOT NULL,
        [Email] nvarchar(max) NULL,
        [CreatedBy] uniqueidentifier NULL,
        [DataJson] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReadAt] datetime2 NULL,
        [IsRead] bit NOT NULL,
        [UserId] uniqueidentifier NULL,
        [CorrelationId] nvarchar(max) NULL,
        CONSTRAINT [PK_AdminNotifications] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [AdminSessions] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [UserEmail] nvarchar(max) NOT NULL,
        [Roles] nvarchar(max) NOT NULL,
        [Permissions] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastActivity] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        [IpAddress] nvarchar(max) NOT NULL,
        [UserAgent] nvarchar(max) NOT NULL,
        [SessionDataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_AdminSessions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [AttributionModels] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [Type] int NOT NULL,
        [Configuration] nvarchar(max) NOT NULL,
        [LookbackWindowDays] int NOT NULL,
        [IsDefault] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_AttributionModels] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [AuditLogs] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Action] nvarchar(100) NOT NULL,
        [EntityType] nvarchar(100) NOT NULL,
        [EntityId] nvarchar(50) NULL,
        [OldValues] nvarchar(max) NULL,
        [NewValues] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IpAddress] nvarchar(50) NULL,
        [UserAgent] nvarchar(500) NULL,
        [CorrelationId] nvarchar(100) NULL,
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AuditLogs_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [CastMember] (
        [PersonId] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        [Character] nvarchar(max) NULL,
        [ProfilePath] nvarchar(max) NULL,
        [Order] int NOT NULL,
        [CreditId] nvarchar(max) NULL,
        [Gender] int NULL,
        CONSTRAINT [PK_CastMember] PRIMARY KEY ([PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ConfigurationBackups] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [ConfigurationData] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_ConfigurationBackups] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ConfigurationChangeHistory] (
        [Id] uniqueidentifier NOT NULL,
        [Key] nvarchar(max) NOT NULL,
        [OldValue] nvarchar(max) NULL,
        [NewValue] nvarchar(max) NULL,
        [ChangedAt] datetime2 NOT NULL,
        [ChangedBy] uniqueidentifier NOT NULL,
        [Reason] nvarchar(max) NULL,
        CONSTRAINT [PK_ConfigurationChangeHistory] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ContentClusters] (
        [Id] int NOT NULL IDENTITY,
        [ClusterName] nvarchar(100) NOT NULL,
        [ContentType] nvarchar(50) NOT NULL,
        [ClusteringCriteria] nvarchar(200) NOT NULL,
        [MaxPagesPerCluster] int NOT NULL,
        [CurrentPageCount] int NOT NULL,
        [IsActive] bit NOT NULL,
        [TitleSimilarityThreshold] real NOT NULL,
        [ContentSimilarityThreshold] real NOT NULL,
        [KeywordOverlapThreshold] real NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_ContentClusters] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ContentMetadata] (
        [Id] int NOT NULL IDENTITY,
        [TmdbId] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [OriginalTitle] nvarchar(max) NULL,
        [Overview] nvarchar(max) NULL,
        [Description] nvarchar(max) NOT NULL,
        [ReleaseDate] datetime2 NULL,
        [Type] int NOT NULL,
        [VoteAverage] float NULL,
        [VoteCount] int NOT NULL,
        [Popularity] float NULL,
        [PosterPath] nvarchar(max) NULL,
        [BackdropPath] nvarchar(max) NULL,
        [Genres] nvarchar(max) NOT NULL,
        [Cast] nvarchar(max) NOT NULL,
        [Crew] nvarchar(max) NOT NULL,
        [ProductionCountries] nvarchar(max) NOT NULL,
        [OriginalLanguages] nvarchar(max) NOT NULL,
        [Runtime] int NULL,
        [NumberOfSeasons] int NULL,
        [NumberOfEpisodes] int NULL,
        [Status] nvarchar(max) NULL,
        [ExternalIds] nvarchar(max) NOT NULL,
        [OriginalLanguage] nvarchar(max) NULL,
        [Adult] bit NOT NULL,
        [Budget] bigint NULL,
        [Revenue] bigint NULL,
        [Tagline] nvarchar(max) NULL,
        [Homepage] nvarchar(max) NULL,
        [ImageUrl] nvarchar(max) NOT NULL,
        [ContentType] nvarchar(max) NOT NULL,
        [Genre] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DataQuality] int NOT NULL,
        [ExternalId] nvarchar(max) NULL,
        [Year] int NULL,
        [Rating] float NULL,
        [PosterUrl] nvarchar(max) NULL,
        [BackdropUrl] nvarchar(max) NULL,
        [LastUpdated] datetime2 NOT NULL,
        [SourceProvider] nvarchar(max) NULL,
        [Keywords] nvarchar(max) NOT NULL,
        [OpenGraphData] nvarchar(max) NOT NULL,
        [TwitterCardData] nvarchar(max) NOT NULL,
        [StructuredData] nvarchar(max) NOT NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_ContentMetadata] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ContentPopularityData] (
        [ContentId] nvarchar(450) NOT NULL,
        [TmdbPopularity] decimal(18,2) NOT NULL,
        [ImdbRating] decimal(18,2) NOT NULL,
        [SearchFrequency] int NOT NULL,
        [ClickCount] int NOT NULL,
        [ViewCount] int NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        [TrendingCountries] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_ContentPopularityData] PRIMARY KEY ([ContentId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ContentSharePerformances] (
        [Id] uniqueidentifier NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [Title] nvarchar(500) NOT NULL,
        [ShareCount] bigint NOT NULL,
        [LastSharedAt] datetime2 NULL,
        [PopularityScore] float NOT NULL,
        [Genre] nvarchar(100) NOT NULL,
        [ReleaseYear] int NULL,
        [Rating] decimal(18,2) NULL,
        [TotalShares] bigint NOT NULL,
        [TotalClicks] bigint NOT NULL,
        [TotalConversions] bigint NOT NULL,
        [ShareVelocity] decimal(18,2) NOT NULL,
        [TopSharingPlatform] nvarchar(100) NOT NULL,
        [PlatformEngagementRate] decimal(18,2) NOT NULL,
        [FirstShareDate] datetime2 NOT NULL,
        [LastShareDate] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ContentSharePerformances] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ContentSharingMetrics] (
        [Id] uniqueidentifier NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [TotalShares] bigint NOT NULL,
        [TotalClicks] bigint NOT NULL,
        [TotalViews] bigint NOT NULL,
        [ShareToViewRatio] decimal(18,2) NOT NULL,
        [ClickThroughRate] decimal(5,4) NOT NULL,
        [ViralCoefficient] decimal(5,4) NOT NULL,
        [ConversionRate] float(5) NOT NULL,
        [TopSharingPlatform] nvarchar(100) NOT NULL,
        [FirstSharedAt] datetime2 NOT NULL,
        [LastSharedAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ContentSharingMetrics] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ContentVariables] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(50) NOT NULL,
        [Value] nvarchar(max) NOT NULL,
        [VariableType] nvarchar(20) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [DataSource] nvarchar(200) NULL,
        [LastRefreshed] datetime2 NULL,
        [RefreshIntervalHours] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ContentVariables] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ConversionFunnels] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [TimeWindowHours] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ConversionFunnels] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [core_web_vitals] (
        [Id] uniqueidentifier NOT NULL,
        [Url] nvarchar(max) NOT NULL,
        [LargestContentfulPaint] float NULL,
        [FirstInputDelay] float NULL,
        [CumulativeLayoutShift] float NULL,
        [FirstContentfulPaint] float NULL,
        [TimeToInteractive] float NULL,
        [PerformanceScore] int NULL,
        [Date] datetime2 NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_core_web_vitals] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [CrewMember] (
        [PersonId] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        [Job] nvarchar(max) NOT NULL,
        [Department] nvarchar(max) NOT NULL,
        [ProfilePath] nvarchar(max) NULL,
        [CreditId] nvarchar(max) NULL,
        [Gender] int NULL,
        CONSTRAINT [PK_CrewMember] PRIMARY KEY ([PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [CustomerBillingAccessLogs] (
        [Id] uniqueidentifier NOT NULL,
        [SupportAgentId] uniqueidentifier NOT NULL,
        [CustomerId] uniqueidentifier NOT NULL,
        [AccessType] nvarchar(100) NOT NULL,
        [AccessedResource] nvarchar(200) NULL,
        [DataMaskingLevel] nvarchar(100) NULL,
        [Justification] nvarchar(1000) NULL,
        [IpAddress] nvarchar(100) NULL,
        [UserAgent] nvarchar(500) NULL,
        [CorrelationId] nvarchar(100) NULL,
        [AccessedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CustomerBillingAccessLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CustomerBillingAccessLogs_AspNetUsers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CustomerBillingAccessLogs_AspNetUsers_SupportAgentId] FOREIGN KEY ([SupportAgentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [Genre] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Genre] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [GrowthEvents] (
        [Id] uniqueidentifier NOT NULL,
        [EventName] nvarchar(100) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [UserId] nvarchar(100) NULL,
        [SessionId] nvarchar(100) NOT NULL,
        [DeviceId] nvarchar(100) NULL,
        [ClientTimestamp] datetime2 NOT NULL,
        [ServerTimestamp] datetime2 NOT NULL,
        [Properties] nvarchar(max) NOT NULL,
        [UtmSource] nvarchar(200) NULL,
        [UtmMedium] nvarchar(200) NULL,
        [UtmCampaign] nvarchar(200) NULL,
        [UtmTerm] nvarchar(200) NULL,
        [UtmContent] nvarchar(200) NULL,
        [Referrer] nvarchar(500) NULL,
        [LandingPage] nvarchar(500) NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(500) NULL,
        [ScreenResolution] nvarchar(20) NULL,
        [ViewportSize] nvarchar(20) NULL,
        [DeviceType] nvarchar(20) NULL,
        [OperatingSystem] nvarchar(50) NULL,
        [Browser] nvarchar(100) NULL,
        [Country] nvarchar(10) NULL,
        [Region] nvarchar(100) NULL,
        [City] nvarchar(100) NULL,
        [EventValue] decimal(18,2) NULL,
        [Currency] nvarchar(10) NULL,
        [Status] int NOT NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [SdkVersion] nvarchar(20) NULL,
        [HasConsent] bit NOT NULL,
        [ConsentCategories] nvarchar(200) NULL,
        CONSTRAINT [PK_GrowthEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [OAuthStates] (
        [Id] uniqueidentifier NOT NULL,
        [StateValue] nvarchar(100) NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [RedirectUrl] nvarchar(2000) NOT NULL,
        [RequestedScopes] nvarchar(500) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsUsed] bit NOT NULL,
        [UsedAt] datetime2 NULL,
        [IpAddress] nvarchar(100) NOT NULL,
        [UserAgent] nvarchar(500) NOT NULL,
        CONSTRAINT [PK_OAuthStates] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [OnboardingSessions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [SessionData] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        [IsCompleted] bit NOT NULL,
        CONSTRAINT [PK_OnboardingSessions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [PaywallEvents] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Event] int NOT NULL,
        [EventData] nvarchar(max) NOT NULL,
        [Region] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CorrelationId] nvarchar(max) NULL,
        [Metadata] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_PaywallEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaywallEvents_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [PersonDetails] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        [Biography] nvarchar(max) NULL,
        [Birthday] datetime2 NULL,
        [Deathday] datetime2 NULL,
        [Gender] int NULL,
        [Homepage] nvarchar(max) NULL,
        [PlaceOfBirth] nvarchar(max) NULL,
        [ProfilePath] nvarchar(max) NULL,
        [AlsoKnownAs] nvarchar(max) NOT NULL,
        [Popularity] float NULL,
        [KnownForDepartment] nvarchar(max) NULL,
        CONSTRAINT [PK_PersonDetails] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ScheduledExports] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [CronExpression] nvarchar(max) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastExecuted] datetime2 NULL,
        [NextExecution] datetime2 NULL,
        [Recipients] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_ScheduledExports] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoKeywords] (
        [Id] int NOT NULL IDENTITY,
        [Keyword] nvarchar(200) NOT NULL,
        [SearchVolume] int NOT NULL,
        [CompetitionScore] real NOT NULL,
        [KeywordDifficulty] real NOT NULL,
        [CostPerClick] decimal(10,4) NULL,
        [TrendingScore] real NOT NULL,
        [TrendingDate] datetime2 NULL,
        [TrendingReason] nvarchar(100) NOT NULL,
        [ContentType] nvarchar(50) NOT NULL,
        [ContentId] nvarchar(50) NULL,
        [Category] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        [LastRankingUpdate] datetime2 NULL,
        [RelatedKeywords] nvarchar(max) NOT NULL DEFAULT N'[]',
        [IsLongTail] bit NOT NULL,
        [WordCount] int NOT NULL,
        CONSTRAINT [PK_SeoKeywords] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoMetadata] (
        [Id] uniqueidentifier NOT NULL,
        [ContentId] uniqueidentifier NULL,
        [ContentType] nvarchar(50) NOT NULL,
        [Slug] nvarchar(200) NOT NULL,
        [Title] nvarchar(70) NOT NULL,
        [Description] nvarchar(170) NOT NULL,
        [Keywords] nvarchar(500) NOT NULL,
        [CanonicalUrl] nvarchar(500) NULL,
        [OgTitle] nvarchar(100) NULL,
        [OgDescription] nvarchar(300) NULL,
        [OgImage] nvarchar(500) NULL,
        [OgType] nvarchar(50) NOT NULL,
        [TwitterCardType] nvarchar(50) NOT NULL,
        [StructuredData] ntext NULL,
        [Priority] decimal(3,2) NOT NULL,
        [ChangeFrequency] nvarchar(20) NOT NULL,
        [IsIndexable] bit NOT NULL,
        [IsFollowable] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        [Language] nvarchar(10) NOT NULL,
        [AlternateLanguages] nvarchar(2000) NULL,
        CONSTRAINT [PK_SeoMetadata] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoMetrics] (
        [Id] uniqueidentifier NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [Date] datetime2 NOT NULL,
        [MetricType] nvarchar(50) NOT NULL,
        [Value] decimal(18,6) NOT NULL,
        [Metadata] nvarchar(1000) NULL,
        [Source] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_SeoMetrics] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoTemplates] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [Template] nvarchar(max) NOT NULL,
        [MetaTitle] nvarchar(200) NOT NULL,
        [MetaDescription] nvarchar(500) NOT NULL,
        [H1Template] nvarchar(200) NOT NULL,
        [UrlPattern] nvarchar(500) NOT NULL,
        [IsActive] bit NOT NULL,
        [Priority] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        [Variables] nvarchar(max) NOT NULL DEFAULT N'{}',
        [IndexPage] bit NOT NULL,
        [FollowLinks] bit NOT NULL,
        [CanonicalPattern] nvarchar(500) NULL,
        [RefreshIntervalHours] int NULL,
        CONSTRAINT [PK_SeoTemplates] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ShareAbTests] (
        [Id] uniqueidentifier NOT NULL,
        [TestName] nvarchar(200) NOT NULL,
        [VariantName] nvarchar(100) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [ConfigurationJson] nvarchar(max) NOT NULL,
        [TrafficPercentage] float NOT NULL,
        [IsActive] bit NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_ShareAbTests] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ShareLinks] (
        [Id] uniqueidentifier NOT NULL,
        [ShortCode] nvarchar(100) NOT NULL,
        [OriginalUrl] nvarchar(2000) NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        [ClickCount] int NOT NULL,
        [LastClickedAt] datetime2 NULL,
        CONSTRAINT [PK_ShareLinks] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SitemapEntries] (
        [Id] uniqueidentifier NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [LastModified] datetime2 NOT NULL,
        [ChangeFrequency] nvarchar(20) NOT NULL,
        [Priority] decimal(3,2) NOT NULL,
        [IsActive] bit NOT NULL,
        [ContentType] nvarchar(50) NOT NULL,
        [ContentId] uniqueidentifier NULL,
        [Language] nvarchar(10) NOT NULL,
        CONSTRAINT [PK_SitemapEntries] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialActivities] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [ActivityType] nvarchar(50) NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [ImageUrl] nvarchar(500) NOT NULL,
        [TargetUrl] nvarchar(2000) NOT NULL,
        [TargetUserId] uniqueidentifier NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsPublic] bit NOT NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialActivities] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialActivities_AspNetUsers_TargetUserId] FOREIGN KEY ([TargetUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_SocialActivities_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialConnections] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [SocialUserId] nvarchar(100) NOT NULL,
        [Username] nvarchar(100) NOT NULL,
        [DisplayName] nvarchar(200) NOT NULL,
        [ProfileImageUrl] nvarchar(500) NOT NULL,
        [Bio] nvarchar(1000) NOT NULL,
        [ConnectedAt] datetime2 NOT NULL,
        [LastTokenRefresh] datetime2 NULL,
        [IsTokenValid] bit NOT NULL,
        [GrantedScopes] nvarchar(500) NOT NULL,
        [FollowersCount] int NOT NULL,
        [FollowingCount] int NOT NULL,
        [IsVerified] bit NOT NULL,
        [ProfileDataJson] nvarchar(max) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SocialConnections] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialConnections_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialGraphConnections] (
        [Id] uniqueidentifier NOT NULL,
        [FromUserId] uniqueidentifier NOT NULL,
        [ToUserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [ConnectionType] nvarchar(50) NOT NULL,
        [Strength] float NOT NULL,
        [EstablishedAt] datetime2 NOT NULL,
        [LastInteractionAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        [IsVerified] bit NOT NULL,
        [ConnectionDataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialGraphConnections] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_FromUserId] FOREIGN KEY ([FromUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_ToUserId] FOREIGN KEY ([ToUserId]) REFERENCES [AspNetUsers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialOAuthTokens] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [EncryptedAccessToken] nvarchar(max) NOT NULL,
        [EncryptedRefreshToken] nvarchar(max) NULL,
        [Scope] nvarchar(500) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [LastRefreshed] datetime2 NULL,
        [LastUsed] datetime2 NULL,
        [TokenType] nvarchar(100) NOT NULL,
        [IsValid] bit NOT NULL,
        [EncryptionKeyId] nvarchar(100) NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialOAuthTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialOAuthTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialPlatformConfigs] (
        [Id] uniqueidentifier NOT NULL,
        [PlatformName] nvarchar(50) NOT NULL,
        [DisplayName] nvarchar(100) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [CharacterLimit] int NOT NULL,
        [SupportsHashtags] bit NOT NULL,
        [SupportsImages] bit NOT NULL,
        [ApiEndpoint] nvarchar(200) NOT NULL,
        [DefaultHashtags] nvarchar(500) NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SocialPlatformConfigs] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialPrivacyConsents] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [AllowSocialDataCollection] bit NOT NULL,
        [AllowFriendDiscovery] bit NOT NULL,
        [AllowSocialRecommendations] bit NOT NULL,
        [AllowActivityTracking] bit NOT NULL,
        [AllowProfileMatching] bit NOT NULL,
        [AllowSocialAnalytics] bit NOT NULL,
        [ShareDataWithThirdParties] bit NOT NULL,
        [SpecificPlatformConsents] nvarchar(1000) NOT NULL,
        [ConsentGivenAt] datetime2 NOT NULL,
        [ConsentRevokedAt] datetime2 NULL,
        [IsGdprCompliant] bit NOT NULL,
        [ConsentVersion] nvarchar(200) NOT NULL,
        [GdprLawfulBasis] nvarchar(100) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SocialPrivacyConsents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialPrivacyConsents_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialRecommendations] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [RecommendationType] nvarchar(50) NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [Score] float NOT NULL,
        [Reason] nvarchar(200) NOT NULL,
        [SourcePlatforms] nvarchar(500) NOT NULL,
        [GeneratedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        [RecommendationDataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialRecommendations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialRecommendations_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialShareEvents] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [ContentDescription] nvarchar(2000) NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [ShareMethod] nvarchar(100) NOT NULL,
        [ShareUrl] nvarchar(2000) NOT NULL,
        [CustomMessage] nvarchar(2000) NOT NULL,
        [Hashtags] nvarchar(500) NOT NULL,
        [UtmCampaign] nvarchar(200) NOT NULL,
        [UtmSource] nvarchar(200) NOT NULL,
        [UtmMedium] nvarchar(200) NOT NULL,
        [UtmContent] nvarchar(500) NOT NULL,
        [IsSuccessful] bit NOT NULL,
        [ErrorMessage] nvarchar(1000) NULL,
        [ErrorCode] nvarchar(100) NULL,
        [DeviceType] nvarchar(100) NOT NULL,
        [UserAgent] nvarchar(200) NOT NULL,
        [IpAddress] nvarchar(100) NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [City] nvarchar(100) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [ShareMessage] nvarchar(2000) NOT NULL,
        [CompletedAt] datetime2 NULL,
        [FailedAt] datetime2 NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        [ClickCount] int NOT NULL,
        [ShareId] nvarchar(max) NOT NULL,
        [EventType] nvarchar(max) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        CONSTRAINT [PK_SocialShareEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialShareEvents_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialShares] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [ShareUrl] nvarchar(2000) NOT NULL,
        [IsSuccessful] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ShareClicks] int NOT NULL,
        [ClickCount] int NOT NULL,
        CONSTRAINT [PK_SocialShares] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SocialSharingPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EnableAnalyticsTracking] bit NOT NULL,
        [ShareUserInfo] bit NOT NULL,
        [EnableLocationTracking] bit NOT NULL,
        [PreferredPlatforms] nvarchar(1000) NOT NULL,
        [DefaultHashtags] nvarchar(500) NOT NULL,
        [EnableCustomMessages] bit NOT NULL,
        [EnableViralIncentives] bit NOT NULL,
        [AllowSocialSharing] bit NOT NULL,
        [ShareWithPersonalInfo] bit NOT NULL,
        [AllowShareAnalytics] bit NOT NULL,
        [AutoGenerateHashtags] bit NOT NULL,
        [PlatformPreferences] nvarchar(2000) NOT NULL,
        [CustomShareTemplates] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SocialSharingPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialSharingPreferences_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [StreamingContents] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(500) NULL,
        [ContentType] nvarchar(50) NULL,
        [Genre] nvarchar(50) NULL,
        [Rating] nvarchar(10) NULL,
        [ReleaseDate] datetime2 NULL,
        [Director] nvarchar(200) NULL,
        [Duration] int NULL,
        [PosterUrl] nvarchar(500) NULL,
        [StreamingUrls] nvarchar(1000) NULL,
        [IsAvailable] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_StreamingContents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SubscriptionPlans] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Price] decimal(18,2) NOT NULL,
        [Currency] nvarchar(10) NOT NULL,
        [BillingPeriod] nvarchar(50) NOT NULL,
        [Tier] int NOT NULL,
        [IsActive] bit NOT NULL,
        [StripePriceId] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [MaxSearchResultsPerQuery] int NOT NULL,
        [MaxDailySearches] int NOT NULL,
        [CanViewStreamingUrls] bit NOT NULL,
        [CanViewPricing] bit NOT NULL,
        [CanAccessAdvancedFilters] bit NOT NULL,
        [Interval] nvarchar(max) NOT NULL,
        [Features] nvarchar(max) NOT NULL,
        [BillingCycle] nvarchar(max) NULL,
        CONSTRAINT [PK_SubscriptionPlans] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SupportActions] (
        [Id] uniqueidentifier NOT NULL,
        [ActionType] int NOT NULL,
        [Status] int NOT NULL,
        [Priority] int NOT NULL,
        [SupportAgentId] uniqueidentifier NOT NULL,
        [TargetUserId] uniqueidentifier NOT NULL,
        [Title] nvarchar(500) NOT NULL,
        [Description] nvarchar(2000) NOT NULL,
        [Reason] nvarchar(2000) NULL,
        [Notes] nvarchar(2000) NULL,
        [CorrelationId] nvarchar(100) NULL,
        [PaymentTransactionId] uniqueidentifier NULL,
        [SubscriptionId] uniqueidentifier NULL,
        [InvoiceId] uniqueidentifier NULL,
        [RefundId] uniqueidentifier NULL,
        [ApprovedBy] uniqueidentifier NULL,
        [ApprovedAt] datetime2 NULL,
        [RejectedBy] uniqueidentifier NULL,
        [RejectedAt] datetime2 NULL,
        [ApprovalNotes] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        [MetadataJson] nvarchar(max) NOT NULL DEFAULT N'{}',
        CONSTRAINT [PK_SupportActions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SupportActions_AspNetUsers_ApprovedBy] FOREIGN KEY ([ApprovedBy]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_SupportActions_AspNetUsers_RejectedBy] FOREIGN KEY ([RejectedBy]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_SupportActions_AspNetUsers_SupportAgentId] FOREIGN KEY ([SupportAgentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SupportActions_AspNetUsers_TargetUserId] FOREIGN KEY ([TargetUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SupportActions_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]),
        CONSTRAINT [FK_SupportActions_PaymentTransaction_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransaction] ([Id]),
        CONSTRAINT [FK_SupportActions_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SystemAlerts] (
        [Id] uniqueidentifier NOT NULL,
        [Type] nvarchar(450) NOT NULL,
        [Severity] nvarchar(450) NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ResolvedAt] datetime2 NULL,
        [IsResolved] bit NOT NULL,
        [Metadata] nvarchar(max) NULL,
        CONSTRAINT [PK_SystemAlerts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [TypoCorrection] (
        [OriginalQuery] nvarchar(450) NOT NULL,
        [CorrectedQuery] nvarchar(450) NOT NULL,
        [Confidence] decimal(18,2) NOT NULL,
        [SuggestedAlternatives] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_TypoCorrection] PRIMARY KEY ([OriginalQuery], [CorrectedQuery])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [UserPreferences] (
        [UserId] nvarchar(450) NOT NULL,
        [PreferredGenres] nvarchar(max) NOT NULL,
        [PreferredServices] nvarchar(max) NOT NULL,
        [PreferredCountries] nvarchar(max) NOT NULL,
        [PreferredContentType] int NOT NULL,
        [MinRating] int NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_UserPreferences] PRIMARY KEY ([UserId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ViralMetrics] (
        [Id] uniqueidentifier NOT NULL,
        [MetricDate] datetime2 NOT NULL,
        [MetricType] nvarchar(50) NOT NULL,
        [Platform] nvarchar(100) NOT NULL,
        [TotalShares] bigint NOT NULL,
        [TotalClicks] bigint NOT NULL,
        [TotalRegistrations] bigint NOT NULL,
        [TotalSubscriptions] bigint NOT NULL,
        [ViralCoefficient] decimal(18,2) NOT NULL,
        [ShareToClickRate] decimal(18,2) NOT NULL,
        [ClickToRegistrationRate] decimal(18,2) NOT NULL,
        [RegistrationToSubscriptionRate] decimal(18,2) NOT NULL,
        [AverageSharesPerUser] decimal(18,2) NOT NULL,
        [AverageClicksPerShare] decimal(18,2) NOT NULL,
        [UniqueSharers] bigint NOT NULL,
        [UniqueClickers] bigint NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ViralMetrics] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ExperimentAssignments] (
        [Id] uniqueidentifier NOT NULL,
        [ExperimentId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [AssignedVariant] nvarchar(100) NOT NULL,
        [SessionId] nvarchar(100) NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ExperimentAssignments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExperimentAssignments_ABExperiments_ExperimentId] FOREIGN KEY ([ExperimentId]) REFERENCES [ABExperiments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ExperimentEvents] (
        [Id] uniqueidentifier NOT NULL,
        [ExperimentId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [AssignedVariant] nvarchar(100) NOT NULL,
        [EventName] nvarchar(100) NOT NULL,
        [Value] float NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [Properties] nvarchar(2000) NULL,
        CONSTRAINT [PK_ExperimentEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExperimentEvents_ABExperiments_ExperimentId] FOREIGN KEY ([ExperimentId]) REFERENCES [ABExperiments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ExperimentVariants] (
        [Id] uniqueidentifier NOT NULL,
        [ExperimentId] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [Configuration] nvarchar(max) NOT NULL,
        [AllocationPercentage] float NOT NULL,
        [TrafficPercentage] float NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ExperimentVariants] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExperimentVariants_ABExperiments_ExperimentId] FOREIGN KEY ([ExperimentId]) REFERENCES [ABExperiments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [FunnelSteps] (
        [Id] uniqueidentifier NOT NULL,
        [FunnelId] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Order] int NOT NULL,
        [EventNames] nvarchar(max) NOT NULL,
        [Filters] nvarchar(max) NULL,
        [IsRequired] bit NOT NULL,
        [TargetRate] decimal(18,2) NULL,
        CONSTRAINT [PK_FunnelSteps] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FunnelSteps_ConversionFunnels_FunnelId] FOREIGN KEY ([FunnelId]) REFERENCES [ConversionFunnels] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [TmdbExternalId] (
        [Source] nvarchar(450) NOT NULL,
        [ExternalIdValue] nvarchar(450) NOT NULL,
        [PersonDetailsId] int NULL,
        CONSTRAINT [PK_TmdbExternalId] PRIMARY KEY ([Source], [ExternalIdValue]),
        CONSTRAINT [FK_TmdbExternalId_PersonDetails_PersonDetailsId] FOREIGN KEY ([PersonDetailsId]) REFERENCES [PersonDetails] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoBatchJobs] (
        [Id] bigint NOT NULL IDENTITY,
        [JobName] nvarchar(200) NOT NULL,
        [TemplateId] int NOT NULL,
        [TotalPages] int NOT NULL,
        [CompletedPages] int NOT NULL,
        [FailedPages] int NOT NULL,
        [Status] nvarchar(450) NOT NULL,
        [ErrorLog] nvarchar(max) NULL,
        [Configuration] nvarchar(max) NOT NULL DEFAULT N'{}',
        [BatchSize] int NOT NULL,
        [ConcurrencyLimit] int NOT NULL,
        [EstimatedDuration] time NULL,
        [CreatedAt] datetime2 NOT NULL,
        [StartedAt] datetime2 NULL,
        [CompletedAt] datetime2 NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_SeoBatchJobs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SeoBatchJobs_SeoTemplates_TemplateId] FOREIGN KEY ([TemplateId]) REFERENCES [SeoTemplates] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoPages] (
        [Id] bigint NOT NULL IDENTITY,
        [TemplateId] int NOT NULL,
        [Slug] nvarchar(500) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [MetaTitle] nvarchar(200) NOT NULL,
        [MetaDescription] nvarchar(500) NOT NULL,
        [H1] nvarchar(200) NOT NULL,
        [CanonicalUrl] nvarchar(500) NULL,
        [VariableValues] nvarchar(max) NOT NULL DEFAULT N'{}',
        [ViewCount] int NOT NULL,
        [LastViewed] datetime2 NULL,
        [LastIndexed] datetime2 NULL,
        [SearchRanking] real NULL,
        [PrimaryKeyword] nvarchar(200) NULL,
        [KeywordDensity] int NOT NULL,
        [WordCount] int NOT NULL,
        [ReadingTimeMinutes] int NOT NULL,
        [GeneratedAt] datetime2 NOT NULL,
        [LastUpdated] datetime2 NULL,
        [IsPublished] bit NOT NULL,
        [GenerationTime] time NULL,
        [GenerationLog] nvarchar(max) NULL,
        [ContentClusterId] int NULL,
        CONSTRAINT [PK_SeoPages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SeoPages_ContentClusters_ContentClusterId] FOREIGN KEY ([ContentClusterId]) REFERENCES [ContentClusters] ([Id]),
        CONSTRAINT [FK_SeoPages_SeoTemplates_TemplateId] FOREIGN KEY ([TemplateId]) REFERENCES [SeoTemplates] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ShareAbTestParticipations] (
        [Id] uniqueidentifier NOT NULL,
        [TestId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [VariantAssigned] nvarchar(100) NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        [HasShared] bit NOT NULL,
        [FirstShareAt] datetime2 NULL,
        [TotalShares] int NOT NULL,
        [TotalClicks] int NOT NULL,
        [TotalConversions] int NOT NULL,
        CONSTRAINT [PK_ShareAbTestParticipations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShareAbTestParticipations_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ShareAbTestParticipations_ShareAbTests_TestId] FOREIGN KEY ([TestId]) REFERENCES [ShareAbTests] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ShareClickEvents] (
        [Id] uniqueidentifier NOT NULL,
        [ShareEventId] uniqueidentifier NOT NULL,
        [ClickerUserId] uniqueidentifier NULL,
        [SessionId] nvarchar(100) NOT NULL,
        [ReferrerUrl] nvarchar(2000) NOT NULL,
        [Platform] nvarchar(100) NOT NULL,
        [DeviceType] nvarchar(100) NOT NULL,
        [UserAgent] nvarchar(200) NOT NULL,
        [IpAddress] nvarchar(100) NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [City] nvarchar(100) NOT NULL,
        [IsNewUser] bit NOT NULL,
        [ResultedInRegistration] bit NOT NULL,
        [ResultedInSubscription] bit NOT NULL,
        [RegistrationDate] datetime2 NULL,
        [SubscriptionDate] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_ShareClickEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShareClickEvents_AspNetUsers_ClickerUserId] FOREIGN KEY ([ClickerUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_ShareClickEvents_SocialShareEvents_ShareEventId] FOREIGN KEY ([ShareEventId]) REFERENCES [SocialShareEvents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ShareLinkClicks] (
        [Id] uniqueidentifier NOT NULL,
        [ShareEventId] uniqueidentifier NOT NULL,
        [IpAddress] nvarchar(100) NOT NULL,
        [UserAgent] nvarchar(200) NOT NULL,
        [Referer] nvarchar(2000) NOT NULL,
        [UserId] uniqueidentifier NULL,
        [ResultedInRegistration] bit NOT NULL,
        [RegistrationDate] datetime2 NOT NULL,
        [ClickedAt] datetime2 NOT NULL,
        [CountryCode] nvarchar(10) NOT NULL,
        [RefererUrl] nvarchar(2000) NOT NULL,
        [ConvertedToRegistration] bit NOT NULL,
        [ConvertedUserId] uniqueidentifier NULL,
        [ConversionDate] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        [ShareLinkId] uniqueidentifier NULL,
        CONSTRAINT [PK_ShareLinkClicks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShareLinkClicks_AspNetUsers_ConvertedUserId] FOREIGN KEY ([ConvertedUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_ShareLinkClicks_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_ShareLinkClicks_ShareLinks_ShareLinkId] FOREIGN KEY ([ShareLinkId]) REFERENCES [ShareLinks] ([Id]),
        CONSTRAINT [FK_ShareLinkClicks_SocialShareEvents_ShareEventId] FOREIGN KEY ([ShareEventId]) REFERENCES [SocialShareEvents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [ShareLinkMappings] (
        [Id] uniqueidentifier NOT NULL,
        [ShortCode] nvarchar(100) NOT NULL,
        [OriginalUrl] nvarchar(2000) NOT NULL,
        [ShareEventId] uniqueidentifier NOT NULL,
        [ClickCount] bigint NOT NULL,
        [IsActive] bit NOT NULL,
        [ExpiresAt] datetime2 NULL,
        [LastClickedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CorrelationId] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_ShareLinkMappings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShareLinkMappings_SocialShareEvents_ShareEventId] FOREIGN KEY ([ShareEventId]) REFERENCES [SocialShareEvents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SupportActionAuditLogs] (
        [Id] uniqueidentifier NOT NULL,
        [SupportActionId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Event] nvarchar(100) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [OldValues] nvarchar(1000) NULL,
        [NewValues] nvarchar(1000) NULL,
        [IpAddress] nvarchar(100) NULL,
        [UserAgent] nvarchar(500) NULL,
        [CorrelationId] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SupportActionAuditLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SupportActionAuditLogs_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SupportActionAuditLogs_SupportActions_SupportActionId] FOREIGN KEY ([SupportActionId]) REFERENCES [SupportActions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SupportRefunds] (
        [Id] uniqueidentifier NOT NULL,
        [SupportActionId] uniqueidentifier NOT NULL,
        [PaymentTransactionId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [RefundAmount] decimal(18,2) NOT NULL,
        [OriginalAmount] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [RefundMethod] nvarchar(100) NOT NULL,
        [StripeRefundId] nvarchar(100) NULL,
        [Reason] nvarchar(1000) NULL,
        [InternalNotes] nvarchar(2000) NULL,
        [CustomerNotes] nvarchar(2000) NULL,
        [ProcessedAt] datetime2 NULL,
        [ProcessedBy] uniqueidentifier NULL,
        [ProcessingError] nvarchar(1000) NULL,
        [CorrelationId] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [MetadataJson] nvarchar(max) NOT NULL DEFAULT N'{}',
        CONSTRAINT [PK_SupportRefunds] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SupportRefunds_AspNetUsers_ProcessedBy] FOREIGN KEY ([ProcessedBy]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_SupportRefunds_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SupportRefunds_PaymentTransaction_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransaction] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SupportRefunds_SupportActions_SupportActionId] FOREIGN KEY ([SupportActionId]) REFERENCES [SupportActions] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE TABLE [SeoPerformanceMetrics] (
        [Id] bigint NOT NULL IDENTITY,
        [PageId] bigint NOT NULL,
        [DailyViews] int NOT NULL,
        [WeeklyViews] int NOT NULL,
        [MonthlyViews] int NOT NULL,
        [UniqueVisitors] int NOT NULL,
        [BounceRate] real NOT NULL,
        [AverageTimeOnPage] time NOT NULL,
        [SearchImpressions] int NOT NULL,
        [SearchClicks] int NOT NULL,
        [AveragePosition] real NOT NULL,
        [BacklinkCount] int NOT NULL,
        [InternalLinkCount] int NOT NULL,
        [SocialShares] int NOT NULL,
        [ContentQualityScore] real NOT NULL,
        [MetricDate] datetime2 NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_SeoPerformanceMetrics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SeoPerformanceMetrics_SeoPages_PageId] FOREIGN KEY ([PageId]) REFERENCES [SeoPages] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ABExperiments_IsActive] ON [ABExperiments] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ABExperiments_Status] ON [ABExperiments] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_UserId] ON [AuditLogs] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ContentClusters_ClusterName] ON [ContentClusters] ([ClusterName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ContentClusters_IsActive] ON [ContentClusters] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ContentVariables_Category] ON [ContentVariables] ([Category]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ContentVariables_IsActive] ON [ContentVariables] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ContentVariables_Name] ON [ContentVariables] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_CustomerBillingAccessLog_AccessType_AccessedAt] ON [CustomerBillingAccessLogs] ([AccessType], [AccessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_CustomerBillingAccessLog_CorrelationId] ON [CustomerBillingAccessLogs] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_CustomerBillingAccessLog_Customer_AccessedAt] ON [CustomerBillingAccessLogs] ([CustomerId], [AccessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_CustomerBillingAccessLog_SupportAgent_AccessedAt] ON [CustomerBillingAccessLogs] ([SupportAgentId], [AccessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ExperimentAssignments_ExperimentId_UserId] ON [ExperimentAssignments] ([ExperimentId], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ExperimentAssignments_UserId] ON [ExperimentAssignments] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ExperimentEvents_ExperimentId] ON [ExperimentEvents] ([ExperimentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ExperimentVariants_ExperimentId] ON [ExperimentVariants] ([ExperimentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_FunnelSteps_FunnelId] ON [FunnelSteps] ([FunnelId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_PaywallEvents_UserId] ON [PaywallEvents] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoBatchJobs_CreatedAt] ON [SeoBatchJobs] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoBatchJobs_Status] ON [SeoBatchJobs] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoBatchJobs_TemplateId] ON [SeoBatchJobs] ([TemplateId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoKeywords_CompetitionScore] ON [SeoKeywords] ([CompetitionScore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SeoKeywords_Keyword] ON [SeoKeywords] ([Keyword]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoKeywords_SearchVolume] ON [SeoKeywords] ([SearchVolume]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoMetadata_ContentId_ContentType] ON [SeoMetadata] ([ContentId], [ContentType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoMetadata_IsActive] ON [SeoMetadata] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoMetadata_LastUpdated] ON [SeoMetadata] ([LastUpdated]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SeoMetadata_Slug] ON [SeoMetadata] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoMetrics_Date] ON [SeoMetrics] ([Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoMetrics_MetricType] ON [SeoMetrics] ([MetricType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoMetrics_Url] ON [SeoMetrics] ([Url]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoPages_ContentClusterId] ON [SeoPages] ([ContentClusterId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoPages_GeneratedAt] ON [SeoPages] ([GeneratedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoPages_IsPublished] ON [SeoPages] ([IsPublished]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SeoPages_Slug] ON [SeoPages] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoPages_TemplateId] ON [SeoPages] ([TemplateId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoPages_ViewCount] ON [SeoPages] ([ViewCount]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoPerformanceMetrics_PageId] ON [SeoPerformanceMetrics] ([PageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoTemplates_CreatedAt] ON [SeoTemplates] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoTemplates_IsActive] ON [SeoTemplates] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SeoTemplates_Type] ON [SeoTemplates] ([Type]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareAbTestParticipations_TestId] ON [ShareAbTestParticipations] ([TestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareAbTestParticipations_UserId] ON [ShareAbTestParticipations] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareClickEvents_ClickerUserId] ON [ShareClickEvents] ([ClickerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareClickEvents_ShareEventId] ON [ShareClickEvents] ([ShareEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkClick_ConvertedToRegistration] ON [ShareLinkClicks] ([ConvertedToRegistration]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkClick_ShareEvent_ClickedAt] ON [ShareLinkClicks] ([ShareEventId], [ClickedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkClicks_ConvertedUserId] ON [ShareLinkClicks] ([ConvertedUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkClicks_ShareLinkId] ON [ShareLinkClicks] ([ShareLinkId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkClicks_UserId] ON [ShareLinkClicks] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkMapping_CreatedAt_IsActive] ON [ShareLinkMappings] ([CreatedAt], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ShareLinkMapping_ShortCode] ON [ShareLinkMappings] ([ShortCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_ShareLinkMappings_ShareEventId] ON [ShareLinkMappings] ([ShareEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SitemapEntries_ChangeFrequency_Priority] ON [SitemapEntries] ([ChangeFrequency], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SitemapEntries_LastModified] ON [SitemapEntries] ([LastModified]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SitemapEntries_Url] ON [SitemapEntries] ([Url]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialActivities_TargetUserId] ON [SocialActivities] ([TargetUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialActivities_UserId] ON [SocialActivities] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialConnections_UserId] ON [SocialConnections] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_FromUserId] ON [SocialGraphConnections] ([FromUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_ToUserId] ON [SocialGraphConnections] ([ToUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialOAuthTokens_UserId] ON [SocialOAuthTokens] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialPrivacyConsents_UserId] ON [SocialPrivacyConsents] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialRecommendations_UserId] ON [SocialRecommendations] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialShareEvent_Content_Platform] ON [SocialShareEvents] ([ContentId], [Platform]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialShareEvent_Status] ON [SocialShareEvents] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SocialShareEvent_User_CreatedAt] ON [SocialShareEvents] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SocialSharingPreferences_UserId] ON [SocialSharingPreferences] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActionAuditLog_Action_CreatedAt] ON [SupportActionAuditLogs] ([SupportActionId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActionAuditLog_CorrelationId] ON [SupportActionAuditLogs] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActionAuditLog_User_CreatedAt] ON [SupportActionAuditLogs] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportAction_ActionType_Status] ON [SupportActions] ([ActionType], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportAction_CorrelationId] ON [SupportActions] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_SupportAction_PendingActions] ON [SupportActions] ([Status], [CreatedAt]) WHERE [Status] IN (0, 5)');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportAction_Status_Priority] ON [SupportActions] ([Status], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportAction_SupportAgent_CreatedAt] ON [SupportActions] ([SupportAgentId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportAction_TargetUser_CreatedAt] ON [SupportActions] ([TargetUserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActions_ApprovedBy] ON [SupportActions] ([ApprovedBy]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActions_InvoiceId] ON [SupportActions] ([InvoiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActions_PaymentTransactionId] ON [SupportActions] ([PaymentTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActions_RejectedBy] ON [SupportActions] ([RejectedBy]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportActions_SubscriptionId] ON [SupportActions] ([SubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportRefund_CorrelationId] ON [SupportRefunds] ([CorrelationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportRefund_Status_CreatedAt] ON [SupportRefunds] ([Status], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_SupportRefund_StripeRefundId] ON [SupportRefunds] ([StripeRefundId]) WHERE [StripeRefundId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportRefund_User_CreatedAt] ON [SupportRefunds] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportRefunds_PaymentTransactionId] ON [SupportRefunds] ([PaymentTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportRefunds_ProcessedBy] ON [SupportRefunds] ([ProcessedBy]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SupportRefunds_SupportActionId] ON [SupportRefunds] ([SupportActionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SystemAlerts_CreatedAt] ON [SystemAlerts] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SystemAlerts_IsResolved] ON [SystemAlerts] ([IsResolved]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SystemAlerts_Severity] ON [SystemAlerts] ([Severity]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_SystemAlerts_Type] ON [SystemAlerts] ([Type]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    CREATE INDEX [IX_TmdbExternalId_PersonDetailsId] ON [TmdbExternalId] ([PersonDetailsId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [ContentAlternativeTitles] ADD CONSTRAINT [FK_ContentAlternativeTitles_SearchableContent_ContentId] FOREIGN KEY ([ContentId]) REFERENCES [SearchableContent] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [ContentStreamingOptions] ADD CONSTRAINT [FK_ContentStreamingOptions_SearchableContent_ContentId] FOREIGN KEY ([ContentId]) REFERENCES [SearchableContent] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [FailedPayments] ADD CONSTRAINT [FK_FailedPayments_PaymentTransaction_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransaction] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [Invoices] ADD CONSTRAINT [FK_Invoices_PaymentTransaction_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransaction] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentRetryAttempts] ADD CONSTRAINT [FK_PaymentRetryAttempts_PaymentTransaction_PaymentTransactionId] FOREIGN KEY ([PaymentTransactionId]) REFERENCES [PaymentTransaction] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransaction] ADD CONSTRAINT [FK_PaymentTransaction_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransaction] ADD CONSTRAINT [FK_PaymentTransaction_PaymentMethods_PaymentMethodId] FOREIGN KEY ([PaymentMethodId]) REFERENCES [PaymentMethods] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransaction] ADD CONSTRAINT [FK_PaymentTransaction_StripeCustomers_StripeCustomerId1] FOREIGN KEY ([StripeCustomerId1]) REFERENCES [StripeCustomers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    ALTER TABLE [PaymentTransaction] ADD CONSTRAINT [FK_PaymentTransaction_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909193506_GrowthAnalyticsTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250909193506_GrowthAnalyticsTables', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [WatchlistCategories] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [Color] nvarchar(7) NULL,
        [Icon] nvarchar(50) NULL,
        [UserId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_WatchlistCategories] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistCategories_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [WatchlistNotificationSettings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [NotifyOnAvailabilityChange] bit NOT NULL,
        [NotifyOnNewReleases] bit NOT NULL,
        [NotifyOnPriceDrops] bit NOT NULL,
        [NotifyOnSharedWatchlist] bit NOT NULL,
        [NotifyOnRecommendations] bit NOT NULL,
        [PreferredNotificationMethod] nvarchar(20) NOT NULL,
        [QuietHoursStart] time NULL,
        [QuietHoursEnd] time NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_WatchlistNotificationSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistNotificationSettings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [Watchlists] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [UserId] uniqueidentifier NOT NULL,
        [CategoryId] uniqueidentifier NULL,
        [IsPublic] bit NOT NULL,
        [IsDefault] bit NOT NULL,
        [IsFavorite] bit NOT NULL,
        [SortOrder] nvarchar(50) NOT NULL,
        [SortDirection] nvarchar(10) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        CONSTRAINT [PK_Watchlists] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Watchlists_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Watchlists_WatchlistCategories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [WatchlistCategories] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [WatchlistItems] (
        [Id] uniqueidentifier NOT NULL,
        [WatchlistId] uniqueidentifier NOT NULL,
        [ContentType] nvarchar(20) NOT NULL,
        [ContentId] nvarchar(50) NOT NULL,
        [Title] nvarchar(500) NOT NULL,
        [Overview] nvarchar(1000) NULL,
        [PosterUrl] nvarchar(500) NULL,
        [BackdropUrl] nvarchar(500) NULL,
        [ReleaseYear] int NULL,
        [Rating] decimal(18,2) NULL,
        [Runtime] int NULL,
        [Genres] nvarchar(1000) NULL,
        [StreamingServices] nvarchar(1000) NULL,
        [Status] nvarchar(100) NULL,
        [Priority] int NOT NULL,
        [IsWatched] bit NOT NULL,
        [WatchedAt] datetime2 NULL,
        [UserRating] decimal(18,2) NULL,
        [UserNotes] nvarchar(2000) NULL,
        [Tags] nvarchar(1000) NULL,
        [AddedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [AddedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [IsCurrentlyAvailable] bit NOT NULL,
        [LastAvailabilityCheck] datetime2 NULL,
        [AvailabilityData] nvarchar(2000) NULL,
        CONSTRAINT [PK_WatchlistItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistItems_Watchlists_WatchlistId] FOREIGN KEY ([WatchlistId]) REFERENCES [Watchlists] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [WatchlistShares] (
        [Id] uniqueidentifier NOT NULL,
        [WatchlistId] uniqueidentifier NOT NULL,
        [SharedWithUserId] uniqueidentifier NULL,
        [SharedWithEmail] nvarchar(500) NULL,
        [PermissionLevel] nvarchar(20) NOT NULL,
        [ShareToken] nvarchar(100) NULL,
        [IsActive] bit NOT NULL,
        [ExpiresAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        [AcceptedAt] datetime2 NULL,
        [LastAccessedAt] datetime2 NULL,
        CONSTRAINT [PK_WatchlistShares] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistShares_AspNetUsers_SharedWithUserId] FOREIGN KEY ([SharedWithUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_WatchlistShares_Watchlists_WatchlistId] FOREIGN KEY ([WatchlistId]) REFERENCES [Watchlists] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [WatchlistActivities] (
        [Id] uniqueidentifier NOT NULL,
        [WatchlistId] uniqueidentifier NOT NULL,
        [WatchlistItemId] uniqueidentifier NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ActivityType] nvarchar(50) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [Metadata] nvarchar(2000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_WatchlistActivities] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistActivities_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WatchlistActivities_WatchlistItems_WatchlistItemId] FOREIGN KEY ([WatchlistItemId]) REFERENCES [WatchlistItems] ([Id]),
        CONSTRAINT [FK_WatchlistActivities_Watchlists_WatchlistId] FOREIGN KEY ([WatchlistId]) REFERENCES [Watchlists] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE TABLE [WatchlistItemAvailabilities] (
        [Id] uniqueidentifier NOT NULL,
        [WatchlistItemId] uniqueidentifier NOT NULL,
        [ServiceName] nvarchar(100) NOT NULL,
        [CountryCode] nvarchar(10) NOT NULL,
        [AvailabilityType] nvarchar(20) NOT NULL,
        [Price] decimal(18,2) NULL,
        [Currency] nvarchar(10) NULL,
        [StreamingUrl] nvarchar(500) NULL,
        [AvailableFrom] datetime2 NOT NULL,
        [AvailableUntil] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [AdditionalData] nvarchar(1000) NULL,
        CONSTRAINT [PK_WatchlistItemAvailabilities] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistItemAvailabilities_WatchlistItems_WatchlistItemId] FOREIGN KEY ([WatchlistItemId]) REFERENCES [WatchlistItems] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistActivities_UserId] ON [WatchlistActivities] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistActivities_WatchlistId] ON [WatchlistActivities] ([WatchlistId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistActivities_WatchlistItemId] ON [WatchlistActivities] ([WatchlistItemId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistCategories_UserId] ON [WatchlistCategories] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistItemAvailabilities_WatchlistItemId] ON [WatchlistItemAvailabilities] ([WatchlistItemId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistItems_WatchlistId] ON [WatchlistItems] ([WatchlistId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistNotificationSettings_UserId] ON [WatchlistNotificationSettings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_Watchlists_CategoryId] ON [Watchlists] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_Watchlists_UserId] ON [Watchlists] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistShares_SharedWithUserId] ON [WatchlistShares] ([SharedWithUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    CREATE INDEX [IX_WatchlistShares_WatchlistId] ON [WatchlistShares] ([WatchlistId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250909233116_WatchlistSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250909233116_WatchlistSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [AggregateNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [AllowUnsubscribeFromAll] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [AvailabilityChangeFrequency] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [DigestDeliveryTime] time NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [DigestNotificationMethod] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnablePredictiveNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnableSmartTiming] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [ExcludedGenresJson] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [IncludeImages] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [IncludePreviews] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [MaxNotificationsPerDay] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [MaxNotificationsPerHour] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [MinimumRating] decimal(18,2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [MonthlyDigest] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [MonthlyDigestDay] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [NotificationGenresJson] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [NotificationTone] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [NotifyOnContentExpiring] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [NotifyOnLeavingPlatform] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [NotifyOnRegionalChanges] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [PreferredServicesJson] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [PriceDropFrequency] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [RecommendationFrequency] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [UnsubscribeFromAllDate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [UnsubscribeReason] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [UnsubscribedNotificationTypesJson] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [UrgentNotificationMethod] nvarchar(20) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [WeeklyDigest] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [WeeklyDigestDay] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    CREATE TABLE [NotificationDeliveryLogs] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [NotificationType] nvarchar(50) NOT NULL,
        [DeliveryMethod] nvarchar(20) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [DeliveredAt] datetime2 NOT NULL,
        [OpenedAt] datetime2 NULL,
        [ClickedAt] datetime2 NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [ExternalId] nvarchar(50) NULL,
        [Platform] nvarchar(100) NULL,
        [DeviceType] nvarchar(100) NULL,
        [AppVersion] nvarchar(10) NULL,
        [MetadataJson] nvarchar(max) NULL,
        CONSTRAINT [PK_NotificationDeliveryLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationDeliveryLogs_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    CREATE INDEX [IX_NotificationDeliveryLogs_UserId] ON [NotificationDeliveryLogs] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250910031404_US82_EnhancedNotificationSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250910031404_US82_EnhancedNotificationSystem', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [ContentAlternativeTitles] DROP CONSTRAINT [FK_ContentAlternativeTitles_SearchableContent_ContentId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [ContentStreamingOptions] DROP CONSTRAINT [FK_ContentStreamingOptions_SearchableContent_ContentId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialActivities] DROP CONSTRAINT [FK_SocialActivities_AspNetUsers_TargetUserId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialGraphConnections] DROP CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_FromUserId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialGraphConnections] DROP CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_ToUserId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [UserActivityLogs] DROP CONSTRAINT [FK_UserActivityLogs_AspNetUsers_UserId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP TABLE [SocialOAuthTokens];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_WatchlistNotificationSettings_UserId] ON [WatchlistNotificationSettings];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialRecommendations_UserId] ON [SocialRecommendations];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialPrivacyConsents_UserId] ON [SocialPrivacyConsents];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialGraphConnections_FromUserId] ON [SocialGraphConnections];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialGraphConnections_ToUserId] ON [SocialGraphConnections];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialConnections_UserId] ON [SocialConnections];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialActivities_TargetUserId] ON [SocialActivities];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DROP INDEX [IX_SocialActivities_UserId] ON [SocialActivities];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [UserActivityLogs] DROP CONSTRAINT [PK_UserActivityLogs];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigs] DROP CONSTRAINT [PK_SocialPlatformConfigs];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SearchableContent] DROP CONSTRAINT [PK_SearchableContent];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var8 sysname;
    SELECT @var8 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'AppVersion');
    IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var8 + '];');
    ALTER TABLE [NotificationDeliveryLogs] DROP COLUMN [AppVersion];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var9 sysname;
    SELECT @var9 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'DeviceType');
    IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var9 + '];');
    ALTER TABLE [NotificationDeliveryLogs] DROP COLUMN [DeviceType];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var10 sysname;
    SELECT @var10 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'ExternalId');
    IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var10 + '];');
    ALTER TABLE [NotificationDeliveryLogs] DROP COLUMN [ExternalId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var11 sysname;
    SELECT @var11 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'MetadataJson');
    IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var11 + '];');
    ALTER TABLE [NotificationDeliveryLogs] DROP COLUMN [MetadataJson];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var12 sysname;
    SELECT @var12 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'OpenedAt');
    IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var12 + '];');
    ALTER TABLE [NotificationDeliveryLogs] DROP COLUMN [OpenedAt];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var13 sysname;
    SELECT @var13 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'Platform');
    IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var13 + '];');
    ALTER TABLE [NotificationDeliveryLogs] DROP COLUMN [Platform];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var14 sysname;
    SELECT @var14 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SocialPlatformConfigs]') AND [c].[name] = N'ApiEndpoint');
    IF @var14 IS NOT NULL EXEC(N'ALTER TABLE [SocialPlatformConfigs] DROP CONSTRAINT [' + @var14 + '];');
    ALTER TABLE [SocialPlatformConfigs] DROP COLUMN [ApiEndpoint];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[UserActivityLogs]', N'UserActivityLog', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SocialPlatformConfigs]', N'SocialPlatformConfigurations', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContent]', N'SearchableContents', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[AspNetUsers].[TimeZone]', N'Timezone', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[UserActivityLog].[IX_UserActivityLogs_UserId_CreatedAt]', N'IX_UserActivityLog_UserId_CreatedAt', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[UserActivityLog].[IX_UserActivityLogs_CreatedAt]', N'IX_UserActivityLog_CreatedAt', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[UserActivityLog].[IX_UserActivityLogs_ActivityType]', N'IX_UserActivityLog_ActivityType', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SocialPlatformConfigurations].[DefaultHashtags]', N'OptionalScopes', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContents].[IX_SearchableContent_Type_Year]', N'IX_SearchableContents_Type_Year', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContents].[IX_SearchableContent_TmdbId]', N'IX_SearchableContents_TmdbId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContents].[IX_SearchableContent_Title_OriginalTitle]', N'IX_SearchableContents_Title_OriginalTitle', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContents].[IX_SearchableContent_SearchableTitle]', N'IX_SearchableContents_SearchableTitle', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContents].[IX_SearchableContent_Rating_Popularity]', N'IX_SearchableContents_Rating_Popularity', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC sp_rename N'[SearchableContents].[IX_SearchableContent_CreatedAt_UpdatedAt]', N'IX_SearchableContents_CreatedAt_UpdatedAt', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [Watchlists] ADD [IsActive] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [AllowPersonalization] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [AllowThirdPartySharing] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnableDataProcessing] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnableEmailNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnableInAppNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnablePushNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnableRetries] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [EnableSmsNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [GloballyEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [MaxRetryAttempts] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [RetryDelayMinutes] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistNotificationSettings] ADD [SmsPhoneNumber] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistItems] ADD [TmdbId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistItemAvailabilities] ADD [IsAvailable] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistItemAvailabilities] ADD [LastChecked] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [WatchlistItemAvailabilities] ADD [Region] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SupportActions] ADD [RejectionReason] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var15 sysname;
    SELECT @var15 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SocialRecommendations]') AND [c].[name] = N'Score');
    IF @var15 IS NOT NULL EXEC(N'ALTER TABLE [SocialRecommendations] DROP CONSTRAINT [' + @var15 + '];');
    ALTER TABLE [SocialRecommendations] ALTER COLUMN [Score] float(5) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPrivacyConsents] ADD [IsActive] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPrivacyConsents] ADD [LastConsentUpdate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPrivacyConsents] ADD [UserId1] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var16 sysname;
    SELECT @var16 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SocialGraphConnections]') AND [c].[name] = N'Strength');
    IF @var16 IS NOT NULL EXEC(N'ALTER TABLE [SocialGraphConnections] DROP CONSTRAINT [' + @var16 + '];');
    ALTER TABLE [SocialGraphConnections] ALTER COLUMN [Strength] float(5) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialConnections] ADD [PlatformConfigId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [AutoOptimization] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [AveragePerformanceScore] float NOT NULL DEFAULT 0.0E0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [AverageSeoScore] float NOT NULL DEFAULT 0.0E0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [Category] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [Description] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [SeoSettingsObject] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [TotalPagesGenerated] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoTemplates] ADD [UsageCount] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [Author] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [Category] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [KeywordDensityScore] float NOT NULL DEFAULT 0.0E0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [Keywords] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [MetaKeywords] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [PublishedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [ReadabilityScore] float NOT NULL DEFAULT 0.0E0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [SchemaMarkup] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [SeoScore] float NOT NULL DEFAULT 0.0E0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [SeoTemplateId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [Status] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [Title] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [UpdatedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD [Url] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [NewContentAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [PriceDropAlerts] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [UserId1] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD [WatchlistUpdates] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var17 sysname;
    SELECT @var17 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'NotificationType');
    IF @var17 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var17 + '];');
    ALTER TABLE [NotificationDeliveryLogs] ALTER COLUMN [NotificationType] nvarchar(100) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var18 sysname;
    SELECT @var18 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NotificationDeliveryLogs]') AND [c].[name] = N'DeliveryMethod');
    IF @var18 IS NOT NULL EXEC(N'ALTER TABLE [NotificationDeliveryLogs] DROP CONSTRAINT [' + @var18 + '];');
    ALTER TABLE [NotificationDeliveryLogs] ALTER COLUMN [DeliveryMethod] nvarchar(50) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [Channels] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [Message] nvarchar(1000) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [Metadata] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [Success] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [Title] nvarchar(200) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [Type] nvarchar(50) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationDeliveryLogs] ADD [UpdatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var19 sysname;
    SELECT @var19 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AspNetUsers]') AND [c].[name] = N'Timezone');
    IF @var19 IS NOT NULL EXEC(N'ALTER TABLE [AspNetUsers] DROP CONSTRAINT [' + @var19 + '];');
    EXEC(N'UPDATE [AspNetUsers] SET [Timezone] = N'''' WHERE [Timezone] IS NULL');
    ALTER TABLE [AspNetUsers] ALTER COLUMN [Timezone] nvarchar(50) NOT NULL;
    ALTER TABLE [AspNetUsers] ADD DEFAULT N'' FOR [Timezone];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [Country] nvarchar(2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [FreezeReason] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [FrozenAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [FrozenBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [PaymentInformation] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [PreferredLanguage] nvarchar(10) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [UnfreezeAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var20 sysname;
    SELECT @var20 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SocialPlatformConfigurations]') AND [c].[name] = N'PlatformName');
    IF @var20 IS NOT NULL EXEC(N'ALTER TABLE [SocialPlatformConfigurations] DROP CONSTRAINT [' + @var20 + '];');
    ALTER TABLE [SocialPlatformConfigurations] ALTER COLUMN [PlatformName] nvarchar(max) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    DECLARE @var21 sysname;
    SELECT @var21 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SocialPlatformConfigurations]') AND [c].[name] = N'DisplayName');
    IF @var21 IS NOT NULL EXEC(N'ALTER TABLE [SocialPlatformConfigurations] DROP CONSTRAINT [' + @var21 + '];');
    ALTER TABLE [SocialPlatformConfigurations] ALTER COLUMN [DisplayName] nvarchar(200) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [AuthorizationEndpoint] nvarchar(1000) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [ClientSecret] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [CreatedBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [DefaultScopes] nvarchar(500) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [DeletedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [DeletedBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [EncryptedClientId] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [EncryptedClientSecret] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [IsDeleted] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [Platform] nvarchar(50) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [PlatformSpecificConfigJson] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [RateLimitPerHour] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [RedirectUri] nvarchar(2000) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [RevokeEndpoint] nvarchar(1000) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [SupportsFriendDiscovery] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [SupportsPosting] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [SupportsRefreshToken] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [TokenEndpoint] nvarchar(1000) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [TokenExpiryMinutes] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [TokenUrl] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [UpdatedBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [UserInfoEndpoint] nvarchar(1000) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD [UserInfoUrl] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [UserActivityLog] ADD CONSTRAINT [PK_UserActivityLog] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPlatformConfigurations] ADD CONSTRAINT [PK_SocialPlatformConfigurations] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SearchableContents] ADD CONSTRAINT [PK_SearchableContents] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AbTestAssignments] (
        [Id] uniqueidentifier NOT NULL,
        [ExperimentId] uniqueidentifier NOT NULL,
        [VariantId] uniqueidentifier NOT NULL,
        [UserId] nvarchar(100) NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_AbTestAssignments] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AbTestExperiments] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [TrafficAllocation] decimal(18,2) NOT NULL,
        [ConversionEvents] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_AbTestExperiments] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AppStoreListings] (
        [Id] int NOT NULL IDENTITY,
        [AppName] nvarchar(200) NOT NULL,
        [BundleId] nvarchar(500) NOT NULL,
        [AppStore] int NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [Language] nvarchar(10) NOT NULL,
        [Title] nvarchar(30) NOT NULL,
        [Subtitle] nvarchar(30) NOT NULL,
        [Description] nvarchar(4000) NOT NULL,
        [Keywords] nvarchar(100) NOT NULL,
        [PromotionalText] nvarchar(170) NOT NULL,
        [ReleaseNotes] nvarchar(4000) NOT NULL,
        [Screenshots] nvarchar(max) NOT NULL,
        [PreviewVideos] nvarchar(max) NOT NULL,
        [IconUrl] nvarchar(max) NULL,
        [ConversionRate] float NOT NULL,
        [Downloads] int NOT NULL,
        [Views] int NOT NULL,
        [Rating] float NOT NULL,
        [ReviewCount] int NOT NULL,
        [IsTestVariant] bit NOT NULL,
        [ParentListingId] int NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [PublishedAt] datetime2 NULL,
        [LastUpdated] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UserId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AppStoreListings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AppStoreListings_AppStoreListings_ParentListingId] FOREIGN KEY ([ParentListingId]) REFERENCES [AppStoreListings] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_AppStoreListings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AsoKeywords] (
        [Id] int NOT NULL IDENTITY,
        [Keyword] nvarchar(200) NOT NULL,
        [AppStore] int NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [Language] nvarchar(10) NOT NULL,
        [SearchVolume] int NOT NULL DEFAULT 0,
        [Difficulty] float NOT NULL DEFAULT 0.0E0,
        [Relevance] float NOT NULL DEFAULT 0.0E0,
        [ConversionPotential] float NOT NULL DEFAULT 0.0E0,
        [CurrentRank] int NULL,
        [BestRank] int NULL,
        [PreviousRank] int NULL,
        [CompetitionDensity] float NOT NULL DEFAULT 0.0E0,
        [TopCompetitors] nvarchar(max) NOT NULL,
        [Source] int NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [LastUpdated] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [LastRanked] datetime2 NULL,
        [UserId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AsoKeywords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AsoKeywords_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AvailabilityTestResults] (
        [Id] int NOT NULL IDENTITY,
        [TestName] nvarchar(100) NOT NULL,
        [Url] nvarchar(200) NOT NULL,
        [Location] nvarchar(50) NULL,
        [Success] bit NOT NULL,
        [ResponseTimeMs] int NOT NULL,
        [StatusCode] int NOT NULL,
        [ErrorMessage] nvarchar(1000) NULL,
        [TestTime] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ResponseHeaders] nvarchar(max) NULL,
        [ResponseBody] nvarchar(max) NULL,
        CONSTRAINT [PK_AvailabilityTestResults] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AzureMonitorAlertRules] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [Severity] nvarchar(20) NOT NULL,
        [TargetResourceId] nvarchar(max) NOT NULL,
        [MetricName] nvarchar(max) NOT NULL,
        [Operator] nvarchar(20) NOT NULL,
        [Threshold] float NOT NULL,
        [Aggregation] nvarchar(20) NOT NULL,
        [WindowSizeMinutes] int NOT NULL,
        [EvaluationFrequencyMinutes] int NOT NULL,
        [IsEnabled] bit NOT NULL,
        [ActionGroupIds] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastModified] datetime2 NULL,
        [CreatedBy] nvarchar(100) NULL,
        [LastModifiedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_AzureMonitorAlertRules] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [ConsentRecords] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Purpose] nvarchar(100) NOT NULL,
        [ConsentGiven] bit NOT NULL,
        [ConsentDate] datetime2 NOT NULL,
        [ConsentWithdrawnDate] datetime2 NULL,
        [ConsentMethod] nvarchar(50) NOT NULL,
        [ConsentText] nvarchar(500) NULL,
        [Version] nvarchar(20) NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(500) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_ConsentRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ConsentRecords_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [ContentRatings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ContentId] nvarchar(50) NOT NULL,
        [ContentType] nvarchar(20) NOT NULL,
        [Rating] int NOT NULL,
        [Review] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ContentRatings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContentRatings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [CrossBorderTransferRecords] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [TargetCountry] nvarchar(3) NOT NULL,
        [DataType] nvarchar(100) NOT NULL,
        [TransferDate] datetime2 NOT NULL,
        [LegalBasis] nvarchar(50) NOT NULL,
        [Safeguards] nvarchar(500) NOT NULL,
        [ComplianceStatus] nvarchar(50) NOT NULL,
        [RecipientEntity] nvarchar(200) NULL,
        [TransferPurpose] nvarchar(1000) NULL,
        [AdditionalNotes] nvarchar(1000) NULL,
        [ReviewDate] datetime2 NULL,
        [ReviewedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_CrossBorderTransferRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CrossBorderTransferRecords_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [CustomPerformanceCounters] (
        [Id] int NOT NULL IDENTITY,
        [CounterName] nvarchar(100) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [Instance] nvarchar(50) NULL,
        [Value] float NOT NULL,
        [Unit] nvarchar(20) NULL,
        [Timestamp] datetime2 NOT NULL,
        [Properties] nvarchar(max) NULL,
        CONSTRAINT [PK_CustomPerformanceCounters] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [DataRetentionPolicies] (
        [Id] uniqueidentifier NOT NULL,
        [DataType] nvarchar(100) NOT NULL,
        [RetentionDays] int NOT NULL,
        [Description] nvarchar(200) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        [AutoPurge] bit NOT NULL,
        [LegalBasis] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_DataRetentionPolicies] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [DataSubjectRequests] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [RequestType] nvarchar(50) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [RequestDate] datetime2 NOT NULL,
        [CompletedDate] datetime2 NULL,
        [RequestDetails] nvarchar(1000) NULL,
        [ProcessingNotes] nvarchar(1000) NULL,
        [RejectionReason] nvarchar(500) NULL,
        [DataExportPath] nvarchar(500) NULL,
        [VerificationMethod] nvarchar(100) NULL,
        [IdentityVerified] bit NOT NULL,
        [Deadline] datetime2 NOT NULL,
        CONSTRAINT [PK_DataSubjectRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DataSubjectRequests_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [GrowthAlerts] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [UserId] nvarchar(100) NOT NULL,
        [Metric] nvarchar(100) NOT NULL,
        [Condition] int NOT NULL,
        [ThresholdValue] decimal(18,2) NOT NULL,
        [TimeWindow] nvarchar(20) NOT NULL,
        [EvaluationFrequency] nvarchar(20) NOT NULL,
        [NotificationChannels] nvarchar(max) NOT NULL,
        [Severity] int NOT NULL,
        [IsEnabled] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [LastEvaluatedAt] datetime2 NULL,
        [Configuration] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_GrowthAlerts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [MonitoringAlerts] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [Severity] nvarchar(20) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [Source] nvarchar(100) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NULL,
        [AcknowledgedAt] datetime2 NULL,
        [AcknowledgedBy] nvarchar(100) NULL,
        [ResolvedAt] datetime2 NULL,
        [ResolvedBy] nvarchar(100) NULL,
        [ResolutionNotes] nvarchar(500) NULL,
        [Metadata] nvarchar(max) NULL,
        CONSTRAINT [PK_MonitoringAlerts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationCampaigns] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [TemplateId] nvarchar(100) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [TargetCriteriaJson] nvarchar(max) NOT NULL,
        [TemplateDataJson] nvarchar(max) NOT NULL,
        [ScheduledFor] datetime2 NULL,
        [StartedAt] datetime2 NULL,
        [CompletedAt] datetime2 NULL,
        [TargetUserCount] int NOT NULL,
        [ProcessedCount] int NOT NULL,
        [SuccessCount] int NOT NULL,
        [FailureCount] int NOT NULL,
        [SkippedCount] int NOT NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NotificationCampaigns] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationRateLimits] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [NotificationType] nvarchar(50) NOT NULL,
        [TimeWindow] nvarchar(20) NOT NULL,
        [WindowStart] datetime2 NOT NULL,
        [WindowEnd] datetime2 NOT NULL,
        [Count] int NOT NULL,
        [Limit] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NotificationRateLimits] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationRateLimits_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationSettings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [GloballyEnabled] bit NOT NULL,
        [GlobalDisabledUntil] datetime2 NULL,
        [EmailEnabled] bit NOT NULL,
        [PushEnabled] bit NOT NULL,
        [SmsEnabled] bit NOT NULL,
        [InAppEnabled] bit NOT NULL,
        [NotificationTypesJson] nvarchar(max) NOT NULL,
        [DefaultFrequency] nvarchar(20) NOT NULL,
        [MaxNotificationsPerHour] int NOT NULL,
        [MaxNotificationsPerDay] int NOT NULL,
        [QuietHoursStart] time NULL,
        [QuietHoursEnd] time NULL,
        [TimeZone] nvarchar(50) NOT NULL,
        [QuietDaysJson] nvarchar(max) NOT NULL,
        [ContentFiltersJson] nvarchar(max) NOT NULL,
        [MinimumRating] decimal(18,2) NULL,
        [AggregateNotifications] bit NOT NULL,
        [AggregationWindowMinutes] int NOT NULL,
        [EnableSmartTiming] bit NOT NULL,
        [EnablePredictiveFiltering] bit NOT NULL,
        [NotificationTone] nvarchar(20) NOT NULL,
        [DailyDigestEnabled] bit NOT NULL,
        [WeeklyDigestEnabled] bit NOT NULL,
        [MonthlyDigestEnabled] bit NOT NULL,
        [DigestDeliveryTime] time NOT NULL,
        [WeeklyDigestDay] int NOT NULL,
        [MonthlyDigestDay] int NOT NULL,
        [AllowDataProcessing] bit NOT NULL,
        [AllowProfileAnalysis] bit NOT NULL,
        [UnsubscribedTypesJson] nvarchar(max) NOT NULL,
        [UnsubscribedFromAllAt] datetime2 NULL,
        [UnsubscribeReason] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NotificationSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationSettings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationTemplates] (
        [Id] nvarchar(100) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [Channel] nvarchar(20) NOT NULL,
        [Subject] nvarchar(200) NOT NULL,
        [Template] nvarchar(max) NOT NULL,
        [Version] nvarchar(10) NOT NULL,
        [Language] nvarchar(5) NOT NULL,
        [IsActive] bit NOT NULL,
        [DefaultDataJson] nvarchar(max) NULL,
        [ValidationRulesJson] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_NotificationTemplates] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [OAuthToken] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [PlatformConfigId] uniqueidentifier NULL,
        [EncryptedAccessToken] nvarchar(max) NOT NULL,
        [EncryptedRefreshToken] nvarchar(max) NULL,
        [Scope] nvarchar(500) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [LastRefreshed] datetime2 NULL,
        [LastUsed] datetime2 NULL,
        [TokenType] nvarchar(100) NOT NULL,
        [IsValid] bit NOT NULL,
        [EncryptionKeyId] nvarchar(100) NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_OAuthToken] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_OAuthToken_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_OAuthToken_SocialPlatformConfigurations_PlatformConfigId] FOREIGN KEY ([PlatformConfigId]) REFERENCES [SocialPlatformConfigurations] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [PerformanceThresholds] (
        [Id] int NOT NULL IDENTITY,
        [MetricName] nvarchar(100) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [WarningThreshold] float NOT NULL,
        [CriticalThreshold] float NOT NULL,
        [ComparisonOperator] nvarchar(20) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [Description] nvarchar(200) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastModified] datetime2 NULL,
        [CreatedBy] nvarchar(100) NULL,
        [LastModifiedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_PerformanceThresholds] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [PreferenceCategories] (
        [Id] uniqueidentifier NOT NULL,
        [CategoryKey] nvarchar(100) NOT NULL,
        [DisplayName] nvarchar(200) NOT NULL,
        [Description] nvarchar(500) NULL,
        [ParentCategoryId] uniqueidentifier NULL,
        [SortOrder] int NOT NULL,
        [IconClass] nvarchar(100) NULL,
        [IsVisible] bit NOT NULL,
        [RequiresAdmin] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PreferenceCategories] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_PreferenceCategories_CategoryKey] UNIQUE ([CategoryKey]),
        CONSTRAINT [FK_PreferenceCategories_PreferenceCategories_ParentCategoryId] FOREIGN KEY ([ParentCategoryId]) REFERENCES [PreferenceCategories] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [PreferenceHistory] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [CategoryKey] nvarchar(100) NOT NULL,
        [PreferenceKey] nvarchar(200) NOT NULL,
        [OldValue] nvarchar(max) NULL,
        [NewValue] nvarchar(max) NOT NULL,
        [Action] nvarchar(50) NOT NULL,
        [ChangeSource] nvarchar(50) NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(500) NULL,
        [Metadata] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PreferenceHistory] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PreferenceHistory_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [PrivacyComplianceReports] (
        [Id] uniqueidentifier NOT NULL,
        [GeneratedAt] datetime2 NOT NULL,
        [ReportPeriod] nvarchar(100) NOT NULL,
        [UserId] uniqueidentifier NULL,
        [TotalConsents] int NOT NULL,
        [ActiveConsents] int NOT NULL,
        [RevokedConsents] int NOT NULL,
        [ExpiredConsents] int NOT NULL,
        [DataSubjectRequests] int NOT NULL,
        [PendingRequests] int NOT NULL,
        [CompletedRequests] int NOT NULL,
        [OverdueRequests] int NOT NULL,
        [PrivacyImpactAssessments] int NOT NULL,
        [HighRiskProcessing] int NOT NULL,
        [PendingPIAReviews] int NOT NULL,
        [CrossBorderTransfers] int NOT NULL,
        [NonAdequateTransfers] int NOT NULL,
        [TransfersRequiringReview] int NOT NULL,
        [DataRetentionViolations] int NOT NULL,
        [AutoDeletedRecords] int NOT NULL,
        [DataBreachIncidents] int NOT NULL,
        [UnauthorizedAccessAttempts] int NOT NULL,
        [SuccessfulAuditEvents] int NOT NULL,
        [OverallComplianceScore] float NOT NULL,
        [ConsentComplianceScore] float NOT NULL,
        [DataProcessingComplianceScore] float NOT NULL,
        [SecurityComplianceScore] float NOT NULL,
        [ComplianceNotes] nvarchar(2000) NULL,
        [RecommendedActions] nvarchar(2000) NULL,
        [GeneratedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_PrivacyComplianceReports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PrivacyComplianceReports_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [PrivacyImpactAssessments] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ProcessingType] nvarchar(100) NOT NULL,
        [AssessmentDate] datetime2 NOT NULL,
        [RiskLevel] nvarchar(20) NOT NULL,
        [MitigationMeasures] nvarchar(2000) NOT NULL,
        [ComplianceStatus] nvarchar(50) NOT NULL,
        [ReviewDate] datetime2 NOT NULL,
        [AssessmentNotes] nvarchar(1000) NULL,
        [AssessedBy] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_PrivacyImpactAssessments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PrivacyImpactAssessments_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [PrivacySettings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EnableDataProcessing] bit NOT NULL,
        [AllowPersonalization] bit NOT NULL,
        [AllowThirdPartySharing] bit NOT NULL,
        [AllowMarketingCommunications] bit NOT NULL,
        [AllowAnalytics] bit NOT NULL,
        [PreferredRetentionDays] int NULL,
        [PreferredExportFormat] nvarchar(20) NOT NULL,
        [IncludeMetadataInExports] bit NOT NULL,
        [MinimalDataProcessing] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [LastReviewedAt] datetime2 NULL,
        CONSTRAINT [PK_PrivacySettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PrivacySettings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [RecommendationSettings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [EnableRecommendations] bit NOT NULL,
        [ShowTrendingContent] bit NOT NULL,
        [ShowSimilarContent] bit NOT NULL,
        [ShowPopularContent] bit NOT NULL,
        [IncludeMovies] bit NOT NULL,
        [IncludeTvShows] bit NOT NULL,
        [IncludeDocumentaries] bit NOT NULL,
        [IncludeAnime] bit NOT NULL,
        [MinimumRating] decimal(18,2) NOT NULL,
        [IncludeAdultContent] bit NOT NULL,
        [PreferredLanguages] nvarchar(1000) NULL,
        [PreferredGenres] nvarchar(2000) NULL,
        [ExcludedGenres] nvarchar(2000) NULL,
        [UseCollaborativeFiltering] bit NOT NULL,
        [UseContentBasedFiltering] bit NOT NULL,
        [UseTrendingBoost] bit NOT NULL,
        [DismissedContentIds] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_RecommendationSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RecommendationSettings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialAccount] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [SocialUserId] nvarchar(100) NOT NULL,
        [Username] nvarchar(100) NOT NULL,
        [DisplayName] nvarchar(200) NOT NULL,
        [Email] nvarchar(320) NOT NULL,
        [ProfileImageUrl] nvarchar(500) NOT NULL,
        [Bio] nvarchar(2000) NOT NULL,
        [FollowersCount] bigint NOT NULL,
        [FollowingCount] bigint NOT NULL,
        [PostsCount] bigint NOT NULL,
        [EngagementRate] float NOT NULL,
        [IsVerified] bit NOT NULL,
        [IsBusiness] bit NOT NULL,
        [IsCreator] bit NOT NULL,
        [Location] nvarchar(200) NULL,
        [Website] nvarchar(200) NULL,
        [Language] nvarchar(10) NULL,
        [TimeZone] nvarchar(100) NULL,
        [IsActive] bit NOT NULL,
        [IsPrivate] bit NOT NULL,
        [ConnectedAt] datetime2 NOT NULL,
        [LastSyncAt] datetime2 NULL,
        [LastActivityAt] datetime2 NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [InfluenceScore] float NOT NULL,
        [ContentQualityScore] float NOT NULL,
        [NetworkReachScore] float NOT NULL,
        [PlatformDataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialAccount] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialAccount_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialActivityFeeds] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [PlatformConfigId] uniqueidentifier NULL,
        [ActivityType] nvarchar(50) NOT NULL,
        [ActivityTitle] nvarchar(200) NOT NULL,
        [ActivityDescription] nvarchar(1000) NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [ImageUrl] nvarchar(500) NOT NULL,
        [TargetUrl] nvarchar(2000) NOT NULL,
        [TargetUserId] uniqueidentifier NULL,
        [TargetUserDisplayName] nvarchar(200) NOT NULL,
        [ActivityTimestamp] datetime2 NOT NULL,
        [IsPublic] bit NOT NULL,
        [IsVerified] bit NOT NULL,
        [EngagementCount] int NOT NULL,
        [ImportanceScore] float(5) NOT NULL,
        [Priority] nvarchar(50) NOT NULL,
        [ActivityDataJson] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        [IsRead] bit NOT NULL,
        [ReadAt] datetime2 NULL,
        [IsBookmarked] bit NOT NULL,
        [BookmarkedAt] datetime2 NULL,
        [IsHidden] bit NOT NULL,
        [HiddenAt] datetime2 NULL,
        [RelevanceScore] float(5) NOT NULL,
        [IsRecommended] bit NOT NULL,
        [RecommendationReason] nvarchar(200) NULL,
        CONSTRAINT [PK_SocialActivityFeeds] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialActivityFeeds_AspNetUsers_TargetUserId] FOREIGN KEY ([TargetUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_SocialActivityFeeds_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SocialActivityFeeds_SocialPlatformConfigurations_PlatformConfigId] FOREIGN KEY ([PlatformConfigId]) REFERENCES [SocialPlatformConfigurations] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialAnalytics] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [PlatformConfigId] uniqueidentifier NULL,
        [TotalConnections] int NOT NULL,
        [ActiveConnections] int NOT NULL,
        [TotalFriends] int NOT NULL,
        [TotalFollowers] int NOT NULL,
        [TotalFollowing] int NOT NULL,
        [TotalPosts] int NOT NULL,
        [TotalShares] int NOT NULL,
        [TotalLikes] int NOT NULL,
        [TotalComments] int NOT NULL,
        [TotalInteractions] int NOT NULL,
        [TotalContentRecommendations] int NOT NULL,
        [AcceptedRecommendations] int NOT NULL,
        [RecommendationAcceptanceRate] float(5) NOT NULL,
        [AverageEngagementRate] float(5) NOT NULL,
        [InfluenceScore] float(5) NOT NULL,
        [ReachScore] float(5) NOT NULL,
        [FirstActivityAt] datetime2 NULL,
        [LastActivity] datetime2 NULL,
        [LastActivityAt] datetime2 NULL,
        [DaysActive] int NOT NULL,
        [AverageSessionDuration] float(10) NOT NULL,
        [DataExportRequests] int NOT NULL,
        [DataDeletionRequests] int NOT NULL,
        [LastPrivacyUpdate] datetime2 NULL,
        [PeriodStart] datetime2 NOT NULL,
        [PeriodEnd] datetime2 NOT NULL,
        [PeriodType] nvarchar(20) NOT NULL,
        [PlatformBreakdownJson] nvarchar(max) NOT NULL,
        [ActivityByTypeJson] nvarchar(max) NOT NULL,
        [RawAnalyticsJson] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_SocialAnalytics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialAnalytics_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SocialAnalytics_SocialPlatformConfigurations_PlatformConfigId] FOREIGN KEY ([PlatformConfigId]) REFERENCES [SocialPlatformConfigurations] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialContentShares] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ContentId] nvarchar(200) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [ContentTitle] nvarchar(500) NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [ShareType] nvarchar(100) NOT NULL,
        [ShareContent] nvarchar(max) NOT NULL,
        [MediaUrl] nvarchar(500) NULL,
        [SharedAt] datetime2 NOT NULL,
        [LikesCount] int NOT NULL,
        [CommentsCount] int NOT NULL,
        [SharesCount] int NOT NULL,
        [ClicksCount] int NOT NULL,
        [EngagementRate] float NOT NULL,
        [PlatformPostId] nvarchar(100) NULL,
        [PostUrl] nvarchar(500) NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialContentShares] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialContentShares_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialProofScores] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [OverallScore] float NOT NULL,
        [InfluenceScore] float NOT NULL,
        [EngagementScore] float NOT NULL,
        [ContentQualityScore] float NOT NULL,
        [NetworkScore] float NOT NULL,
        [ActivityScore] float NOT NULL,
        [TotalFollowers] bigint NOT NULL,
        [TotalConnections] bigint NOT NULL,
        [AverageEngagementRate] float NOT NULL,
        [PostsLast30Days] int NOT NULL,
        [InteractionsLast30Days] int NOT NULL,
        [GlobalRank] int NOT NULL,
        [Percentile] float NOT NULL,
        [InfluenceTier] nvarchar(50) NOT NULL,
        [CalculatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ScoreBreakdownJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialProofScores] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialProofScores_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserBehaviorFunnels] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [PeriodStart] datetime2 NOT NULL,
        [PeriodEnd] datetime2 NOT NULL,
        [TotalUsers] int NOT NULL,
        [CompletedUsers] int NOT NULL,
        [ConversionRate] decimal(5,4) NOT NULL,
        [AverageCompletionTime] int NULL,
        [MedianCompletionTime] int NULL,
        [CalculatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserBehaviorFunnels] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserBehaviorInsights] (
        [Id] uniqueidentifier NOT NULL,
        [InsightType] nvarchar(100) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [PeriodStart] datetime2 NOT NULL,
        [PeriodEnd] datetime2 NOT NULL,
        [Dimension] nvarchar(100) NULL,
        [DimensionValue] nvarchar(500) NULL,
        [MetricName] nvarchar(100) NOT NULL,
        [MetricValue] decimal(18,4) NOT NULL,
        [SampleSize] int NOT NULL,
        [ConfidenceLower] decimal(18,4) NULL,
        [ConfidenceUpper] decimal(18,4) NULL,
        [SignificanceLevel] decimal(5,4) NULL,
        [PeriodChange] decimal(10,4) NULL,
        [TrendDirection] nvarchar(20) NULL,
        [Description] nvarchar(1000) NULL,
        [Recommendations] nvarchar(max) NULL,
        [Priority] int NOT NULL,
        [ImpactLevel] nvarchar(20) NULL,
        [CalculatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [Metadata] nvarchar(max) NULL,
        CONSTRAINT [PK_UserBehaviorInsights] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserBehaviorSessions] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] nvarchar(100) NOT NULL,
        [UserId] nvarchar(100) NULL,
        [DeviceId] nvarchar(100) NULL,
        [StartTime] datetime2 NOT NULL,
        [EndTime] datetime2 NULL,
        [DurationSeconds] int NOT NULL,
        [PageViews] int NOT NULL,
        [EventCount] int NOT NULL,
        [LandingPage] nvarchar(500) NULL,
        [ExitPage] nvarchar(500) NULL,
        [Referrer] nvarchar(500) NULL,
        [UtmSource] nvarchar(200) NULL,
        [UtmMedium] nvarchar(200) NULL,
        [UtmCampaign] nvarchar(200) NULL,
        [MaxScrollDepth] decimal(18,2) NULL,
        [SearchCount] int NOT NULL,
        [ContentInteractions] int NOT NULL,
        [FormInteractions] int NOT NULL,
        [ErrorCount] int NOT NULL,
        [HasConversion] bit NOT NULL,
        [ConversionType] nvarchar(50) NULL,
        [ConversionValue] decimal(18,2) NULL,
        [IsBounce] bit NOT NULL,
        [DeviceType] nvarchar(20) NULL,
        [OperatingSystem] nvarchar(50) NULL,
        [Browser] nvarchar(100) NULL,
        [Country] nvarchar(10) NULL,
        [Region] nvarchar(100) NULL,
        [City] nvarchar(100) NULL,
        [ExperimentId] uniqueidentifier NULL,
        [ExperimentVariant] nvarchar(50) NULL,
        [HasConsent] bit NOT NULL,
        [IsReturningVisitor] bit NOT NULL,
        [DaysSinceLastVisit] int NULL,
        [QualityScore] int NOT NULL,
        [EngagementScore] int NOT NULL,
        CONSTRAINT [PK_UserBehaviorSessions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserContentInteractions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ContentId] nvarchar(50) NOT NULL,
        [ContentType] nvarchar(20) NOT NULL,
        [InteractionType] nvarchar(50) NOT NULL,
        [InteractionValue] nvarchar(200) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserContentInteractions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserContentInteractions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserNotifications] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Message] nvarchar(2000) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [IsRead] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReadAt] datetime2 NULL,
        [ActionUrl] nvarchar(2000) NULL,
        [MetadataJson] nvarchar(1000) NULL,
        CONSTRAINT [PK_UserNotifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserNotifications_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserVpnPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [PrefersNoLogsPolicy] bit NOT NULL,
        [RequiresKillSwitch] bit NOT NULL,
        [NeedsStreamingSupport] bit NOT NULL,
        [NeedsP2PSupport] bit NOT NULL,
        [MaxMonthlyBudget] decimal(10,2) NULL,
        [MaxAnnualBudget] decimal(10,2) NULL,
        [RequiredPlatforms] nvarchar(1000) NULL,
        [PreferredServerCountries] nvarchar(1000) NULL,
        [MinServerCount] int NULL,
        [MinCountryCount] int NULL,
        [RequiredSimultaneousConnections] int NULL,
        [ImportantStreamingServices] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_UserVpnPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserVpnPreferences_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnBestPractices] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Summary] nvarchar(500) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [Category] int NOT NULL,
        [ImportanceLevel] int NOT NULL,
        [Tags] nvarchar(1000) NULL,
        [DisplayOrder] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [ViewCount] int NOT NULL,
        [HelpfulnessRating] float NULL,
        [HelpfulnessVotes] int NOT NULL,
        [CreatedByUserId] uniqueidentifier NOT NULL,
        [UpdatedByUserId] uniqueidentifier NULL,
        CONSTRAINT [PK_VpnBestPractices] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnGuidanceAnalytics] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NULL,
        [EventType] int NOT NULL,
        [VpnProviderId] uniqueidentifier NULL,
        [GuideId] uniqueidentifier NULL,
        [EventData] nvarchar(1000) NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        [Referrer] nvarchar(2000) NULL,
        [Timestamp] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [SessionId] nvarchar(36) NULL,
        CONSTRAINT [PK_VpnGuidanceAnalytics] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnLegalDisclaimers] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(100) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [Type] int NOT NULL,
        [CountryCode] nvarchar(10) NULL,
        [IsRequired] bit NOT NULL,
        [DisplayOrder] int NOT NULL,
        [EffectiveDate] datetime2 NOT NULL,
        [ExpirationDate] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [IsActive] bit NOT NULL,
        [CreatedByUserId] uniqueidentifier NOT NULL,
        [UpdatedByUserId] uniqueidentifier NULL,
        [AdminNotes] nvarchar(500) NULL,
        CONSTRAINT [PK_VpnLegalDisclaimers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnProviders] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [WebsiteUrl] nvarchar(max) NOT NULL,
        [AffiliateUrl] nvarchar(max) NULL,
        [LogoUrl] nvarchar(255) NULL,
        [MonthlyPrice] decimal(10,2) NOT NULL,
        [AnnualPrice] decimal(10,2) NOT NULL,
        [HasFreeTrial] bit NOT NULL,
        [FreeTrialDays] int NULL,
        [ServerCount] int NOT NULL,
        [CountryCount] int NOT NULL,
        [SupportsP2P] bit NOT NULL,
        [SupportsStreaming] bit NOT NULL,
        [HasKillSwitch] bit NOT NULL,
        [HasNoLogsPolicy] bit NOT NULL,
        [MaxSimultaneousConnections] int NULL,
        [SupportedPlatforms] nvarchar(1000) NOT NULL,
        [AverageSpeedRating] float NULL,
        [ReliabilityRating] float NULL,
        [EaseOfUseRating] float NULL,
        [CustomerSupportRating] float NULL,
        [OverallRating] float NULL,
        [TotalRatings] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [IsActive] bit NOT NULL,
        [IsFeatured] bit NOT NULL,
        [DisplayOrder] int NOT NULL,
        [AdminNotes] nvarchar(1000) NULL,
        CONSTRAINT [PK_VpnProviders] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [WatchlistSettings] (
        [Id] uniqueidentifier NOT NULL,
        [WatchlistId] uniqueidentifier NOT NULL,
        [TrackActivity] bit NOT NULL,
        [AllowNotifications] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_WatchlistSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WatchlistSettings_Watchlists_WatchlistId] FOREIGN KEY ([WatchlistId]) REFERENCES [Watchlists] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AbTestConversions] (
        [Id] uniqueidentifier NOT NULL,
        [AssignmentId] uniqueidentifier NOT NULL,
        [ConversionEvent] nvarchar(100) NOT NULL,
        [Value] decimal(18,2) NULL,
        [ConvertedAt] datetime2 NOT NULL,
        [AbTestAssignmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_AbTestConversions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AbTestConversions_AbTestAssignments_AbTestAssignmentId] FOREIGN KEY ([AbTestAssignmentId]) REFERENCES [AbTestAssignments] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AbTestVariant] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [TrafficSplit] decimal(18,2) NOT NULL,
        [Configuration] nvarchar(max) NOT NULL,
        [IsControl] bit NOT NULL,
        [AbTestExperimentId] uniqueidentifier NULL,
        CONSTRAINT [PK_AbTestVariant] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AbTestVariant_AbTestExperiments_AbTestExperimentId] FOREIGN KEY ([AbTestExperimentId]) REFERENCES [AbTestExperiments] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AppStoreReviews] (
        [Id] int NOT NULL IDENTITY,
        [ReviewId] nvarchar(500) NOT NULL,
        [ListingId] int NOT NULL,
        [ReviewerName] nvarchar(200) NOT NULL,
        [Rating] int NOT NULL,
        [Title] nvarchar(500) NOT NULL,
        [Content] nvarchar(4000) NOT NULL,
        [Version] nvarchar(20) NOT NULL,
        [ReviewDate] datetime2 NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [Language] nvarchar(10) NOT NULL,
        [SentimentScore] float NOT NULL,
        [SentimentLabel] int NOT NULL,
        [Confidence] float NOT NULL,
        [Topics] nvarchar(max) NOT NULL,
        [Issues] nvarchar(max) NOT NULL,
        [Compliments] nvarchar(max) NOT NULL,
        [HasDeveloperResponse] bit NOT NULL,
        [DeveloperResponse] nvarchar(max) NULL,
        [ResponseDate] datetime2 NULL,
        [IsHelpful] bit NOT NULL,
        [IsVerifiedPurchase] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [LastUpdated] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_AppStoreReviews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AppStoreReviews_AppStoreListings_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [AppStoreListings] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AsoAnalytics] (
        [Id] int NOT NULL IDENTITY,
        [ListingId] int NOT NULL,
        [Date] datetime2 NOT NULL,
        [Granularity] int NOT NULL,
        [Views] int NOT NULL,
        [Downloads] int NOT NULL,
        [ConversionRate] float NOT NULL,
        [OrganicViews] int NOT NULL,
        [SearchViews] int NOT NULL,
        [BrowseViews] int NOT NULL,
        [ReferralViews] int NOT NULL,
        [KeywordViews] nvarchar(max) NOT NULL,
        [KeywordConversions] nvarchar(max) NOT NULL,
        [AverageRating] float NOT NULL,
        [TotalReviews] int NOT NULL,
        [NewReviews] int NOT NULL,
        [SentimentScore] float NOT NULL,
        [CategoryRankings] nvarchar(max) NOT NULL,
        [KeywordRankings] nvarchar(max) NOT NULL,
        [CompetitorData] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_AsoAnalytics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AsoAnalytics_AppStoreListings_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [AppStoreListings] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AsoAbTests] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [Type] int NOT NULL,
        [Status] int NOT NULL,
        [ControlListingId] int NOT NULL,
        [VariantListingId] int NOT NULL,
        [TrafficSplit] float NOT NULL DEFAULT 0.5E0,
        [ControlMetrics] nvarchar(max) NOT NULL,
        [VariantMetrics] nvarchar(max) NOT NULL,
        [StatisticalSignificance] float NULL,
        [ConfidenceLevel] float NULL DEFAULT 0.94999999999999996E0,
        [IsStatisticallySignificant] bit NOT NULL,
        [StartDate] datetime2 NULL,
        [EndDate] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [LastUpdated] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UserId] uniqueidentifier NOT NULL,
        [KeywordIds] nvarchar(max) NOT NULL,
        [AsoKeywordId] int NULL,
        CONSTRAINT [PK_AsoAbTests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AsoAbTests_AppStoreListings_ControlListingId] FOREIGN KEY ([ControlListingId]) REFERENCES [AppStoreListings] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_AsoAbTests_AppStoreListings_VariantListingId] FOREIGN KEY ([VariantListingId]) REFERENCES [AppStoreListings] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_AsoAbTests_AsoKeywords_AsoKeywordId] FOREIGN KEY ([AsoKeywordId]) REFERENCES [AsoKeywords] ([Id]),
        CONSTRAINT [FK_AsoAbTests_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [KeywordRankings] (
        [Id] int NOT NULL IDENTITY,
        [KeywordId] int NOT NULL,
        [ListingId] int NOT NULL,
        [Rank] int NOT NULL,
        [PreviousRank] int NULL,
        [RankedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [CategoryRank] int NULL,
        [Category] nvarchar(max) NULL,
        [VisibilityScore] float NULL,
        CONSTRAINT [PK_KeywordRankings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_KeywordRankings_AppStoreListings_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [AppStoreListings] ([Id]),
        CONSTRAINT [FK_KeywordRankings_AsoKeywords_KeywordId] FOREIGN KEY ([KeywordId]) REFERENCES [AsoKeywords] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [AlertTriggers] (
        [Id] uniqueidentifier NOT NULL,
        [AlertId] uniqueidentifier NOT NULL,
        [TriggerValue] decimal(18,2) NOT NULL,
        [ThresholdValue] decimal(18,2) NOT NULL,
        [Message] nvarchar(1000) NOT NULL,
        [Context] nvarchar(max) NOT NULL,
        [TriggeredAt] datetime2 NOT NULL,
        [NotificationsSent] bit NOT NULL,
        [NotificationError] nvarchar(500) NULL,
        CONSTRAINT [PK_AlertTriggers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AlertTriggers_GrowthAlerts_AlertId] FOREIGN KEY ([AlertId]) REFERENCES [GrowthAlerts] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [Notifications] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [Priority] nvarchar(20) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [ActionUrl] nvarchar(500) NULL,
        [DataJson] nvarchar(max) NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ScheduledFor] datetime2 NULL,
        [SentAt] datetime2 NULL,
        [ReadAt] datetime2 NULL,
        [ExpiresAt] datetime2 NULL,
        [CorrelationId] nvarchar(100) NULL,
        [CampaignId] nvarchar(50) NULL,
        [Category] nvarchar(50) NOT NULL,
        [TemplateId] nvarchar(50) NULL,
        [TemplateDataJson] nvarchar(max) NULL,
        [NotificationCampaignId] uniqueidentifier NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notifications_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Notifications_NotificationCampaigns_NotificationCampaignId] FOREIGN KEY ([NotificationCampaignId]) REFERENCES [NotificationCampaigns] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [DefaultPreferences] (
        [Id] uniqueidentifier NOT NULL,
        [CategoryId] uniqueidentifier NOT NULL,
        [PreferenceKey] nvarchar(200) NOT NULL,
        [DisplayName] nvarchar(200) NOT NULL,
        [Description] nvarchar(500) NULL,
        [DefaultValue] nvarchar(max) NOT NULL,
        [DataType] nvarchar(50) NOT NULL,
        [ValidationSchema] nvarchar(max) NULL,
        [IsUserConfigurable] bit NOT NULL,
        [RequiresRestart] bit NOT NULL,
        [Priority] int NOT NULL,
        [Scope] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_DefaultPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DefaultPreferences_PreferenceCategories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [PreferenceCategories] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserPreference] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [CategoryKey] nvarchar(100) NOT NULL,
        [PreferenceKey] nvarchar(200) NOT NULL,
        [PreferenceValue] nvarchar(max) NOT NULL,
        [DataType] nvarchar(50) NOT NULL,
        [IsUserOverride] bit NOT NULL,
        [Priority] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserPreference] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserPreference_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserPreference_PreferenceCategories_CategoryKey] FOREIGN KEY ([CategoryKey]) REFERENCES [PreferenceCategories] ([CategoryKey]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialInteraction] (
        [Id] uniqueidentifier NOT NULL,
        [SocialAccountId] uniqueidentifier NOT NULL,
        [InteractionType] nvarchar(50) NOT NULL,
        [TargetPostId] nvarchar(100) NULL,
        [TargetUserId] nvarchar(100) NULL,
        [TargetUsername] nvarchar(200) NULL,
        [InteractionContent] nvarchar(max) NULL,
        [InteractionAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsInbound] bit NOT NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialInteraction] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialInteraction_SocialAccount_SocialAccountId] FOREIGN KEY ([SocialAccountId]) REFERENCES [SocialAccount] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialPosts] (
        [Id] uniqueidentifier NOT NULL,
        [SocialAccountId] uniqueidentifier NOT NULL,
        [PlatformPostId] nvarchar(100) NOT NULL,
        [PostType] nvarchar(50) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [MediaUrls] nvarchar(2000) NULL,
        [Hashtags] nvarchar(1000) NULL,
        [Mentions] nvarchar(500) NULL,
        [PostedAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LikesCount] bigint NOT NULL,
        [CommentsCount] bigint NOT NULL,
        [SharesCount] bigint NOT NULL,
        [ViewsCount] bigint NOT NULL,
        [EngagementRate] float NOT NULL,
        [ReachEstimate] float NOT NULL,
        [SentimentScore] nvarchar(100) NULL,
        [TopicsJson] nvarchar(500) NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialPosts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialPosts_SocialAccount_SocialAccountId] FOREIGN KEY ([SocialAccountId]) REFERENCES [SocialAccount] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [SocialRelationship] (
        [Id] uniqueidentifier NOT NULL,
        [SocialAccountId] uniqueidentifier NOT NULL,
        [RelatedUserId] nvarchar(100) NOT NULL,
        [RelatedUsername] nvarchar(100) NOT NULL,
        [RelatedDisplayName] nvarchar(200) NOT NULL,
        [RelatedProfileImage] nvarchar(500) NULL,
        [RelationshipType] nvarchar(50) NOT NULL,
        [EstablishedAt] datetime2 NOT NULL,
        [LastInteractionAt] datetime2 NULL,
        [RelationshipStrength] float NOT NULL,
        [IsActive] bit NOT NULL,
        [IsVerified] bit NOT NULL,
        [GeoLeapUserId] uniqueidentifier NULL,
        [MetadataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialRelationship] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialRelationship_AspNetUsers_GeoLeapUserId] FOREIGN KEY ([GeoLeapUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_SocialRelationship_SocialAccount_SocialAccountId] FOREIGN KEY ([SocialAccountId]) REFERENCES [SocialAccount] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserBehaviorFunnelSteps] (
        [Id] uniqueidentifier NOT NULL,
        [FunnelId] uniqueidentifier NOT NULL,
        [StepOrder] int NOT NULL,
        [StepName] nvarchar(200) NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [FilterConditions] nvarchar(max) NULL,
        [UserCount] int NOT NULL,
        [DropoffCount] int NOT NULL,
        [ConversionRate] decimal(5,4) NOT NULL,
        [DropoffRate] decimal(5,4) NOT NULL,
        [AverageTimeOnStep] int NULL,
        CONSTRAINT [PK_UserBehaviorFunnelSteps] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserBehaviorFunnelSteps_UserBehaviorFunnels_FunnelId] FOREIGN KEY ([FunnelId]) REFERENCES [UserBehaviorFunnels] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [UserBehaviorEvents] (
        [Id] uniqueidentifier NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [UserId] nvarchar(100) NULL,
        [SessionId] nvarchar(100) NOT NULL,
        [DeviceId] nvarchar(100) NULL,
        [ClientTimestamp] datetime2 NOT NULL,
        [ServerTimestamp] datetime2 NOT NULL,
        [PageUrl] nvarchar(500) NULL,
        [Referrer] nvarchar(500) NULL,
        [ElementSelector] nvarchar(200) NULL,
        [ElementText] nvarchar(500) NULL,
        [TimeOnPage] int NULL,
        [ScrollDepth] decimal(18,2) NULL,
        [MouseX] int NULL,
        [MouseY] int NULL,
        [SearchQuery] nvarchar(500) NULL,
        [SearchResultCount] int NULL,
        [ContentId] nvarchar(100) NULL,
        [ContentType] nvarchar(50) NULL,
        [ContentCategory] nvarchar(100) NULL,
        [InteractionDuration] int NULL,
        [FormCompletionPercentage] decimal(18,2) NULL,
        [FormFieldName] nvarchar(100) NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [ErrorCode] nvarchar(50) NULL,
        [Properties] nvarchar(max) NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(500) NULL,
        [ScreenResolution] nvarchar(20) NULL,
        [ViewportSize] nvarchar(20) NULL,
        [DeviceType] nvarchar(20) NULL,
        [OperatingSystem] nvarchar(50) NULL,
        [Browser] nvarchar(100) NULL,
        [Country] nvarchar(10) NULL,
        [Region] nvarchar(100) NULL,
        [City] nvarchar(100) NULL,
        [EventValue] decimal(18,2) NULL,
        [Currency] nvarchar(10) NULL,
        [ExperimentId] uniqueidentifier NULL,
        [ExperimentVariant] nvarchar(50) NULL,
        [Status] int NOT NULL,
        [ProcessingError] nvarchar(500) NULL,
        [SdkVersion] nvarchar(20) NULL,
        [HasConsent] bit NOT NULL,
        [ConsentCategories] nvarchar(200) NULL,
        [SessionSequence] int NOT NULL,
        [IsSessionStart] bit NOT NULL,
        [IsSessionEnd] bit NOT NULL,
        [SessionDuration] int NULL,
        [PageViewsInSession] int NULL,
        [IsReturningVisitor] bit NOT NULL,
        [DaysSinceLastVisit] int NULL,
        [UserSessionCount] int NULL,
        [UserBehaviorSessionId] uniqueidentifier NULL,
        CONSTRAINT [PK_UserBehaviorEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserBehaviorEvents_UserBehaviorSessions_UserBehaviorSessionId] FOREIGN KEY ([UserBehaviorSessionId]) REFERENCES [UserBehaviorSessions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnEffectivenessAlerts] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NULL,
        [StreamingServiceId] uniqueidentifier NULL,
        [RegionCode] nvarchar(10) NULL,
        [AlertType] int NOT NULL,
        [Severity] int NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [SuccessRateThreshold] float NULL,
        [SpeedThresholdMbps] float NULL,
        [MinTestSampleSize] int NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TriggeredAt] datetime2 NULL,
        [ResolvedAt] datetime2 NULL,
        [CreatedByUserId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_VpnEffectivenessAlerts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnEffectivenessAlerts_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]),
        CONSTRAINT [FK_VpnEffectivenessAlerts_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnEffectivenessHistories] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [StreamingServiceId] uniqueidentifier NOT NULL,
        [RegionCode] nvarchar(10) NOT NULL,
        [PeriodStart] datetime2 NOT NULL,
        [PeriodEnd] datetime2 NOT NULL,
        [SuccessRate] float NOT NULL,
        [AverageSpeedMbps] float NOT NULL,
        [AverageLatencyMs] float NOT NULL,
        [ReliabilityScore] float NOT NULL,
        [TotalTests] int NOT NULL,
        [SuccessfulTests] int NOT NULL,
        [FailedTests] int NOT NULL,
        [UserFeedbackCount] int NOT NULL,
        [AverageUserRating] float NOT NULL,
        [ConfidenceScore] float NOT NULL,
        [Status] int NOT NULL,
        CONSTRAINT [PK_VpnEffectivenessHistories] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnEffectivenessHistories_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnEffectivenessHistories_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnEffectivenessPredictions] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [StreamingServiceId] uniqueidentifier NOT NULL,
        [RegionCode] nvarchar(10) NOT NULL,
        [PredictionDate] datetime2 NOT NULL,
        [PredictionMadeAt] datetime2 NOT NULL,
        [PredictedSuccessRate] float NOT NULL,
        [PredictedSpeedMbps] float NOT NULL,
        [PredictedStatus] int NOT NULL,
        [PredictionConfidence] float NOT NULL,
        [ModelVersion] nvarchar(100) NOT NULL,
        [FeatureInputs] nvarchar(1000) NULL,
        [ActualSuccessRate] float NULL,
        [ActualSpeedMbps] float NULL,
        [ActualStatus] int NULL,
        [PredictionAccuracy] float NULL,
        CONSTRAINT [PK_VpnEffectivenessPredictions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnEffectivenessPredictions_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnEffectivenessPredictions_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnEffectivenessSnapshots] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [StreamingServiceId] uniqueidentifier NOT NULL,
        [RegionCode] nvarchar(10) NOT NULL,
        [SuccessRate] float NOT NULL,
        [AverageSpeedMbps] float NOT NULL,
        [AverageLatencyMs] float NOT NULL,
        [ReliabilityScore] float NOT NULL,
        [TotalTestsLast24h] int NOT NULL,
        [AutomatedTestsLast24h] int NOT NULL,
        [UserReportsLast24h] int NOT NULL,
        [ConfidenceScore] float NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        [LastSuccessfulTest] datetime2 NOT NULL,
        [LastFailedTest] datetime2 NULL,
        [SuccessRateTrend] float NOT NULL,
        [CurrentStatus] int NOT NULL,
        [StatusNotes] nvarchar(500) NULL,
        CONSTRAINT [PK_VpnEffectivenessSnapshots] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnEffectivenessSnapshots_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnEffectivenessSnapshots_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnEffectivenessSubscriptions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NULL,
        [StreamingServiceId] uniqueidentifier NULL,
        [RegionCode] nvarchar(10) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UnsubscribedAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [EmailNotifications] bit NOT NULL,
        [PushNotifications] bit NOT NULL,
        [InAppNotifications] bit NOT NULL,
        [SuccessRateThreshold] float NULL,
        [MinimumSeverity] int NOT NULL,
        CONSTRAINT [PK_VpnEffectivenessSubscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnEffectivenessSubscriptions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnEffectivenessSubscriptions_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]),
        CONSTRAINT [FK_VpnEffectivenessSubscriptions_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnEffectivenessTests] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [StreamingServiceId] uniqueidentifier NOT NULL,
        [RegionCode] nvarchar(10) NOT NULL,
        [ServerLocation] nvarchar(100) NULL,
        [TestType] int NOT NULL,
        [Result] int NOT NULL,
        [TestTimestamp] datetime2 NOT NULL,
        [ConnectionSpeedMbps] float NULL,
        [LatencyMs] int NULL,
        [ReliabilityScore] float NULL,
        [AccessSuccessful] bit NOT NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [TestDetails] nvarchar(1000) NULL,
        [TestingNodeId] nvarchar(100) NOT NULL,
        [UserAgent] nvarchar(1000) NULL,
        [TestDurationSeconds] float NOT NULL,
        CONSTRAINT [PK_VpnEffectivenessTests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnEffectivenessTests_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnEffectivenessTests_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnProviderRatings] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [RatingType] int NOT NULL,
        [Rating] int NOT NULL,
        [Review] nvarchar(1000) NULL,
        [SpeedRating] int NULL,
        [ReliabilityRating] int NULL,
        [EaseOfUseRating] int NULL,
        [CustomerSupportRating] int NULL,
        [ValueForMoneyRating] int NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NULL,
        [IsVerified] bit NOT NULL,
        [IsHelpful] bit NOT NULL,
        [HelpfulVotes] int NOT NULL,
        [UnhelpfulVotes] int NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        CONSTRAINT [PK_VpnProviderRatings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnProviderRatings_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnProviderRatings_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnServerLocations] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [Country] nvarchar(100) NOT NULL,
        [CountryCode] nvarchar(3) NOT NULL,
        [City] nvarchar(100) NULL,
        [ServerCount] int NOT NULL,
        [IsOptimizedForStreaming] bit NOT NULL,
        [IsP2PFriendly] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_VpnServerLocations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnServerLocations_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnSetupGuides] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Platform] nvarchar(100) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [StepCount] int NOT NULL,
        [EstimatedTime] time NOT NULL,
        [Difficulty] int NOT NULL,
        [Prerequisites] nvarchar(1000) NULL,
        [TroubleshootingTips] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [IsActive] bit NOT NULL,
        [ViewCount] int NOT NULL,
        [HelpfulnessRating] float NULL,
        [HelpfulnessVotes] int NOT NULL,
        CONSTRAINT [PK_VpnSetupGuides] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnSetupGuides_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnStreamingCompatibilities] (
        [Id] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [StreamingServiceId] uniqueidentifier NOT NULL,
        [Status] int NOT NULL,
        [Notes] nvarchar(500) NULL,
        [LastTested] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [CompatibleRegions] nvarchar(1000) NULL,
        CONSTRAINT [PK_VpnStreamingCompatibilities] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnStreamingCompatibilities_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnStreamingCompatibilities_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [VpnUserEffectivenessFeedbacks] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [VpnProviderId] uniqueidentifier NOT NULL,
        [StreamingServiceId] uniqueidentifier NOT NULL,
        [RegionCode] nvarchar(10) NOT NULL,
        [ServerLocation] nvarchar(100) NULL,
        [WasSuccessful] bit NOT NULL,
        [SpeedRating] int NULL,
        [ReliabilityRating] int NULL,
        [OverallExperience] int NULL,
        [Comments] nvarchar(1000) NULL,
        [IssuesEncountered] nvarchar(500) NULL,
        [TestDate] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(1000) NULL,
        [IsVerified] bit NOT NULL,
        [HelpfulVotes] int NOT NULL,
        [UnhelpfulVotes] int NOT NULL,
        CONSTRAINT [PK_VpnUserEffectivenessFeedbacks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VpnUserEffectivenessFeedbacks_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnUserEffectivenessFeedbacks_StreamingServices_StreamingServiceId] FOREIGN KEY ([StreamingServiceId]) REFERENCES [StreamingServices] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_VpnUserEffectivenessFeedbacks_VpnProviders_VpnProviderId] FOREIGN KEY ([VpnProviderId]) REFERENCES [VpnProviders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationDeliveries] (
        [Id] uniqueidentifier NOT NULL,
        [NotificationId] uniqueidentifier NOT NULL,
        [Channel] nvarchar(20) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [AttemptedAt] datetime2 NOT NULL,
        [DeliveredAt] datetime2 NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [ExternalId] nvarchar(100) NULL,
        [AttemptCount] int NOT NULL,
        [NextRetryAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [RetryCount] int NOT NULL,
        [LastRetryAt] datetime2 NULL,
        [MetadataJson] nvarchar(max) NULL,
        CONSTRAINT [PK_NotificationDeliveries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationDeliveries_Notifications_NotificationId] FOREIGN KEY ([NotificationId]) REFERENCES [Notifications] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationInteractions] (
        [Id] uniqueidentifier NOT NULL,
        [NotificationId] uniqueidentifier NOT NULL,
        [InteractionType] nvarchar(20) NOT NULL,
        [InteractionAt] datetime2 NOT NULL,
        [InteractionUrl] nvarchar(500) NULL,
        [UserAgent] nvarchar(100) NULL,
        [IpAddress] nvarchar(50) NULL,
        [DeviceType] nvarchar(50) NULL,
        [Platform] nvarchar(50) NULL,
        [ContextJson] nvarchar(max) NULL,
        CONSTRAINT [PK_NotificationInteractions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationInteractions_Notifications_NotificationId] FOREIGN KEY ([NotificationId]) REFERENCES [Notifications] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE TABLE [NotificationQueues] (
        [Id] uniqueidentifier NOT NULL,
        [NotificationId] uniqueidentifier NOT NULL,
        [Priority] nvarchar(20) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [QueuedAt] datetime2 NOT NULL,
        [ProcessedAt] datetime2 NULL,
        [ScheduledFor] datetime2 NULL,
        [RetryCount] int NOT NULL,
        [NextRetryAt] datetime2 NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [ProcessorId] nvarchar(100) NULL,
        CONSTRAINT [PK_NotificationQueues] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotificationQueues_Notifications_NotificationId] FOREIGN KEY ([NotificationId]) REFERENCES [Notifications] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_WatchlistNotificationSettings_UserId] ON [WatchlistNotificationSettings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialRecommendations_ExpiresAt] ON [SocialRecommendations] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialRecommendations_GeneratedAt] ON [SocialRecommendations] ([GeneratedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialRecommendations_RecommendationType_Score] ON [SocialRecommendations] ([RecommendationType], [Score]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialRecommendations_UserId_IsActive] ON [SocialRecommendations] ([UserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPrivacyConsents_ConsentGivenAt] ON [SocialPrivacyConsents] ([ConsentGivenAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPrivacyConsents_IsActive_IsGdprCompliant] ON [SocialPrivacyConsents] ([IsActive], [IsGdprCompliant]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPrivacyConsents_LastConsentUpdate] ON [SocialPrivacyConsents] ([LastConsentUpdate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SocialPrivacyConsents_UserId] ON [SocialPrivacyConsents] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPrivacyConsents_UserId1] ON [SocialPrivacyConsents] ([UserId1]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_FromUserId_ConnectionType] ON [SocialGraphConnections] ([FromUserId], [ConnectionType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SocialGraphConnections_FromUserId_ToUserId_Platform] ON [SocialGraphConnections] ([FromUserId], [ToUserId], [Platform]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_LastInteractionAt] ON [SocialGraphConnections] ([LastInteractionAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_Platform_IsActive] ON [SocialGraphConnections] ([Platform], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_Strength] ON [SocialGraphConnections] ([Strength]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_ToUserId_ConnectionType] ON [SocialGraphConnections] ([ToUserId], [ConnectionType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialConnections_ConnectedAt] ON [SocialConnections] ([ConnectedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialConnections_Platform_IsTokenValid] ON [SocialConnections] ([Platform], [IsTokenValid]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialConnections_PlatformConfigId] ON [SocialConnections] ([PlatformConfigId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialConnections_SocialUserId] ON [SocialConnections] ([SocialUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SocialConnections_UserId_Platform] ON [SocialConnections] ([UserId], [Platform]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivities_CreatedAt] ON [SocialActivities] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivities_Platform_ActivityType] ON [SocialActivities] ([Platform], [ActivityType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivities_TargetUserId_CreatedAt] ON [SocialActivities] ([TargetUserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivities_UserId_CreatedAt] ON [SocialActivities] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SeoPages_SeoTemplateId] ON [SeoPages] ([SeoTemplateId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthStates_CreatedAt] ON [OAuthStates] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthStates_ExpiresAt] ON [OAuthStates] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthStates_UserId_IsUsed] ON [OAuthStates] ([UserId], [IsUsed]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_NotificationPreferences_UserId1] ON [NotificationPreferences] ([UserId1]) WHERE [UserId1] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPlatformConfigurations_IsEnabled] ON [SocialPlatformConfigurations] ([IsEnabled]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SocialPlatformConfigurations_Platform] ON [SocialPlatformConfigurations] ([Platform]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPlatformConfigurations_UpdatedAt] ON [SocialPlatformConfigurations] ([UpdatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AbTestConversions_AbTestAssignmentId] ON [AbTestConversions] ([AbTestAssignmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AbTestVariant_AbTestExperimentId] ON [AbTestVariant] ([AbTestExperimentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AlertTriggers_AlertId] ON [AlertTriggers] ([AlertId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreListings_BundleId] ON [AppStoreListings] ([BundleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreListings_ParentListingId] ON [AppStoreListings] ([ParentListingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreListings_UserId] ON [AppStoreListings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreListings_UserId_AppStore] ON [AppStoreListings] ([UserId], [AppStore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreListings_UserId_Status] ON [AppStoreListings] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreReviews_ListingId] ON [AppStoreReviews] ([ListingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreReviews_ListingId_ReviewDate] ON [AppStoreReviews] ([ListingId], [ReviewDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreReviews_ReviewDate] ON [AppStoreReviews] ([ReviewDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreReviews_ReviewId] ON [AppStoreReviews] ([ReviewId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AppStoreReviews_SentimentLabel] ON [AppStoreReviews] ([SentimentLabel]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAbTests_AsoKeywordId] ON [AsoAbTests] ([AsoKeywordId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAbTests_ControlListingId] ON [AsoAbTests] ([ControlListingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAbTests_Status] ON [AsoAbTests] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAbTests_UserId] ON [AsoAbTests] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAbTests_UserId_Status] ON [AsoAbTests] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAbTests_VariantListingId] ON [AsoAbTests] ([VariantListingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAnalytics_Date] ON [AsoAnalytics] ([Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAnalytics_Granularity] ON [AsoAnalytics] ([Granularity]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAnalytics_ListingId] ON [AsoAnalytics] ([ListingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoAnalytics_ListingId_Date_Granularity] ON [AsoAnalytics] ([ListingId], [Date], [Granularity]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoKeywords_Keyword] ON [AsoKeywords] ([Keyword]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AsoKeywords_Keyword_AppStore_Country] ON [AsoKeywords] ([Keyword], [AppStore], [Country]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoKeywords_UserId] ON [AsoKeywords] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoKeywords_UserId_AppStore] ON [AsoKeywords] ([UserId], [AppStore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_AsoKeywords_UserId_Status] ON [AsoKeywords] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_ConsentRecords_UserId] ON [ConsentRecords] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_ContentRatings_UserId] ON [ContentRatings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_CrossBorderTransferRecords_UserId] ON [CrossBorderTransferRecords] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_DataSubjectRequests_UserId] ON [DataSubjectRequests] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DefaultPreferences_CategoryId_PreferenceKey] ON [DefaultPreferences] ([CategoryId], [PreferenceKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_DefaultPreferences_IsUserConfigurable] ON [DefaultPreferences] ([IsUserConfigurable]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_DefaultPreferences_Scope] ON [DefaultPreferences] ([Scope]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_KeywordRankings_KeywordId] ON [KeywordRankings] ([KeywordId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_KeywordRankings_KeywordId_ListingId_RankedAt] ON [KeywordRankings] ([KeywordId], [ListingId], [RankedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_KeywordRankings_ListingId] ON [KeywordRankings] ([ListingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_KeywordRankings_RankedAt] ON [KeywordRankings] ([RankedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_NotificationDeliveries_NotificationId] ON [NotificationDeliveries] ([NotificationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_NotificationInteractions_NotificationId] ON [NotificationInteractions] ([NotificationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_NotificationQueues_NotificationId] ON [NotificationQueues] ([NotificationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_NotificationRateLimits_UserId] ON [NotificationRateLimits] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_Notifications_NotificationCampaignId] ON [Notifications] ([NotificationCampaignId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_Notifications_UserId] ON [Notifications] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_NotificationSettings_UserId] ON [NotificationSettings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthToken_ExpiresAt] ON [OAuthToken] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthToken_LastUsed] ON [OAuthToken] ([LastUsed]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthToken_Platform_IsValid] ON [OAuthToken] ([Platform], [IsValid]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthToken_PlatformConfigId] ON [OAuthToken] ([PlatformConfigId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_OAuthToken_UserId_IsValid] ON [OAuthToken] ([UserId], [IsValid]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OAuthToken_UserId_Platform] ON [OAuthToken] ([UserId], [Platform]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PreferenceCategories_CategoryKey] ON [PreferenceCategories] ([CategoryKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PreferenceCategories_ParentCategoryId] ON [PreferenceCategories] ([ParentCategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PreferenceCategories_SortOrder] ON [PreferenceCategories] ([SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PreferenceHistory_CategoryKey] ON [PreferenceHistory] ([CategoryKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PreferenceHistory_CreatedAt] ON [PreferenceHistory] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PreferenceHistory_UserId] ON [PreferenceHistory] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PreferenceHistory_UserId_CategoryKey_PreferenceKey] ON [PreferenceHistory] ([UserId], [CategoryKey], [PreferenceKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PrivacyComplianceReports_UserId] ON [PrivacyComplianceReports] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PrivacyImpactAssessments_UserId] ON [PrivacyImpactAssessments] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_PrivacySettings_UserId] ON [PrivacySettings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_RecommendationSettings_UserId] ON [RecommendationSettings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialAccount_UserId] ON [SocialAccount] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_ActivityTimestamp] ON [SocialActivityFeeds] ([ActivityTimestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_ImportanceScore] ON [SocialActivityFeeds] ([ImportanceScore]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_IsPublic_ActivityTimestamp] ON [SocialActivityFeeds] ([IsPublic], [ActivityTimestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_Platform_ActivityType] ON [SocialActivityFeeds] ([Platform], [ActivityType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_PlatformConfigId] ON [SocialActivityFeeds] ([PlatformConfigId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_TargetUserId] ON [SocialActivityFeeds] ([TargetUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_UserId_ActivityTimestamp] ON [SocialActivityFeeds] ([UserId], [ActivityTimestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialActivityFeeds_UserId_IsRead] ON [SocialActivityFeeds] ([UserId], [IsRead]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialAnalytics_CreatedAt] ON [SocialAnalytics] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialAnalytics_LastActivityAt] ON [SocialAnalytics] ([LastActivityAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialAnalytics_Platform_PeriodType] ON [SocialAnalytics] ([Platform], [PeriodType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialAnalytics_PlatformConfigId] ON [SocialAnalytics] ([PlatformConfigId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialAnalytics_UserId_PeriodStart_PeriodEnd] ON [SocialAnalytics] ([UserId], [PeriodStart], [PeriodEnd]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialContentShares_UserId] ON [SocialContentShares] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialInteraction_SocialAccountId] ON [SocialInteraction] ([SocialAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialPosts_SocialAccountId] ON [SocialPosts] ([SocialAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialProofScores_UserId] ON [SocialProofScores] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialRelationship_GeoLeapUserId] ON [SocialRelationship] ([GeoLeapUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_SocialRelationship_SocialAccountId] ON [SocialRelationship] ([SocialAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_UserBehaviorEvents_UserBehaviorSessionId] ON [UserBehaviorEvents] ([UserBehaviorSessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_UserBehaviorFunnelSteps_FunnelId] ON [UserBehaviorFunnelSteps] ([FunnelId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_UserContentInteractions_UserId] ON [UserContentInteractions] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_UserNotifications_UserId] ON [UserNotifications] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_UserPreference_CategoryKey] ON [UserPreference] ([CategoryKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_UserPreference_UpdatedAt] ON [UserPreference] ([UpdatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserPreference_UserId_CategoryKey_PreferenceKey] ON [UserPreference] ([UserId], [CategoryKey], [PreferenceKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserVpnPreferences_UserId] ON [UserVpnPreferences] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnBestPractices_Category] ON [VpnBestPractices] ([Category]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnBestPractices_DisplayOrder] ON [VpnBestPractices] ([DisplayOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnBestPractices_HelpfulnessRating] ON [VpnBestPractices] ([HelpfulnessRating]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnBestPractices_ImportanceLevel] ON [VpnBestPractices] ([ImportanceLevel]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnBestPractices_IsActive] ON [VpnBestPractices] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessAlerts_StreamingServiceId] ON [VpnEffectivenessAlerts] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessAlerts_VpnProviderId] ON [VpnEffectivenessAlerts] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessHistories_StreamingServiceId] ON [VpnEffectivenessHistories] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessHistories_VpnProviderId] ON [VpnEffectivenessHistories] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessPredictions_StreamingServiceId] ON [VpnEffectivenessPredictions] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessPredictions_VpnProviderId] ON [VpnEffectivenessPredictions] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessSnapshots_StreamingServiceId] ON [VpnEffectivenessSnapshots] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessSnapshots_VpnProviderId] ON [VpnEffectivenessSnapshots] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessSubscriptions_StreamingServiceId] ON [VpnEffectivenessSubscriptions] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessSubscriptions_UserId] ON [VpnEffectivenessSubscriptions] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessSubscriptions_VpnProviderId] ON [VpnEffectivenessSubscriptions] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessTests_StreamingServiceId] ON [VpnEffectivenessTests] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnEffectivenessTests_VpnProviderId] ON [VpnEffectivenessTests] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_EventType] ON [VpnGuidanceAnalytics] ([EventType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_EventType_Timestamp] ON [VpnGuidanceAnalytics] ([EventType], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_GuideId] ON [VpnGuidanceAnalytics] ([GuideId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_SessionId] ON [VpnGuidanceAnalytics] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_Timestamp] ON [VpnGuidanceAnalytics] ([Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_UserId] ON [VpnGuidanceAnalytics] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_UserId_EventType_Timestamp] ON [VpnGuidanceAnalytics] ([UserId], [EventType], [Timestamp]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnGuidanceAnalytics_VpnProviderId] ON [VpnGuidanceAnalytics] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnLegalDisclaimers_CountryCode] ON [VpnLegalDisclaimers] ([CountryCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnLegalDisclaimers_DisplayOrder] ON [VpnLegalDisclaimers] ([DisplayOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnLegalDisclaimers_EffectiveDate] ON [VpnLegalDisclaimers] ([EffectiveDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnLegalDisclaimers_IsActive] ON [VpnLegalDisclaimers] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnLegalDisclaimers_IsRequired] ON [VpnLegalDisclaimers] ([IsRequired]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnLegalDisclaimers_Type] ON [VpnLegalDisclaimers] ([Type]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviderRatings_CreatedAt] ON [VpnProviderRatings] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviderRatings_Rating] ON [VpnProviderRatings] ([Rating]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviderRatings_UserId] ON [VpnProviderRatings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_VpnProviderRatings_UserId_VpnProviderId] ON [VpnProviderRatings] ([UserId], [VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviderRatings_VpnProviderId] ON [VpnProviderRatings] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviders_DisplayOrder] ON [VpnProviders] ([DisplayOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviders_IsActive] ON [VpnProviders] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviders_IsFeatured] ON [VpnProviders] ([IsFeatured]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviders_Name] ON [VpnProviders] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnProviders_OverallRating] ON [VpnProviders] ([OverallRating]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnServerLocations_Country] ON [VpnServerLocations] ([Country]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnServerLocations_CountryCode] ON [VpnServerLocations] ([CountryCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnServerLocations_IsOptimizedForStreaming] ON [VpnServerLocations] ([IsOptimizedForStreaming]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnServerLocations_IsP2PFriendly] ON [VpnServerLocations] ([IsP2PFriendly]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnServerLocations_VpnProviderId] ON [VpnServerLocations] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnSetupGuides_Difficulty] ON [VpnSetupGuides] ([Difficulty]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnSetupGuides_HelpfulnessRating] ON [VpnSetupGuides] ([HelpfulnessRating]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnSetupGuides_IsActive] ON [VpnSetupGuides] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnSetupGuides_Platform] ON [VpnSetupGuides] ([Platform]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnSetupGuides_VpnProviderId] ON [VpnSetupGuides] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnStreamingCompatibilities_LastTested] ON [VpnStreamingCompatibilities] ([LastTested]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnStreamingCompatibilities_Status] ON [VpnStreamingCompatibilities] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnStreamingCompatibilities_StreamingServiceId] ON [VpnStreamingCompatibilities] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnStreamingCompatibilities_VpnProviderId] ON [VpnStreamingCompatibilities] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE UNIQUE INDEX [IX_VpnStreamingCompatibilities_VpnProviderId_StreamingServiceId] ON [VpnStreamingCompatibilities] ([VpnProviderId], [StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnUserEffectivenessFeedbacks_StreamingServiceId] ON [VpnUserEffectivenessFeedbacks] ([StreamingServiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnUserEffectivenessFeedbacks_UserId] ON [VpnUserEffectivenessFeedbacks] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_VpnUserEffectivenessFeedbacks_VpnProviderId] ON [VpnUserEffectivenessFeedbacks] ([VpnProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    CREATE INDEX [IX_WatchlistSettings_WatchlistId] ON [WatchlistSettings] ([WatchlistId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [ContentAlternativeTitles] ADD CONSTRAINT [FK_ContentAlternativeTitles_SearchableContents_ContentId] FOREIGN KEY ([ContentId]) REFERENCES [SearchableContents] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [ContentStreamingOptions] ADD CONSTRAINT [FK_ContentStreamingOptions_SearchableContents_ContentId] FOREIGN KEY ([ContentId]) REFERENCES [SearchableContents] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [NotificationPreferences] ADD CONSTRAINT [FK_NotificationPreferences_AspNetUsers_UserId1] FOREIGN KEY ([UserId1]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SeoPages] ADD CONSTRAINT [FK_SeoPages_SeoTemplates_SeoTemplateId] FOREIGN KEY ([SeoTemplateId]) REFERENCES [SeoTemplates] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialActivities] ADD CONSTRAINT [FK_SocialActivities_AspNetUsers_TargetUserId] FOREIGN KEY ([TargetUserId]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialConnections] ADD CONSTRAINT [FK_SocialConnections_SocialPlatformConfigurations_PlatformConfigId] FOREIGN KEY ([PlatformConfigId]) REFERENCES [SocialPlatformConfigurations] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialGraphConnections] ADD CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_FromUserId] FOREIGN KEY ([FromUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialGraphConnections] ADD CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_ToUserId] FOREIGN KEY ([ToUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [SocialPrivacyConsents] ADD CONSTRAINT [FK_SocialPrivacyConsents_AspNetUsers_UserId1] FOREIGN KEY ([UserId1]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    ALTER TABLE [UserActivityLog] ADD CONSTRAINT [FK_UserActivityLog_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930014706_FixUserPreferenceTableName'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250930014706_FixUserPreferenceTableName', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930020533_FixSuspendedByCascadePathConflict'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250930020533_FixSuspendedByCascadePathConflict', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930174553_RecreateSocialGraphWithRestrict'
)
BEGIN

                    IF OBJECT_ID('dbo.SocialGraphConnections', 'U') IS NOT NULL
                    BEGIN
                        DROP TABLE dbo.SocialGraphConnections;
                    END
                
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930174553_RecreateSocialGraphWithRestrict'
)
BEGIN
    CREATE TABLE [SocialGraphConnections] (
        [Id] uniqueidentifier NOT NULL,
        [FromUserId] uniqueidentifier NOT NULL,
        [ToUserId] uniqueidentifier NOT NULL,
        [Platform] nvarchar(50) NOT NULL,
        [ConnectionType] nvarchar(50) NOT NULL,
        [Strength] float NOT NULL,
        [EstablishedAt] datetime2 NOT NULL,
        [LastInteractionAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        [IsVerified] bit NOT NULL,
        [ConnectionDataJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SocialGraphConnections] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_FromUserId] FOREIGN KEY ([FromUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_ToUserId] FOREIGN KEY ([ToUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930174553_RecreateSocialGraphWithRestrict'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_FromUserId] ON [SocialGraphConnections] ([FromUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930174553_RecreateSocialGraphWithRestrict'
)
BEGIN
    CREATE INDEX [IX_SocialGraphConnections_ToUserId] ON [SocialGraphConnections] ([ToUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930174553_RecreateSocialGraphWithRestrict'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250930174553_RecreateSocialGraphWithRestrict', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930223532_SyncPendingModelChanges'
)
BEGIN
    ALTER TABLE [SocialGraphConnections] DROP CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_ToUserId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930223532_SyncPendingModelChanges'
)
BEGIN
    ALTER TABLE [SocialGraphConnections] ADD CONSTRAINT [FK_SocialGraphConnections_AspNetUsers_ToUserId] FOREIGN KEY ([ToUserId]) REFERENCES [AspNetUsers] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250930223532_SyncPendingModelChanges'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250930223532_SyncPendingModelChanges', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] uniqueidentifier NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] uniqueidentifier NOT NULL,
        [RoleId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251007150212_AddIdentityRoleTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251007150212_AddIdentityRoleTables', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnEffectivenessAlerts];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnEffectivenessHistories];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnEffectivenessPredictions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnEffectivenessSnapshots];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnEffectivenessSubscriptions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnEffectivenessTests];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    DROP TABLE [VpnUserEffectivenessFeedbacks];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030225056_SyncPendingModelChanges20251030'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251030225056_SyncPendingModelChanges20251030', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251030230045_AddMissingQualityProperties'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251030230045_AddMissingQualityProperties', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251031223821_AddUserStreamingSubscriptions'
)
BEGIN
    CREATE TABLE [UserStreamingSubscriptions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ServiceId] nvarchar(100) NOT NULL,
        [ServiceName] nvarchar(200) NOT NULL,
        [IsActive] bit NOT NULL,
        [AddedAt] datetime2 NOT NULL,
        [RemovedAt] datetime2 NULL,
        [SubscriptionTier] nvarchar(50) NULL,
        [Notes] nvarchar(500) NULL,
        CONSTRAINT [PK_UserStreamingSubscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserStreamingSubscriptions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251031223821_AddUserStreamingSubscriptions'
)
BEGIN
    CREATE INDEX [IX_UserStreamingSubscriptions_UserId] ON [UserStreamingSubscriptions] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251031223821_AddUserStreamingSubscriptions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251031223821_AddUserStreamingSubscriptions', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251103162934_AddMobileSubscriptionsTable'
)
BEGIN
    CREATE TABLE [MobileSubscriptions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Tier] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [Platform] nvarchar(20) NOT NULL,
        [ProductId] nvarchar(200) NULL,
        [TransactionId] nvarchar(200) NULL,
        [OriginalTransactionId] nvarchar(200) NULL,
        [ReceiptData] nvarchar(max) NULL,
        [PurchaseToken] nvarchar(500) NULL,
        [StartDate] datetime2 NULL,
        [EndDate] datetime2 NULL,
        [AutoRenew] bit NOT NULL,
        [LastVerified] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_MobileSubscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MobileSubscriptions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251103162934_AddMobileSubscriptionsTable'
)
BEGIN
    CREATE INDEX [IX_MobileSubscriptions_UserId] ON [MobileSubscriptions] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251103162934_AddMobileSubscriptionsTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251103162934_AddMobileSubscriptionsTable', N'9.0.8');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251106170749_RemoveEmailVerification'
)
BEGIN
    DROP TABLE [EmailVerificationTokens];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251106170749_RemoveEmailVerification'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251106170749_RemoveEmailVerification', N'9.0.8');
END;

COMMIT;
GO

