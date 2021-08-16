# Staking-zero

## Development

### Environment
1. Copy .env.example to .env
2. Add keys to .env file.

### Deploy
```sh
npx hardhat run --network testnet scripts/deploy.js
```

### Testing
```sh
npx hardhat test
```

### Verify
```sh
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```