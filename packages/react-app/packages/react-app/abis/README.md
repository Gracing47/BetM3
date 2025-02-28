# BetM3 - No-Loss-Betting DApp

## Einführung

BetM3 ist eine dezentrale Anwendung (DApp) auf der Celo-Blockchain, die ein neuartiges Wettkonzept implementiert: No-Loss-Betting. 

Im Gegensatz zu traditionellen Wettplattformen, bei denen man sein eingesetztes Kapital verlieren kann, ermöglicht BetM3 Wetten ohne Verlustrisiko für das Grundkapital. Dies wird durch die Nutzung von DeFi-Mechanismen erreicht, bei denen die Einsätze in Yield-Farming-Protokolle investiert werden und die generierten Erträge als Belohnungen für die Gewinner dienen.

## Smart Contracts und ABIs

Dieser Ordner enthält die Application Binary Interfaces (ABIs) unserer Smart Contracts. Die ABIs sind essenziell für die Interaktion zwischen der Frontend-Anwendung und den auf der Blockchain deployten Smart Contracts.

### NoLossBet

Der Hauptcontract unserer Plattform, der die Wetten verwaltet.

**Hauptfunktionen:**
- `createBet`: Erstellt eine neue Wette mit festgelegtem Einsatz und Bedingungen
- `acceptBet`: Erlaubt einem anderen Nutzer, eine offene Wette anzunehmen
- `submitOutcome`: Übermittelt das Ergebnis einer Wette
- `resolveBet`: Schließt eine Wette ab und verteilt die Belohnungen
- `resolveDispute`: Löst Streitigkeiten über das Wettergebnis

### MockCELO

Ein ERC20-Token, der als Ersatz für den nativen CELO-Token in Testumgebungen dient.

**Hauptfunktionen:**
- `mint`: Erstellt neue Token (nur für den Contract-Besitzer)
- `balanceOf`: Zeigt den Token-Bestand einer Adresse an
- `transfer`: Überträgt Token an eine andere Adresse
- `approve`: Genehmigt einem anderen Contract, Token im Namen des Besitzers zu verwenden
- `isValidator` & `registerValidator`: Simuliert die Validator-Funktionalität von CELO

### BetM3Token

Der Governance- und Utility-Token des BetM3-Ökosystems.

**Hauptfunktionen:**
- Standard ERC20-Funktionen (`transfer`, `approve`, etc.)
- Governance-Funktionen für zukünftige DAO-Integration

### cUSDToken

Ein Mock des Celo Dollar (cUSD) Stablecoins für Testzwecke.

**Hauptfunktionen:**
- Standard ERC20-Funktionen (`transfer`, `balanceOf`, etc.)
- `mint`: Erstellt neue Token für Testzwecke

### UniswapPoolMock

Simuliert einen Uniswap-ähnlichen Liquiditätspool für Tests.

**Hauptfunktionen:**
- `addLiquidity`: Fügt Liquidität zum Pool hinzu
- `removeLiquidity`: Entfernt Liquidität aus dem Pool
- `swapExactTokensForTokens`: Tauscht einen Token gegen einen anderen

### LPToken

Der Liquiditätspool-Token, der für die Bereitstellung von Liquidität vergeben wird.

**Hauptfunktionen:**
- Standard ERC20-Funktionen
- Spezielle Funktionen für die Verwaltung von Liquiditätsanteilen

## Integration mit der Frontend-Anwendung

Die Frontend-Anwendung verwendet diese ABIs, um mit den Smart Contracts zu interagieren. Die Hauptinteraktionen erfolgen über den Web3-Context, der eine nahtlose Verbindung zwischen der Benutzeroberfläche und der Blockchain ermöglicht.

Um die DApp zu verwenden, benötigen Nutzer:
1. Eine kompatible Wallet (z.B. MetaMask)
2. CELO-Token für Transaktionsgebühren und Wetten
3. Eine Verbindung zum Celo-Netzwerk (Mainnet, Testnet oder lokales Netzwerk)

## Entwicklung und Tests

Für Entwickler und Tester bietet die DApp mehrere Umgebungsoptionen:
- Lokales Hardhat-Netzwerk für schnelle Entwicklung und Tests
- Celo Alfajores Testnet für realistischere Tests
- Celo Mainnet für die Produktionsversion

Die Mock-Contracts, insbesondere MockCELO, ermöglichen das Testen ohne echte Token ausgeben zu müssen. 