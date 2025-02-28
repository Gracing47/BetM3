# BetM3 - Frontend Integration Guide

## 1. Smart Contracts Overview

### Core Contracts

- **NoLossBet**: Der Hauptvertrag für die Wettplattform, der jetzt Uniswap statt Aave verwendet.
  - Ermöglicht das Erstellen und Akzeptieren von Wetten
  - Verwaltet die Hinterlegung von CELO-Tokens in Uniswap-Pools
  - Handhabt die Auflösung von Wetten und die Verteilung von Renditen
  - Implementiert Sicherheitsmechanismen für Streitfälle und abgelaufene Wetten

- **MockCELO**: Eine Testversion des CELO-Tokens mit zusätzlichen Funktionen für Proof-of-Stake-Simulation.
  - Implementiert die ERC20-Schnittstelle
  - Bietet Funktionen zur Simulation von Staking und Validator-Registrierung

- **UniswapPoolMock**: Ein Mock für Uniswap-Pools zum Testen.
  - Simuliert das Hinzufügen und Entfernen von Liquidität
  - Kann positive Renditen und Impermanent Loss simulieren
  - Implementiert Handelsgebühren

- **BetM3Token**: Ein ERC20-Token für Belohnungen und Governance.
  - Wird an Teilnehmer von Wetten verteilt
  - Kann für zukünftige Governance-Funktionen verwendet werden

### Contract-Adressen (Lokal)

```javascript
{
  noLossBet: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  uniswapPoolMock: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  celoToken: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
  cUSDToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  lpToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  betM3Token: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
}
```

## 2. Tests

### Vorhandene Tests

- **NoLossBetUniswap.test.js**: Umfassende Tests für den NoLossBet-Vertrag mit Uniswap-Integration.
  - Testen der Wettenerstellung und -annahme
  - Testen der Wettauflösung mit detailliertem Logging
  - Edge Cases (nicht übereinstimmende Ergebnisse, Ablauf)
  - Sicherheitsprüfungen (Verhinderung doppelter Auflösung)
  - Rebalancing-Tests (Umgang mit Impermanent Loss)

- **MockCELO.test.js**: Tests für den MockCELO-Token.
  - Grundlegende ERC20-Funktionalität
  - CELO-spezifische Funktionen (Validator-Registrierung, Staking)

### Testabdeckung

Die Tests decken folgende Szenarien ab:
- Grundlegende Funktionalität
- Edge Cases und Fehlerbehandlung
- Sicherheitsaspekte
- Wirtschaftliche Szenarien (Renditen, Verluste)

## 3. Frontend-Integration

### Ziel des Projekts

BetM3 ist eine dezentrale Wettplattform auf Celo, die soziales Wetten mit Renditegeneration kombiniert. Benutzer können Wetten erstellen und beitreten, während ihre Einsätze durch Uniswap-Integration Rendite generieren.

Hauptmerkmale:
- Risikofreies Wetten: Alle Einsätze werden durch Renditegeneration erhalten
- Gewinner erhält Rendite: Gewinner verdienen Belohnungen aus generierter Rendite
- Soziales Wetten: Erstellen und Beitreten von Wetten mit Freunden
- Renditegeneration: Einsätze verdienen Rendite durch Uniswap
- Sicherheit: Auf der Celo-Blockchain mit Smart-Contract-Sicherheit gebaut

### Integration mit dem Frontend

#### 1. ABI-Dateien aktualisieren

Erstelle neue ABI-Dateien für die aktualisierten Contracts:

```typescript
// packages/react-app/abis/NoLossBetABI.ts
export const NoLossBetABI = [...]; // ABI aus artifacts/contracts/NoLossBet.sol/NoLossBet.json

// packages/react-app/abis/MockCELOABI.ts
export const MockCELOABI = [...]; // ABI aus artifacts/contracts/MockCELO.sol/MockCELO.json

// packages/react-app/abis/UniswapPoolMockABI.ts
export const UniswapPoolMockABI = [...]; // ABI aus artifacts/contracts/UniswapPoolMock.sol/UniswapPoolMock.json
```

