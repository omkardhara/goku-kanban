$env:BOARD_URL = "https://goku-kanban.vercel.app"
$env:BOARD_KEY = "Goku123"
Set-Location "C:\Users\omkar.dhareshwar\Desktop\goku-kanban"
node scripts/weekly-update.mjs --folder "D:\Claude Cowork - BMS\Outputs\weekly-summary" --no-git >> "$PSScriptRoot\sync.log" 2>&1
