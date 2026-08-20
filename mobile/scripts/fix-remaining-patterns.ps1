# Fix remaining common linting patterns

$srcDir = Join-Path $PSScriptRoot "..\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch "test" }

$fixedCount = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $original = $content
    $fileName = $file.Name

    # Fix 1: Prefix unused error variables in regular catch blocks with _
    $content = $content -replace '(\} catch \(error\) \{[^\}]*?)(\})(\s*\})', {
        param($match)
        # Check if 'error' is used in the block
        $block = $match.Groups[1].Value
        if ($block -notmatch 'error[^\w]' -and $block -notmatch '\berror\b' -or $block -match 'catch \(error\) \{\s*\}') {
            $match.Value -replace '\(error\)', '(_error)'
        } else {
            $match.Value
        }
    }

    # Fix 2: Prefix unused 'width' from Dimensions.get
    if ($content -match "const \{ width \} = Dimensions\.get\('window'\);" -and $content -notmatch '\bwidth\b.*[^=]') {
        $content = $content -replace "const \{ width \}", "const { width: _width }"
    }

    # Fix 3: Prefix other unused Dimensions widths
    $content = $content -replace "const \{ width, height \} = Dimensions\.get", "const { height } = Dimensions.get"
    $content = $content -replace "const \{ width \} = Dimensions\.get", "// const { _width } = Dimensions.get // Unused"

    # Fix 4: Prefix unused function parameters
    # errorInfo parameter
    $content = $content -replace '\(error,\s*errorInfo\)\s*=>', '(error, _errorInfo) =>'
    # resolution parameter
    $content = $content -replace '\(([\w]+),\s*resolution\)\s*=>', '($1, _resolution) =>'
    # value parameters in specific contexts
    $content = $content -replace 'setFieldValue\(([\w]+),\s*value\)\s*=>\s*\{[^\}]*\}', {
        param($match)
        if ($match.Value -notmatch '\bvalue\b[^)]') {
            $match.Value -replace '\bvalue\b', '_value'
        } else {
            $match.Value
        }
    }

    # Fix 5: Prefix unused variables
    $content = $content -replace "const \[([^\]]+), set([^\]]+)\] = useState", {
        param($match)
        $varName = $match.Groups[1].Value.Trim()
        $setterName = "set" + $match.Groups[2].Value.Trim()
        # Common unused state variables
        if ($varName -match '^(networkStatus|uploadSpeed|loading|currentWatchlist|currentUserId|sessionsData)$') {
            "const [_$varName, $setterName] = useState"
        } else {
            $match.Value
        }
    }

    # Fix 6: Prefix unused imports
    $content = $content -replace "import \{([^}]*TouchableOpacity[^}]*)\}", {
        param($match)
        $imports = $match.Groups[1].Value
        if ($content -notmatch '<TouchableOpacity' -and $content -notmatch 'TouchableOpacity\s*\(') {
            $imports -replace '\bTouchableOpacity\b', '_TouchableOpacity'
            "import {$imports}"
        } else {
            $match.Value
        }
    }

    # Fix 7: Remove unused imports entirely
    $content = $content -replace ",\s*Divider\s*,", ", "
    $content = $content -replace ",\s*Switch\s*,", ", "
    $content = $content -replace "import \{[^}]*\bDivider\b[^}]*\} from", {
        param($match)
        $imports = $match.Value
        if ($content -notmatch '<Divider' -and $content -notmatch 'Divider\s*\(') {
            $imports -replace ',\s*Divider', '' -replace 'Divider,\s*', ''
        } else {
            $match.Value
        }
    }

    # Fix 8: Prefix unused type imports
    $content = $content -replace "import type \{([^}]*MainTabParamList[^}]*)\}", {
        param($match)
        if ($content -notmatch '\bMainTabParamList\b[^}]*>') {
            ($match.Value -replace 'MainTabParamList', '_MainTabParamList')
        } else {
            $match.Value
        }
    }

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $fixedCount++
        Write-Host "Fixed: $fileName"
    }
}

Write-Host "`nTotal files fixed: $fixedCount"
