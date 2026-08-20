using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;

namespace GeoLeap.Api.Services.Templates;

/// <summary>
/// Localization service implementation supporting multiple languages for email templates
/// </summary>
public class LocalizationService : ILocalizationService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<LocalizationService> _logger;
    private readonly Dictionary<string, Dictionary<string, string>> _localizations;
    private readonly object _lockObject = new object();

    // Cache key prefix
    private const string CACHE_PREFIX = "localization_";
    private const int CACHE_DURATION_MINUTES = 60;

    public LocalizationService(IMemoryCache cache, ILogger<LocalizationService> logger)
    {
        _cache = cache;
        _logger = logger;
        _localizations = new Dictionary<string, Dictionary<string, string>>();
        
        InitializeLocalizations();
    }

    public string GetString(string key, string language, params object[] parameters)
    {
        try
        {
            if (string.IsNullOrEmpty(key) || string.IsNullOrEmpty(language))
                return key;

            // Normalize language
            language = NormalizeLanguage(language);

            // Try to get from cache first
            var cacheKey = $"{CACHE_PREFIX}{language}_{key}";
            if (_cache.TryGetValue(cacheKey, out string cachedValue))
            {
                return FormatString(cachedValue, parameters);
            }

            // Get from localizations
            if (_localizations.TryGetValue(language, out var languageStrings) &&
                languageStrings.TryGetValue(key, out var localizedString))
            {
                // Cache the result
                _cache.Set(cacheKey, localizedString, TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));
                return FormatString(localizedString, parameters);
            }

            // Return key if not found (common practice in localization)
            _logger.LogWarning("Localization key '{Key}' not found for language '{Language}'", key, language);
            return key;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting localized string for key '{Key}' and language '{Language}'", key, language);
            return key;
        }
    }

    public string GetStringWithFallback(string key, string language, string fallbackLanguage = "en-US", params object[] parameters)
    {
        // Try primary language first
        var result = GetString(key, language, parameters);
        
        // If key was returned unchanged, try fallback language
        if (result == key && language != fallbackLanguage)
        {
            result = GetString(key, fallbackLanguage, parameters);
        }

        return result;
    }

    public bool HasKey(string key, string language)
    {
        if (string.IsNullOrEmpty(key) || string.IsNullOrEmpty(language))
            return false;

        language = NormalizeLanguage(language);
        return _localizations.TryGetValue(language, out var languageStrings) &&
               languageStrings.ContainsKey(key);
    }

    public async Task<List<string>> GetAvailableLanguagesAsync()
    {
        await Task.CompletedTask; // For async pattern consistency
        return _localizations.Keys.ToList();
    }

    public async Task<Dictionary<string, string>> GetAllStringsAsync(string language)
    {
        await Task.CompletedTask;
        language = NormalizeLanguage(language);
        
        return _localizations.TryGetValue(language, out var languageStrings) 
            ? new Dictionary<string, string>(languageStrings)
            : new Dictionary<string, string>();
    }

    public async Task ReloadAsync()
    {
        await Task.Run(() =>
        {
            lock (_lockObject)
            {
                _localizations.Clear();
                _cache.Remove(CACHE_PREFIX); // Clear cache with prefix
                InitializeLocalizations();
            }
        });

        _logger.LogInformation("Localization data reloaded");
    }

    public string GetDateFormat(string language)
    {
        return NormalizeLanguage(language) switch
        {
            "en-US" => "M/d/yyyy",
            "en-GB" => "dd/MM/yyyy",
            "es-US" => "d/M/yyyy",
            "fr-FR" => "dd/MM/yyyy",
            _ => "M/d/yyyy"
        };
    }

    public string GetTimeFormat(string language)
    {
        return NormalizeLanguage(language) switch
        {
            "en-US" => "h:mm tt",
            "en-GB" => "HH:mm",
            "es-US" => "h:mm tt",
            "fr-FR" => "HH:mm",
            _ => "h:mm tt"
        };
    }

    public NumberFormatInfo GetNumberFormat(string language)
    {
        try
        {
            var culture = new CultureInfo(NormalizeLanguage(language));
            return culture.NumberFormat;
        }
        catch
        {
            return CultureInfo.InvariantCulture.NumberFormat;
        }
    }

    public string FormatDate(DateTime date, string language, string format = "d")
    {
        try
        {
            var culture = new CultureInfo(NormalizeLanguage(language));
            return date.ToString(format, culture);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error formatting date for language '{Language}', using invariant culture", language);
            return date.ToString(format, CultureInfo.InvariantCulture);
        }
    }

    public string FormatNumber(decimal number, string language, string format = "N2")
    {
        try
        {
            var culture = new CultureInfo(NormalizeLanguage(language));
            return number.ToString(format, culture);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error formatting number for language '{Language}', using invariant culture", language);
            return number.ToString(format, CultureInfo.InvariantCulture);
        }
    }

    #region Private Methods

    private void InitializeLocalizations()
    {
        // Initialize English (US) - Base language
        InitializeEnglishUS();
        
        // Initialize English (GB)
        InitializeEnglishGB();
        
        // Initialize Spanish (US)
        InitializeSpanishUS();
        
        // Initialize French (France)
        InitializeFrenchFR();

        _logger.LogInformation("Initialized localizations for {Count} languages", _localizations.Count);
    }

    private void InitializeEnglishUS()
    {
        var enUS = new Dictionary<string, string>
        {
            // Common greetings and phrases
            ["common.greeting"] = "Hello",
            ["common.goodbye"] = "Best regards",
            ["common.guest"] = "Guest",
            ["common.loading"] = "Loading...",
            ["common.error"] = "An error occurred",
            ["common.success"] = "Success",
            ["common.warning"] = "Warning",
            ["common.info"] = "Information",

            // Email-specific strings
            ["email.header.company"] = "GeoLeap",
            ["email.footer.copyright"] = "© {0} GeoLeap. All rights reserved.",
            ["email.footer.unsubscribe"] = "Unsubscribe from these notifications",
            ["email.footer.privacy"] = "Privacy Policy",
            ["email.footer.support"] = "Contact Support",

            // Welcome email
            ["email.welcome.subject"] = "Welcome to GeoLeap, {0}!",
            ["email.welcome.title"] = "Welcome to GeoLeap!",
            ["email.welcome.intro"] = "We're excited to have you on board!",
            ["email.welcome.features.title"] = "Here's what you can do:",
            ["email.welcome.features.watchlists"] = "Create personalized watchlists",
            ["email.welcome.features.notifications"] = "Get notified when content becomes available",
            ["email.welcome.features.tracking"] = "Track content across multiple platforms",
            ["email.welcome.features.recommendations"] = "Receive personalized recommendations",
            ["email.welcome.cta"] = "Get Started",
            ["email.welcome.closing"] = "Happy streaming!",

            // Content leaving notifications
            ["email.content_leaving.subject"] = "⚠️ {0} is leaving {1} soon!",
            ["email.content_leaving.title"] = "Content Leaving Soon",
            ["email.content_leaving.intro"] = "{0} is leaving {1} on {2}.",
            ["email.content_leaving.urgency"] = "You have {0} day{1} left to watch it!",
            ["email.content_leaving.cta"] = "Watch Now",
            ["email.content_leaving.closing"] = "Don't miss out!",

            // Content available notifications
            ["email.content_available.subject"] = "🎉 {0} is now available on {1}!",
            ["email.content_available.title"] = "New Content Available",
            ["email.content_available.intro"] = "{0} is now available on {1}!",
            ["email.content_available.cta"] = "Watch Now",
            ["email.content_available.closing"] = "Enjoy your show!",

            // Regional availability
            ["email.regional_availability.subject"] = "📍 Regional availability update for {0}",
            ["email.regional_availability.title"] = "Regional Availability Update",
            ["email.regional_availability.added"] = "Now available in:",
            ["email.regional_availability.removed"] = "No longer available in:",

            // Content expiring
            ["email.content_expiring.subject"] = "⏰ Content from your watchlist is expiring soon",
            ["email.content_expiring.title"] = "Content Expiring Soon",
            ["email.content_expiring.urgent"] = "Urgent - Expires in {0} day{1}:",
            ["email.content_expiring.normal"] = "Expires soon:",

            // Weekly digest
            ["email.weekly_digest.subject"] = "📺 Your Weekly GeoLeap Digest - {0}",
            ["email.weekly_digest.title"] = "Your Weekly Digest",
            ["email.weekly_digest.period"] = "Week of {0}",
            ["email.weekly_digest.new_content"] = "New content added:",
            ["email.weekly_digest.leaving_content"] = "Content leaving soon:",
            ["email.weekly_digest.highlights"] = "This week's highlights:",

            // Monthly digest
            ["email.monthly_digest.subject"] = "📊 Your {0} {1} GeoLeap Report",
            ["email.monthly_digest.title"] = "Your Monthly Report",
            ["email.monthly_digest.period"] = "{0} {1}",
            ["email.monthly_digest.watched"] = "Content watched: {0}",
            ["email.monthly_digest.added"] = "Items added to watchlist: {0}",
            ["email.monthly_digest.top_genres"] = "Your top genres:",

            // Personalized recommendations
            ["email.recommendations.subject"] = "🎯 {0} personalized picks for you!",
            ["email.recommendations.title"] = "Personalized Recommendations",
            ["email.recommendations.intro"] = "Based on your viewing preferences, here are some shows and movies you might enjoy:",
            ["email.recommendations.based_on"] = "Based on your interest in: {0}",

            // Password reset
            ["email.password_reset.subject"] = "🔒 Password reset request for your GeoLeap account",
            ["email.password_reset.title"] = "Password Reset Request",
            ["email.password_reset.intro"] = "We received a request to reset your password.",
            ["email.password_reset.cta"] = "Reset Password",
            ["email.password_reset.expires"] = "This link expires in {0} hours.",
            ["email.password_reset.ignore"] = "If you didn't request this, please ignore this email.",

            // Email verification
            ["email.verification.subject"] = "✅ Please verify your GeoLeap email address",
            ["email.verification.title"] = "Verify Your Email",
            ["email.verification.intro"] = "Please click the button below to verify your email address.",
            ["email.verification.cta"] = "Verify Email",
            ["email.verification.expires"] = "This link expires in {0} hours.",

            // Date and time formats
            ["date.format.short"] = "M/d/yyyy",
            ["date.format.long"] = "MMMM d, yyyy",
            ["time.format.short"] = "h:mm tt",
            ["time.format.long"] = "h:mm:ss tt",

            // Numbers and pluralization
            ["number.day"] = "day",
            ["number.days"] = "days",
            ["number.hour"] = "hour",
            ["number.hours"] = "hours",
            ["number.minute"] = "minute",
            ["number.minutes"] = "minutes",

            // Image alt texts
            ["image.logo.alt"] = "GeoLeap Logo",
            ["image.banner.alt"] = "GeoLeap Banner",
            ["image.icon.alt"] = "Notification Icon"
        };

        _localizations["en-US"] = enUS;
    }

    private void InitializeEnglishGB()
    {
        // Start with US English as base
        var enGB = new Dictionary<string, string>(_localizations["en-US"]);

        // Override with British English variants
        enGB["email.welcome.features.watchlists"] = "Create personalised watchlists";
        enGB["email.welcome.features.recommendations"] = "Receive personalised recommendations";
        enGB["email.recommendations.title"] = "Personalised Recommendations";
        enGB["date.format.short"] = "dd/MM/yyyy";
        enGB["date.format.long"] = "d MMMM yyyy";
        enGB["time.format.short"] = "HH:mm";
        enGB["time.format.long"] = "HH:mm:ss";

        _localizations["en-GB"] = enGB;
    }

    private void InitializeSpanishUS()
    {
        var esUS = new Dictionary<string, string>
        {
            // Common greetings and phrases
            ["common.greeting"] = "Hola",
            ["common.goodbye"] = "Saludos cordiales",
            ["common.guest"] = "Invitado",
            ["common.loading"] = "Cargando...",
            ["common.error"] = "Ocurrió un error",
            ["common.success"] = "Éxito",
            ["common.warning"] = "Advertencia",
            ["common.info"] = "Información",

            // Email-specific strings
            ["email.header.company"] = "GeoLeap",
            ["email.footer.copyright"] = "© {0} GeoLeap. Todos los derechos reservados.",
            ["email.footer.unsubscribe"] = "Cancelar suscripción a estas notificaciones",
            ["email.footer.privacy"] = "Política de Privacidad",
            ["email.footer.support"] = "Contactar Soporte",

            // Welcome email
            ["email.welcome.subject"] = "¡Bienvenido a GeoLeap, {0}!",
            ["email.welcome.title"] = "¡Bienvenido a GeoLeap!",
            ["email.welcome.intro"] = "¡Estamos emocionados de tenerte con nosotros!",
            ["email.welcome.features.title"] = "Esto es lo que puedes hacer:",
            ["email.welcome.features.watchlists"] = "Crear listas de seguimiento personalizadas",
            ["email.welcome.features.notifications"] = "Recibir notificaciones cuando el contenido esté disponible",
            ["email.welcome.features.tracking"] = "Seguir contenido en múltiples plataformas",
            ["email.welcome.features.recommendations"] = "Recibir recomendaciones personalizadas",
            ["email.welcome.cta"] = "Comenzar",
            ["email.welcome.closing"] = "¡Feliz streaming!",

            // Content leaving notifications
            ["email.content_leaving.subject"] = "⚠️ ¡{0} dejará {1} pronto!",
            ["email.content_leaving.title"] = "Contenido Saliendo Pronto",
            ["email.content_leaving.intro"] = "{0} dejará {1} el {2}.",
            ["email.content_leaving.urgency"] = "¡Te quedan {0} día{1} para verlo!",
            ["email.content_leaving.cta"] = "Ver Ahora",
            ["email.content_leaving.closing"] = "¡No te lo pierdas!",

            // Content available notifications
            ["email.content_available.subject"] = "🎉 ¡{0} ya está disponible en {1}!",
            ["email.content_available.title"] = "Nuevo Contenido Disponible",
            ["email.content_available.intro"] = "¡{0} ya está disponible en {1}!",
            ["email.content_available.cta"] = "Ver Ahora",
            ["email.content_available.closing"] = "¡Disfruta tu programa!",

            // Regional availability
            ["email.regional_availability.subject"] = "📍 Actualización de disponibilidad regional para {0}",
            ["email.regional_availability.title"] = "Actualización de Disponibilidad Regional",
            ["email.regional_availability.added"] = "Ahora disponible en:",
            ["email.regional_availability.removed"] = "Ya no disponible en:",

            // Content expiring
            ["email.content_expiring.subject"] = "⏰ El contenido de tu lista está por expirar",
            ["email.content_expiring.title"] = "Contenido Expirando Pronto",
            ["email.content_expiring.urgent"] = "Urgente - Expira en {0} día{1}:",
            ["email.content_expiring.normal"] = "Expira pronto:",

            // Weekly digest
            ["email.weekly_digest.subject"] = "📺 Tu Resumen Semanal de GeoLeap - {0}",
            ["email.weekly_digest.title"] = "Tu Resumen Semanal",
            ["email.weekly_digest.period"] = "Semana del {0}",
            ["email.weekly_digest.new_content"] = "Nuevo contenido agregado:",
            ["email.weekly_digest.leaving_content"] = "Contenido que se va pronto:",
            ["email.weekly_digest.highlights"] = "Lo destacado de esta semana:",

            // Monthly digest
            ["email.monthly_digest.subject"] = "📊 Tu Reporte de GeoLeap - {0} {1}",
            ["email.monthly_digest.title"] = "Tu Reporte Mensual",
            ["email.monthly_digest.period"] = "{0} {1}",
            ["email.monthly_digest.watched"] = "Contenido visto: {0}",
            ["email.monthly_digest.added"] = "Elementos agregados a la lista: {0}",
            ["email.monthly_digest.top_genres"] = "Tus géneros favoritos:",

            // Personalized recommendations
            ["email.recommendations.subject"] = "🎯 ¡{0} recomendaciones personalizadas para ti!",
            ["email.recommendations.title"] = "Recomendaciones Personalizadas",
            ["email.recommendations.intro"] = "Basado en tus preferencias de visualización, aquí tienes algunos programas y películas que podrían gustarte:",
            ["email.recommendations.based_on"] = "Basado en tu interés en: {0}",

            // Password reset
            ["email.password_reset.subject"] = "🔒 Solicitud de restablecimiento de contraseña para tu cuenta GeoLeap",
            ["email.password_reset.title"] = "Solicitud de Restablecimiento de Contraseña",
            ["email.password_reset.intro"] = "Recibimos una solicitud para restablecer tu contraseña.",
            ["email.password_reset.cta"] = "Restablecer Contraseña",
            ["email.password_reset.expires"] = "Este enlace expira en {0} horas.",
            ["email.password_reset.ignore"] = "Si no solicitaste esto, por favor ignora este correo.",

            // Email verification
            ["email.verification.subject"] = "✅ Por favor verifica tu dirección de email de GeoLeap",
            ["email.verification.title"] = "Verifica Tu Email",
            ["email.verification.intro"] = "Por favor haz clic en el botón de abajo para verificar tu dirección de email.",
            ["email.verification.cta"] = "Verificar Email",
            ["email.verification.expires"] = "Este enlace expira en {0} horas.",

            // Date and time formats
            ["date.format.short"] = "d/M/yyyy",
            ["date.format.long"] = "d 'de' MMMM 'de' yyyy",
            ["time.format.short"] = "h:mm tt",
            ["time.format.long"] = "h:mm:ss tt",

            // Numbers and pluralization
            ["number.day"] = "día",
            ["number.days"] = "días",
            ["number.hour"] = "hora",
            ["number.hours"] = "horas",
            ["number.minute"] = "minuto",
            ["number.minutes"] = "minutos",

            // Image alt texts
            ["image.logo.alt"] = "Logo de GeoLeap",
            ["image.banner.alt"] = "Banner de GeoLeap",
            ["image.icon.alt"] = "Icono de Notificación"
        };

        _localizations["es-US"] = esUS;
    }

    private void InitializeFrenchFR()
    {
        var frFR = new Dictionary<string, string>
        {
            // Common greetings and phrases
            ["common.greeting"] = "Bonjour",
            ["common.goodbye"] = "Cordialement",
            ["common.guest"] = "Invité",
            ["common.loading"] = "Chargement...",
            ["common.error"] = "Une erreur s'est produite",
            ["common.success"] = "Succès",
            ["common.warning"] = "Avertissement",
            ["common.info"] = "Information",

            // Email-specific strings
            ["email.header.company"] = "GeoLeap",
            ["email.footer.copyright"] = "© {0} GeoLeap. Tous droits réservés.",
            ["email.footer.unsubscribe"] = "Se désabonner de ces notifications",
            ["email.footer.privacy"] = "Politique de Confidentialité",
            ["email.footer.support"] = "Contacter le Support",

            // Welcome email
            ["email.welcome.subject"] = "Bienvenue chez GeoLeap, {0} !",
            ["email.welcome.title"] = "Bienvenue chez GeoLeap !",
            ["email.welcome.intro"] = "Nous sommes ravis de vous compter parmi nous !",
            ["email.welcome.features.title"] = "Voici ce que vous pouvez faire :",
            ["email.welcome.features.watchlists"] = "Créer des listes de suivi personnalisées",
            ["email.welcome.features.notifications"] = "Être notifié lorsque le contenu devient disponible",
            ["email.welcome.features.tracking"] = "Suivre le contenu sur plusieurs plateformes",
            ["email.welcome.features.recommendations"] = "Recevoir des recommandations personnalisées",
            ["email.welcome.cta"] = "Commencer",
            ["email.welcome.closing"] = "Bon streaming !",

            // Content leaving notifications
            ["email.content_leaving.subject"] = "⚠️ {0} quittera bientôt {1} !",
            ["email.content_leaving.title"] = "Contenu Partant Bientôt",
            ["email.content_leaving.intro"] = "{0} quittera {1} le {2}.",
            ["email.content_leaving.urgency"] = "Il vous reste {0} jour{1} pour le regarder !",
            ["email.content_leaving.cta"] = "Regarder Maintenant",
            ["email.content_leaving.closing"] = "Ne le manquez pas !",

            // Content available notifications
            ["email.content_available.subject"] = "🎉 {0} est maintenant disponible sur {1} !",
            ["email.content_available.title"] = "Nouveau Contenu Disponible",
            ["email.content_available.intro"] = "{0} est maintenant disponible sur {1} !",
            ["email.content_available.cta"] = "Regarder Maintenant",
            ["email.content_available.closing"] = "Profitez de votre émission !",

            // Regional availability
            ["email.regional_availability.subject"] = "📍 Mise à jour de la disponibilité régionale pour {0}",
            ["email.regional_availability.title"] = "Mise à Jour de la Disponibilité Régionale",
            ["email.regional_availability.added"] = "Maintenant disponible dans :",
            ["email.regional_availability.removed"] = "Plus disponible dans :",

            // Content expiring
            ["email.content_expiring.subject"] = "⏰ Le contenu de votre liste de suivi expire bientôt",
            ["email.content_expiring.title"] = "Contenu Expirant Bientôt",
            ["email.content_expiring.urgent"] = "Urgent - Expire dans {0} jour{1} :",
            ["email.content_expiring.normal"] = "Expire bientôt :",

            // Weekly digest
            ["email.weekly_digest.subject"] = "📺 Votre Résumé Hebdomadaire GeoLeap - {0}",
            ["email.weekly_digest.title"] = "Votre Résumé Hebdomadaire",
            ["email.weekly_digest.period"] = "Semaine du {0}",
            ["email.weekly_digest.new_content"] = "Nouveau contenu ajouté :",
            ["email.weekly_digest.leaving_content"] = "Contenu partant bientôt :",
            ["email.weekly_digest.highlights"] = "Les points forts de cette semaine :",

            // Monthly digest
            ["email.monthly_digest.subject"] = "📊 Votre Rapport GeoLeap - {0} {1}",
            ["email.monthly_digest.title"] = "Votre Rapport Mensuel",
            ["email.monthly_digest.period"] = "{0} {1}",
            ["email.monthly_digest.watched"] = "Contenu regardé : {0}",
            ["email.monthly_digest.added"] = "Éléments ajoutés à la liste : {0}",
            ["email.monthly_digest.top_genres"] = "Vos genres préférés :",

            // Personalized recommendations
            ["email.recommendations.subject"] = "🎯 {0} recommandations personnalisées pour vous !",
            ["email.recommendations.title"] = "Recommandations Personnalisées",
            ["email.recommendations.intro"] = "Basé sur vos préférences de visionnage, voici quelques émissions et films que vous pourriez apprécier :",
            ["email.recommendations.based_on"] = "Basé sur votre intérêt pour : {0}",

            // Password reset
            ["email.password_reset.subject"] = "🔒 Demande de réinitialisation de mot de passe pour votre compte GeoLeap",
            ["email.password_reset.title"] = "Demande de Réinitialisation de Mot de Passe",
            ["email.password_reset.intro"] = "Nous avons reçu une demande de réinitialisation de votre mot de passe.",
            ["email.password_reset.cta"] = "Réinitialiser le Mot de Passe",
            ["email.password_reset.expires"] = "Ce lien expire dans {0} heures.",
            ["email.password_reset.ignore"] = "Si vous n'avez pas demandé ceci, veuillez ignorer cet e-mail.",

            // Email verification
            ["email.verification.subject"] = "✅ Veuillez vérifier votre adresse e-mail GeoLeap",
            ["email.verification.title"] = "Vérifiez Votre E-mail",
            ["email.verification.intro"] = "Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse e-mail.",
            ["email.verification.cta"] = "Vérifier l'E-mail",
            ["email.verification.expires"] = "Ce lien expire dans {0} heures.",

            // Date and time formats
            ["date.format.short"] = "dd/MM/yyyy",
            ["date.format.long"] = "d MMMM yyyy",
            ["time.format.short"] = "HH:mm",
            ["time.format.long"] = "HH:mm:ss",

            // Numbers and pluralization
            ["number.day"] = "jour",
            ["number.days"] = "jours",
            ["number.hour"] = "heure",
            ["number.hours"] = "heures",
            ["number.minute"] = "minute",
            ["number.minutes"] = "minutes",

            // Image alt texts
            ["image.logo.alt"] = "Logo GeoLeap",
            ["image.banner.alt"] = "Bannière GeoLeap",
            ["image.icon.alt"] = "Icône de Notification"
        };

        _localizations["fr-FR"] = frFR;
    }

    private string NormalizeLanguage(string language)
    {
        if (string.IsNullOrEmpty(language))
            return "en-US";

        // Handle common variations
        language = language.Replace("_", "-");
        
        // Try exact match first
        if (_localizations.ContainsKey(language))
            return language;

        // Try to match by language code only
        var languageCode = language.Split('-')[0].ToLower();
        var match = _localizations.Keys.FirstOrDefault(k => k.StartsWith(languageCode, StringComparison.OrdinalIgnoreCase));
        
        return match ?? "en-US";
    }

    private string FormatString(string template, params object[] parameters)
    {
        if (string.IsNullOrEmpty(template) || parameters == null || parameters.Length == 0)
            return template;

        try
        {
            return string.Format(template, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error formatting localized string: {Template}", template);
            return template;
        }
    }

    #endregion
}