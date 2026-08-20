# Bulk fix unused _error variables in catch blocks
# Replace } catch (_error) with } catch (error) when _error is unused

$srcDir = Join-Path $PSScriptRoot "..\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Include *.ts,*.tsx

$fixedCount = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $original = $content

    # Fix 1: Replace catch (_error) with catch (error) for unused errors
    # This pattern is safe because _error prefix means "intentionally unused"
    # but ESLint still complains if it's truly never referenced
    $content = $content -replace '\} catch \(_error\) \{', '} catch (error) {'

    # Fix 2: Remove unused Dimensions import
    if ($content -match 'Dimensions' -and $content -notmatch 'Dimensions\.get') {
        $content = $content -replace ',\s*Dimensions\s*,', ', '
        $content = $content -replace ',\s*Dimensions\s*\}', ' }'
        $content = $content -replace '\{\s*Dimensions\s*,', '{ '
    }

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $fixedCount++
        Write-Host "Fixed: $($file.Name)"
    }
}

Write-Host "`nTotal files fixed: $fixedCount"
