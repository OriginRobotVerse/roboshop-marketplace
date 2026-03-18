// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title  OriginEscrow
/// @notice Escrow contract for the Origin bounty board.
///         Manufacturers post USDC bounties. Developers submit skills.
///         Either the manufacturer or Origin (owner) can approve a submission,
///         releasing funds to the winning dev minus a platform fee.
///         If unresolved, the manufacturer can reclaim funds after a timeout.
contract OriginEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Basis points denominator (100.00%)
    uint256 public constant BPS = 10_000;

    /// @dev $1,000 USDC — threshold that determines which fee tier applies.
    ///      USDC has 6 decimals: 1_000 * 1e6 = 1_000_000_000
    uint256 public constant FEE_THRESHOLD = 1_000 * 1e6;

    /// @dev 15% fee for bounties under $1,000
    uint256 public constant FEE_BELOW_THRESHOLD_BPS = 1_500;

    /// @dev 10% fee for bounties at or above $1,000
    uint256 public constant FEE_ABOVE_THRESHOLD_BPS = 1_000;

    /// @dev Minimum time a manufacturer must wait before claiming a refund
    uint256 public constant MIN_TIMEOUT = 7 days;

    /// @dev Maximum timeout — prevents manufacturers locking funds indefinitely
    uint256 public constant MAX_TIMEOUT = 90 days;

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice USDC token on Base
    IERC20 public immutable usdc;

    /// @notice Address that receives platform fees on every approved bounty
    address public feeRecipient;

    /// @notice Monotonically increasing bounty counter
    uint256 public bountyCount;

    enum BountyStatus {
        Open,      // accepting submissions, can be refunded after timeout
        Completed, // a submission was approved, funds disbursed
        Refunded   // manufacturer reclaimed funds after timeout
    }

    struct Bounty {
        address manufacturer;  // who posted and funded the bounty
        uint256 amount;        // locked USDC amount (6 decimals)
        uint256 refundAfter;   // timestamp after which manufacturer can refund
        BountyStatus status;
        uint256 submissionCount;
        string metadataUri;    // IPFS URI — bounty spec, device requirements, etc.
    }

    struct Submission {
        address dev;       // who submitted
        string skillUri;   // IPFS URI — skill code, README, demo video, etc.
        bool exists;       // used to distinguish a real submission from a zero-value mapping read
    }

    /// @notice bountyId => Bounty
    mapping(uint256 => Bounty) public bounties;

    /// @notice bountyId => submissionId => Submission
    mapping(uint256 => mapping(uint256 => Submission)) public submissions;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event BountyPosted(
        uint256 indexed bountyId,
        address indexed manufacturer,
        uint256 amount,
        uint256 refundAfter,
        string metadataUri
    );

    event SubmissionMade(
        uint256 indexed bountyId,
        uint256 indexed submissionId,
        address indexed dev,
        string skillUri
    );

    event BountyApproved(
        uint256 indexed bountyId,
        uint256 indexed submissionId,
        address indexed dev,
        uint256 devAmount,
        uint256 feeAmount,
        address approvedBy
    );

    event BountyRefunded(
        uint256 indexed bountyId,
        address indexed manufacturer,
        uint256 amount
    );

    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error InvalidTimeout();
    error BountyNotOpen();
    error NotAuthorized();
    error SubmissionNotFound();
    error TimeoutNotReached();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /// @param _usdc         USDC contract address on Base
    /// @param _feeRecipient Origin treasury address that receives platform fees
    /// @param _owner        Origin admin address (can approve/reject any bounty)
    constructor(address _usdc, address _feeRecipient, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _feeRecipient == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core — Manufacturer
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Post a new bounty and lock USDC into the contract.
    /// @param amount          USDC amount to lock (must be > 0, 6 decimals)
    /// @param timeoutDuration Seconds until the manufacturer can claim a refund
    ///                        (must be between MIN_TIMEOUT and MAX_TIMEOUT)
    /// @param metadataUri     IPFS URI pointing to the bounty specification
    /// @return bountyId       The ID of the newly created bounty
    function postBounty(
        uint256 amount,
        uint256 timeoutDuration,
        string calldata metadataUri
    ) external nonReentrant returns (uint256 bountyId) {
        if (amount == 0) revert ZeroAmount();
        if (timeoutDuration < MIN_TIMEOUT || timeoutDuration > MAX_TIMEOUT) {
            revert InvalidTimeout();
        }

        bountyId = bountyCount++;

        bounties[bountyId] = Bounty({
            manufacturer: msg.sender,
            amount: amount,
            refundAfter: block.timestamp + timeoutDuration,
            status: BountyStatus.Open,
            submissionCount: 0,
            metadataUri: metadataUri
        });

        // Pull USDC from manufacturer — requires prior approval of this contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit BountyPosted(bountyId, msg.sender, amount, block.timestamp + timeoutDuration, metadataUri);
    }

    /// @notice Approve a specific submission, releasing funds to the dev.
    ///         Can be called by the manufacturer or the Origin admin (owner).
    /// @param bountyId     ID of the bounty
    /// @param submissionId ID of the winning submission
    function approve(uint256 bountyId, uint256 submissionId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];

        if (bounty.status != BountyStatus.Open) revert BountyNotOpen();
        if (msg.sender != bounty.manufacturer && msg.sender != owner()) revert NotAuthorized();

        Submission storage sub = submissions[bountyId][submissionId];
        if (!sub.exists) revert SubmissionNotFound();

        // Mark completed before any transfers (checks-effects-interactions)
        bounty.status = BountyStatus.Completed;

        uint256 fee = _calculateFee(bounty.amount);
        uint256 devAmount = bounty.amount - fee;

        usdc.safeTransfer(sub.dev, devAmount);
        if (fee > 0) usdc.safeTransfer(feeRecipient, fee);

        emit BountyApproved(bountyId, submissionId, sub.dev, devAmount, fee, msg.sender);
    }

    /// @notice Refund the bounty to the manufacturer after the timeout has elapsed.
    ///         Only the manufacturer can call this.
    /// @param bountyId ID of the bounty to refund
    function refund(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];

        if (bounty.status != BountyStatus.Open) revert BountyNotOpen();
        if (msg.sender != bounty.manufacturer) revert NotAuthorized();
        if (block.timestamp < bounty.refundAfter) revert TimeoutNotReached();

        // Mark refunded before transfer
        bounty.status = BountyStatus.Refunded;

        usdc.safeTransfer(bounty.manufacturer, bounty.amount);

        emit BountyRefunded(bountyId, bounty.manufacturer, bounty.amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core — Developer
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Submit a skill against an open bounty.
    ///         Multiple devs can submit. Manufacturer picks the winner via approve().
    /// @param bountyId  ID of the bounty to submit against
    /// @param skillUri  IPFS URI pointing to the submitted skill
    /// @return submissionId The ID of this submission within the bounty
    function submit(
        uint256 bountyId,
        string calldata skillUri
    ) external nonReentrant returns (uint256 submissionId) {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != BountyStatus.Open) revert BountyNotOpen();

        submissionId = bounty.submissionCount++;

        submissions[bountyId][submissionId] = Submission({
            dev: msg.sender,
            skillUri: skillUri,
            exists: true
        });

        emit SubmissionMade(bountyId, submissionId, msg.sender, skillUri);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Update the address that receives platform fees.
    ///         Only callable by Origin (owner).
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    function getSubmission(
        uint256 bountyId,
        uint256 submissionId
    ) external view returns (Submission memory) {
        return submissions[bountyId][submissionId];
    }

    /// @notice Preview how much a dev would receive and what the fee would be
    ///         for a given bounty amount — useful for frontend display.
    function previewSplit(uint256 amount) external pure returns (uint256 devAmount, uint256 feeAmount) {
        feeAmount = _calculateFee(amount);
        devAmount = amount - feeAmount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev 15% for amounts below $1,000 USDC, 10% at or above $1,000 USDC
    function _calculateFee(uint256 amount) internal pure returns (uint256) {
        uint256 feeBps = amount >= FEE_THRESHOLD
            ? FEE_ABOVE_THRESHOLD_BPS
            : FEE_BELOW_THRESHOLD_BPS;
        return (amount * feeBps) / BPS;
    }
}
