# OriginEscrow

Solidity escrow contract for the Origin bounty board. Built with Foundry, deployed on Base.

## How it works

1. **Manufacturer** calls `postBounty()` — locks USDC into the contract
2. **Developers** call `submit()` — multiple devs can submit against the same bounty
3. **Manufacturer or Origin admin** calls `approve(bountyId, submissionId)` — picks the winner and releases funds
4. If unresolved after the timeout, **manufacturer** calls `refund()` to reclaim their USDC

## Fee tiers

| Bounty amount | Platform fee | Dev receives |
|---|---|---|
| Under $1,000 | 15% | 85% |
| $1,000 and above | 10% | 90% |

Fee is calculated and distributed automatically on `approve()`. No fee is charged on `refund()`.

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts

# Copy env and fill in values
cp .env.example .env
```

## Run tests

```bash
forge test -vvv
```

## Run tests with gas report

```bash
forge test --gas-report
```

## Deploy to Base Sepolia

```bash
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvvv
```

## Deploy to Base Mainnet

```bash
forge script script/Deploy.s.sol \
  --rpc-url base_mainnet \
  --broadcast \
  --verify \
  -vvvv
```

## Contract addresses

| Network | Address |
|---|---|
| Base Sepolia | TBD |
| Base Mainnet | TBD |

## Security notes

- All state-changing functions use `ReentrancyGuard`
- Follows checks-effects-interactions: status is updated before any token transfer
- `approve()` and `refund()` both check `BountyStatus.Open` first — no double-spend possible
- Only manufacturer or Origin (owner) can approve — devs cannot self-approve
- Only manufacturer can refund — Origin cannot force-refund (manufacturer controls their own timeout)
- Use a **multisig (Safe)** as `ORIGIN_ADMIN` in production
