# OriginEscrow

Escrow contract for the Origin bounty board. Built with Foundry, deployed on Base.

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

