Add-Type -AssemblyName PresentationFramework
$window = New-Object System.Windows.Window
$window.Title = "Kryptid Wallet"
$window.Width = 650
$window.Height = 700

$webview = New-Object Microsoft.Web.WebView2.Wpf.WebView2
$window.Content = $webview
$window.Show()

# 1. Počkáme na bezpečné dokončení inicializace jádra
$webview.EnsureCoreWebView2Async().WaitForCompletion()

# 2. VIRTUAL MAPPING (Magický krok, který zničí CORS chyby)
# Namapujeme složku s peněženkou na bezpečnou lokální subdoménu
$webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
    "kryptid.local", 
    "C:\Projekty\kryptid-wallet", 
    [Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind]::Allow
)

# 3. Navigujeme na virtuální doménu místo rizikového file:///
$webview.CoreWebView2.Navigate("http://kryptid.local")

[System.Windows.Application]::Current.Run($window)
