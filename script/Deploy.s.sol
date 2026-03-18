// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OriginEscrow} from "../src/OriginEscrow.sol";

/// @notice Deploy OriginEscrow to Base Sepolia or Base Mainnet.
///
/// Usage — testnet:
///   forge script script/Deploy.s.sol \
///     --rpc-url base_sepolia \
///     --broadcast \
///     --verify \
///     -vvvv
///
/// Usage — mainnet:
///   forge script script/Deploy.s.sol \
///     --rpc-url base_mainnet \
///     --broadcast \
///     --verify \
///     -vvvv
///
/// Required env vars:
///   PRIVATE_KEY         — deployer private key
///   ORIGIN_ADMIN        — Origin multisig / admin address (becomes owner)
///   FEE_RECIPIENT       — Origin treasury address
///   BASESCAN_API_KEY    — for contract verification
contract Deploy is Script {
    // ── Base Sepolia ──────────────────────────────────────────────────────────
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // ── Base Mainnet ──────────────────────────────────────────────────────────
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address originAdmin = vm.envAddress("ORIGIN_ADMIN");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        // Select USDC address based on chain
        address usdc;
        if (block.chainid == 84532) {
            usdc = USDC_BASE_SEPOLIA;
            console2.log("Deploying to Base Sepolia");
        } else if (block.chainid == 8453) {
            usdc = USDC_BASE_MAINNET;
            console2.log("Deploying to Base Mainnet");
        } else {
            revert("Unsupported chain — use base_sepolia or base_mainnet");
        }

        console2.log("  USDC:         ", usdc);
        console2.log("  Origin admin: ", originAdmin);
        console2.log("  Fee recipient:", feeRecipient);

        vm.startBroadcast(deployerKey);

        OriginEscrow escrow = new OriginEscrow(usdc, feeRecipient, originAdmin);

        vm.stopBroadcast();

        console2.log("\nOriginEscrow deployed at:", address(escrow));
        console2.log("  owner()      :", escrow.owner());
        console2.log("  feeRecipient :", escrow.feeRecipient());
        console2.log("  usdc         :", address(escrow.usdc()));
        console2.log("  FEE_THRESHOLD:", escrow.FEE_THRESHOLD());
    }
}