#### 2. Web3-Kontext aktualisieren

Aktualisiere den Web3-Kontext (`useWeb3.tsx`), um die neuen Contracts zu integrieren:

```typescript
// Importiere die ABIs
import { NoLossBetABI } from '../abis/NoLossBetABI';
import { MockCELOABI } from '../abis/MockCELOABI';
import { UniswapPoolMockABI } from '../abis/UniswapPoolMockABI';

// Contract-Adressen
const CONTRACT_ADDRESSES = {
  noLossBet: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  uniswapPoolMock: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  celoToken: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
  cUSDToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  lpToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  betM3Token: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
};

// Contract-Instanzen erstellen
const noLossBetContract = new ethers.Contract(
  CONTRACT_ADDRESSES.noLossBet,
  NoLossBetABI,
  provider
);

const celoTokenContract = new ethers.Contract(
  CONTRACT_ADDRESSES.celoToken,
  MockCELOABI,
  provider
);

// Weitere Contract-Instanzen...
```

#### 3. Komponenten für Wettfunktionalität

Aktualisiere oder erstelle Komponenten für:

- **BetCreation**: Zum Erstellen neuer Wetten
  - CELO-Token-Genehmigung
  - Wettbedingungen festlegen
  - Einsatz festlegen

- **BetAcceptance**: Zum Akzeptieren von Wetten
  - Verfügbare Wetten anzeigen
  - CELO-Token-Genehmigung
  - Wette akzeptieren

- **BetResolution**: Zum Auflösen von Wetten
  - Ergebnis einreichen
  - Wette auflösen
  - Belohnungen anzeigen

- **UserDashboard**: Zum Anzeigen von Benutzerinformationen
  - CELO-Guthaben
  - BetM3-Token-Guthaben
  - Aktive und vergangene Wetten

#### 4. Workflow-Integration

1. **Verbindung herstellen**:
   - Benutzer verbindet Wallet (Metamask, Valora)
   - Frontend lädt Benutzerinformationen und Wetten

2. **Wette erstellen**:
   - Benutzer genehmigt CELO-Ausgabe
   - Benutzer erstellt Wette mit Bedingungen
   - Smart Contract erstellt Wette und überträgt Tokens

3. **Wette akzeptieren**:
   - Gegner genehmigt CELO-Ausgabe
   - Gegner akzeptiert Wette
   - Smart Contract überträgt Tokens und hinterlegt sie in Uniswap

4. **Ergebnisse einreichen**:
   - Beide Teilnehmer reichen Ergebnisse ein
   - Bei Übereinstimmung kann die Wette aufgelöst werden

5. **Wette auflösen**:
   - Smart Contract zieht Liquidität aus Uniswap zurück
   - Rendite wird basierend auf dem Ergebnis verteilt
   - BetM3-Tokens werden als zusätzliche Belohnungen verteilt

### Empfohlene nächste Schritte

1. **ABIs generieren**: Extrahiere die ABIs aus den Artifacts-Dateien
2. **Web3-Kontext aktualisieren**: Integriere die neuen Contracts
3. **Komponenten aktualisieren**: Passe die UI-Komponenten an die neuen Contracts an
4. **Testen mit lokalem Netzwerk**: Teste die Integration mit einem lokalen Hardhat-Netzwerk
5. **Deployment auf Testnet**: Deploye die Contracts auf Celo Alfajores Testnet

## 4. Deployment

### Lokales Deployment

1. Starte einen lokalen Hardhat-Node:
```bash
npx hardhat node
```

2. Deploye die Contracts:
```bash
npx hardhat run scripts/deploy-localhost.ts --network localhost
```

### Testnet Deployment (Alfajores)

1. Stelle sicher, dass die `.env`-Datei konfiguriert ist:
```
PRIVATE_KEY=dein_privater_schlüssel
```

2. Deploye die Contracts:
```bash
npx hardhat run scripts/deploy.ts --network alfajores
```

## 5. Ressourcen

- [Celo Developer Documentation](https://docs.celo.org/)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/overview)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Next.js Documentation](https://nextjs.org/docs) 