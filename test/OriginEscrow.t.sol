// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {OriginEscrow} from "../src/OriginEscrow.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract OriginEscrowTest is Test {
    // ─────────────────────────────────────────────────────────────────────────
    // Fixtures
    // ─────────────────────────────────────────────────────────────────────────

    OriginEscrow public escrow;
    MockUSDC public usdc;

    address public origin = makeAddr("origin");
    address public feeRecipient = makeAddr("feeRecipient");
    address public manufacturer = makeAddr("manufacturer");
    address public devA = makeAddr("devA");
    address public devB = makeAddr("devB");
    address public stranger = makeAddr("stranger");

    // Convenience amounts (USDC has 6 decimals)
    uint256 constant HUNDRED = 100 * 1e6;      // $100  — below threshold, 15% fee
    uint256 constant THOUSAND = 1_000 * 1e6;   // $1000 — at threshold, 10% fee
    uint256 constant FIVE_K = 5_000 * 1e6;     // $5000 — above threshold, 10% fee

    uint256 constant THIRTY_DAYS = 30 days;

    string constant META_URI = "ipfs://QmBountySpec";
    string constant SKILL_URI_A = "ipfs://QmSkillA";
    string constant SKILL_URI_B = "ipfs://QmSkillB";

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new OriginEscrow(address(usdc), feeRecipient, origin);

        // Fund manufacturer with plenty of USDC
        usdc.mint(manufacturer, 100_000 * 1e6);
        vm.prank(manufacturer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _postBounty(uint256 amount) internal returns (uint256 bountyId) {
        vm.prank(manufacturer);
        bountyId = escrow.postBounty(amount, THIRTY_DAYS, META_URI);
    }

    function _submit(uint256 bountyId, address dev, string memory uri)
        internal
        returns (uint256 submissionId)
    {
        vm.prank(dev);
        submissionId = escrow.submit(bountyId, uri);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    function test_constructor_setsState() public view {
        assertEq(address(escrow.usdc()), address(usdc));
        assertEq(escrow.feeRecipient(), feeRecipient);
        assertEq(escrow.owner(), origin);
        assertEq(escrow.bountyCount(), 0);
    }

    function test_constructor_revertsOnZeroAddresses() public {
        vm.expectRevert(OriginEscrow.ZeroAddress.selector);
        new OriginEscrow(address(0), feeRecipient, origin);

        vm.expectRevert(OriginEscrow.ZeroAddress.selector);
        new OriginEscrow(address(usdc), address(0), origin);

        vm.expectRevert(OriginEscrow.ZeroAddress.selector);
        new OriginEscrow(address(usdc), feeRecipient, address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // postBounty
    // ─────────────────────────────────────────────────────────────────────────

    function test_postBounty_happy() public {
        uint256 manufacturerBefore = usdc.balanceOf(manufacturer);

        vm.expectEmit(true, true, false, true);
        emit OriginEscrow.BountyPosted(0, manufacturer, HUNDRED, block.timestamp + THIRTY_DAYS, META_URI);

        uint256 id = _postBounty(HUNDRED);

        assertEq(id, 0);
        assertEq(escrow.bountyCount(), 1);
        assertEq(usdc.balanceOf(address(escrow)), HUNDRED);
        assertEq(usdc.balanceOf(manufacturer), manufacturerBefore - HUNDRED);

        OriginEscrow.Bounty memory b = escrow.getBounty(0);
        assertEq(b.manufacturer, manufacturer);
        assertEq(b.amount, HUNDRED);
        assertEq(b.refundAfter, block.timestamp + THIRTY_DAYS);
        assertEq(uint8(b.status), uint8(OriginEscrow.BountyStatus.Open));
        assertEq(b.submissionCount, 0);
        assertEq(b.metadataUri, META_URI);
    }

    function test_postBounty_incrementsId() public {
        assertEq(_postBounty(HUNDRED), 0);
        assertEq(_postBounty(HUNDRED), 1);
        assertEq(_postBounty(HUNDRED), 2);
        assertEq(escrow.bountyCount(), 3);
    }

    function test_postBounty_revertsZeroAmount() public {
        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.ZeroAmount.selector);
        escrow.postBounty(0, THIRTY_DAYS, META_URI);
    }

    function test_postBounty_revertsTimeoutTooShort() public {
        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.InvalidTimeout.selector);
        escrow.postBounty(HUNDRED, 6 days, META_URI);
    }

    function test_postBounty_revertsTimeoutTooLong() public {
        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.InvalidTimeout.selector);
        escrow.postBounty(HUNDRED, 91 days, META_URI);
    }

    function test_postBounty_acceptsBoundaryTimeouts() public {
        vm.prank(manufacturer);
        escrow.postBounty(HUNDRED, 7 days, META_URI);   // MIN exactly

        vm.prank(manufacturer);
        escrow.postBounty(HUNDRED, 90 days, META_URI);  // MAX exactly
    }

    function testFuzz_postBounty_anyValidAmount(uint256 amount) public {
        amount = bound(amount, 1, 50_000 * 1e6);
        usdc.mint(manufacturer, amount);
        vm.prank(manufacturer);
        escrow.postBounty(amount, THIRTY_DAYS, META_URI);
        assertEq(usdc.balanceOf(address(escrow)), amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // submit
    // ─────────────────────────────────────────────────────────────────────────

    function test_submit_happy() public {
        uint256 bountyId = _postBounty(HUNDRED);

        vm.expectEmit(true, true, true, true);
        emit OriginEscrow.SubmissionMade(bountyId, 0, devA, SKILL_URI_A);

        uint256 subId = _submit(bountyId, devA, SKILL_URI_A);

        assertEq(subId, 0);
        OriginEscrow.Submission memory sub = escrow.getSubmission(bountyId, 0);
        assertEq(sub.dev, devA);
        assertEq(sub.skillUri, SKILL_URI_A);
        assertTrue(sub.exists);

        OriginEscrow.Bounty memory b = escrow.getBounty(bountyId);
        assertEq(b.submissionCount, 1);
    }

    function test_submit_multipleDevs() public {
        uint256 bountyId = _postBounty(HUNDRED);

        uint256 subA = _submit(bountyId, devA, SKILL_URI_A);
        uint256 subB = _submit(bountyId, devB, SKILL_URI_B);

        assertEq(subA, 0);
        assertEq(subB, 1);
        assertEq(escrow.getBounty(bountyId).submissionCount, 2);
        assertEq(escrow.getSubmission(bountyId, 0).dev, devA);
        assertEq(escrow.getSubmission(bountyId, 1).dev, devB);
    }

    function test_submit_sameDevCanSubmitTwice() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);
        _submit(bountyId, devA, SKILL_URI_B); // v2 revision
        assertEq(escrow.getBounty(bountyId).submissionCount, 2);
    }

    function test_submit_revertsOnCompletedBounty() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.prank(manufacturer);
        escrow.approve(bountyId, 0);

        vm.prank(devB);
        vm.expectRevert(OriginEscrow.BountyNotOpen.selector);
        escrow.submit(bountyId, SKILL_URI_B);
    }

    function test_submit_revertsOnRefundedBounty() public {
        uint256 bountyId = _postBounty(HUNDRED);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);
        vm.prank(manufacturer);
        escrow.refund(bountyId);

        vm.prank(devA);
        vm.expectRevert(OriginEscrow.BountyNotOpen.selector);
        escrow.submit(bountyId, SKILL_URI_A);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // approve — by manufacturer
    // ─────────────────────────────────────────────────────────────────────────

    function test_approve_byManufacturer_belowThreshold() public {
        // $100 bounty → 15% fee = $15, dev gets $85
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        uint256 devBefore = usdc.balanceOf(devA);
        uint256 feeBefore = usdc.balanceOf(feeRecipient);

        vm.expectEmit(true, true, true, true);
        emit OriginEscrow.BountyApproved(bountyId, 0, devA, 85 * 1e6, 15 * 1e6, manufacturer);

        vm.prank(manufacturer);
        escrow.approve(bountyId, 0);

        assertEq(usdc.balanceOf(devA), devBefore + 85 * 1e6);
        assertEq(usdc.balanceOf(feeRecipient), feeBefore + 15 * 1e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(escrow.getBounty(bountyId).status), uint8(OriginEscrow.BountyStatus.Completed));
    }

    function test_approve_byManufacturer_atThreshold() public {
        // $1000 bounty → 10% fee = $100, dev gets $900
        uint256 bountyId = _postBounty(THOUSAND);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.prank(manufacturer);
        escrow.approve(bountyId, 0);

        assertEq(usdc.balanceOf(devA), 900 * 1e6);
        assertEq(usdc.balanceOf(feeRecipient), 100 * 1e6);
    }

    function test_approve_byManufacturer_aboveThreshold() public {
        // $5000 bounty → 10% fee = $500, dev gets $4500
        uint256 bountyId = _postBounty(FIVE_K);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.prank(manufacturer);
        escrow.approve(bountyId, 0);

        assertEq(usdc.balanceOf(devA), 4_500 * 1e6);
        assertEq(usdc.balanceOf(feeRecipient), 500 * 1e6);
    }

    function test_approve_manufacturerPicksSecondSubmission() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A); // subId 0
        _submit(bountyId, devB, SKILL_URI_B); // subId 1 — manufacturer prefers this one

        vm.prank(manufacturer);
        escrow.approve(bountyId, 1); // picks devB

        assertEq(usdc.balanceOf(devB), 85 * 1e6);
        assertEq(usdc.balanceOf(devA), 0); // devA gets nothing
    }

    // ─────────────────────────────────────────────────────────────────────────
    // approve — by Origin (owner override)
    // ─────────────────────────────────────────────────────────────────────────

    function test_approve_byOrigin_succeeds() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.expectEmit(true, true, true, true);
        emit OriginEscrow.BountyApproved(bountyId, 0, devA, 85 * 1e6, 15 * 1e6, origin);

        vm.prank(origin);
        escrow.approve(bountyId, 0);

        assertEq(usdc.balanceOf(devA), 85 * 1e6);
        assertEq(uint8(escrow.getBounty(bountyId).status), uint8(OriginEscrow.BountyStatus.Completed));
    }

    function test_approve_revertsForStranger() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.prank(stranger);
        vm.expectRevert(OriginEscrow.NotAuthorized.selector);
        escrow.approve(bountyId, 0);
    }

    function test_approve_revertsForDev() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.prank(devA);
        vm.expectRevert(OriginEscrow.NotAuthorized.selector);
        escrow.approve(bountyId, 0);
    }

    function test_approve_revertsIfSubmissionNotFound() public {
        uint256 bountyId = _postBounty(HUNDRED);
        // No submissions yet — submissionId 0 doesn't exist

        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.SubmissionNotFound.selector);
        escrow.approve(bountyId, 0);
    }

    function test_approve_revertsIfAlreadyCompleted() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);
        _submit(bountyId, devB, SKILL_URI_B);

        vm.prank(manufacturer);
        escrow.approve(bountyId, 0); // complete it

        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.BountyNotOpen.selector);
        escrow.approve(bountyId, 1); // can't approve again
    }

    function test_approve_revertsIfRefunded() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);
        vm.prank(manufacturer);
        escrow.refund(bountyId);

        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.BountyNotOpen.selector);
        escrow.approve(bountyId, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // refund
    // ─────────────────────────────────────────────────────────────────────────

    function test_refund_happy() public {
        uint256 bountyId = _postBounty(HUNDRED);
        uint256 manufacturerBefore = usdc.balanceOf(manufacturer);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);

        vm.expectEmit(true, true, false, true);
        emit OriginEscrow.BountyRefunded(bountyId, manufacturer, HUNDRED);

        vm.prank(manufacturer);
        escrow.refund(bountyId);

        assertEq(usdc.balanceOf(manufacturer), manufacturerBefore + HUNDRED);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(escrow.getBounty(bountyId).status), uint8(OriginEscrow.BountyStatus.Refunded));
    }

    function test_refund_exactlyAtTimeout() public {
        uint256 bountyId = _postBounty(HUNDRED);
        uint256 refundAfter = escrow.getBounty(bountyId).refundAfter;

        vm.warp(refundAfter); // exactly at timeout

        vm.prank(manufacturer);
        escrow.refund(bountyId); // should succeed
    }

    function test_refund_revertsBeforeTimeout() public {
        uint256 bountyId = _postBounty(HUNDRED);

        vm.warp(block.timestamp + THIRTY_DAYS - 1); // one second before

        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.TimeoutNotReached.selector);
        escrow.refund(bountyId);
    }

    function test_refund_revertsForStranger() public {
        uint256 bountyId = _postBounty(HUNDRED);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);

        vm.prank(stranger);
        vm.expectRevert(OriginEscrow.NotAuthorized.selector);
        escrow.refund(bountyId);
    }

    function test_refund_revertsForOriginAdmin() public {
        // Origin cannot force-refund — only manufacturer can
        uint256 bountyId = _postBounty(HUNDRED);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);

        vm.prank(origin);
        vm.expectRevert(OriginEscrow.NotAuthorized.selector);
        escrow.refund(bountyId);
    }

    function test_refund_revertsIfAlreadyCompleted() public {
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);

        vm.prank(manufacturer);
        escrow.approve(bountyId, 0);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);

        vm.prank(manufacturer);
        vm.expectRevert(OriginEscrow.BountyNotOpen.selector);
        escrow.refund(bountyId);
    }

    function test_refund_withPendingSubmissions() public {
        // Submissions exist but manufacturer chose to let timeout expire instead
        uint256 bountyId = _postBounty(HUNDRED);
        _submit(bountyId, devA, SKILL_URI_A);
        _submit(bountyId, devB, SKILL_URI_B);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);

        vm.prank(manufacturer);
        escrow.refund(bountyId); // still valid — no obligation to approve

        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fee calculations
    // ─────────────────────────────────────────────────────────────────────────

    function test_fee_belowThreshold_15pct() public pure {
        // $100 → $15 fee, $85 to dev
        OriginEscrow e;
        // Use previewSplit via a deployed instance
    }

    function test_previewSplit_belowThreshold() public view {
        (uint256 devAmt, uint256 feeAmt) = escrow.previewSplit(HUNDRED);
        assertEq(feeAmt, 15 * 1e6);
        assertEq(devAmt, 85 * 1e6);
    }

    function test_previewSplit_atThreshold() public view {
        (uint256 devAmt, uint256 feeAmt) = escrow.previewSplit(THOUSAND);
        assertEq(feeAmt, 100 * 1e6);
        assertEq(devAmt, 900 * 1e6);
    }

    function test_previewSplit_aboveThreshold() public view {
        (uint256 devAmt, uint256 feeAmt) = escrow.previewSplit(FIVE_K);
        assertEq(feeAmt, 500 * 1e6);
        assertEq(devAmt, 4_500 * 1e6);
    }

    function testFuzz_fee_neverExceedsAmount(uint256 amount) public view {
        amount = bound(amount, 1, 1_000_000 * 1e6);
        (uint256 devAmt, uint256 feeAmt) = escrow.previewSplit(amount);
        assertLe(feeAmt, amount);
        assertEq(devAmt + feeAmt, amount); // no dust
    }

    // ─────────────────────────────────────────────────────────────────────────
    // setFeeRecipient
    // ─────────────────────────────────────────────────────────────────────────

    function test_setFeeRecipient_byOwner() public {
        address newRecipient = makeAddr("newFeeRecipient");

        vm.expectEmit(true, true, false, false);
        emit OriginEscrow.FeeRecipientUpdated(feeRecipient, newRecipient);

        vm.prank(origin);
        escrow.setFeeRecipient(newRecipient);

        assertEq(escrow.feeRecipient(), newRecipient);
    }

    function test_setFeeRecipient_revertsForStranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        escrow.setFeeRecipient(makeAddr("x"));
    }

    function test_setFeeRecipient_revertsZeroAddress() public {
        vm.prank(origin);
        vm.expectRevert(OriginEscrow.ZeroAddress.selector);
        escrow.setFeeRecipient(address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // End-to-end scenarios
    // ─────────────────────────────────────────────────────────────────────────

    function test_e2e_fullBountyLifecycle() public {
        // 1. Manufacturer posts a $500 bounty
        uint256 bountyId = _postBounty(500 * 1e6);
        assertEq(usdc.balanceOf(address(escrow)), 500 * 1e6);

        // 2. Two devs compete
        uint256 subA = _submit(bountyId, devA, SKILL_URI_A);
        uint256 subB = _submit(bountyId, devB, SKILL_URI_B);
        assertEq(subA, 0);
        assertEq(subB, 1);

        // 3. Manufacturer picks devB
        vm.prank(manufacturer);
        escrow.approve(bountyId, subB);

        // 4. Verify: devB got 85% ($425), fee is 15% ($75)
        assertEq(usdc.balanceOf(devB), 425 * 1e6);
        assertEq(usdc.balanceOf(devA), 0);
        assertEq(usdc.balanceOf(feeRecipient), 75 * 1e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(escrow.getBounty(bountyId).status), uint8(OriginEscrow.BountyStatus.Completed));
    }

    function test_e2e_originOverridesManufacturer() public {
        // Manufacturer goes silent — Origin steps in to approve a quality submission
        uint256 bountyId = _postBounty(FIVE_K);
        _submit(bountyId, devA, SKILL_URI_A);

        // Origin approves directly
        vm.prank(origin);
        escrow.approve(bountyId, 0);

        // devA gets 90% of $5000 = $4500
        assertEq(usdc.balanceOf(devA), 4_500 * 1e6);
        assertEq(usdc.balanceOf(feeRecipient), 500 * 1e6);
    }

    function test_e2e_abandonedBountyRefunded() public {
        // No dev submits — manufacturer reclaims after timeout
        uint256 bountyId = _postBounty(HUNDRED);
        uint256 manufacturerBefore = usdc.balanceOf(manufacturer);

        vm.warp(block.timestamp + THIRTY_DAYS + 1);
        vm.prank(manufacturer);
        escrow.refund(bountyId);

        assertEq(usdc.balanceOf(manufacturer), manufacturerBefore + HUNDRED);
        assertEq(usdc.balanceOf(feeRecipient), 0); // no fee on refund
    }

    function test_e2e_multipleBountiesConcurrent() public {
        // Three bounties open simultaneously
        uint256 b0 = _postBounty(HUNDRED);
        uint256 b1 = _postBounty(THOUSAND);
        uint256 b2 = _postBounty(FIVE_K);

        _submit(b0, devA, SKILL_URI_A);
        _submit(b1, devA, SKILL_URI_A);
        _submit(b2, devB, SKILL_URI_B);

        // Approve all three in sequence
        vm.startPrank(manufacturer);
        escrow.approve(b0, 0);
        escrow.approve(b1, 0);
        escrow.approve(b2, 0);
        vm.stopPrank();

        // devA received: $85 + $900 = $985
        // devB received: $4500
        // feeRecipient: $15 + $100 + $500 = $615
        assertEq(usdc.balanceOf(devA), (85 + 900) * 1e6);
        assertEq(usdc.balanceOf(devB), 4_500 * 1e6);
        assertEq(usdc.balanceOf(feeRecipient), (15 + 100 + 500) * 1e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
