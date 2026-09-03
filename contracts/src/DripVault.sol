// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title DripVault - Stream Coinbase B20 Tokenized Stocks per second
/// @notice Minimal linear streaming vault for B20 tokens (AAPLc/NVDAc/METAc/GOOGLc) on Base
/// @dev Designed as fallback / wrapper if Sablier V2 not available for B20 multiplier tokens.
///      Stores streams as linear unlocks: amount * elapsed / duration. Recipient can withdraw vested.
///      Supports claim-links (hashed email) for recipients without wallet yet.
///      B20 dividends are handled via multiplier at token level - vault just holds underlying B20, no rebasing logic needed.
contract DripVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Stream {
        address sender;
        address recipient; // 0 if claimable via hash
        address token; // B20 address
        uint256 totalAmount;
        uint256 withdrawn;
        uint256 start;
        uint256 end; // start + duration
        bool canceled;
        bytes32 claimHash; // keccak256(email) or claim code, 0 if direct
    }

    uint256 public nextStreamId;
    mapping(uint256 => Stream) public streams;
    mapping(bytes32 => uint256) public claimHashToStreamId; // for lookup

    event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, address token, uint256 amount, uint256 duration, bytes32 claimHash);
    event Withdrawn(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event Canceled(uint256 indexed streamId, uint256 refunded);
    event Claimed(uint256 indexed streamId, address indexed newRecipient, bytes32 claimHash);

    error ZeroAddress();
    error ZeroAmount();
    error ZeroDuration();
    error NotRecipient();
    error NotSender();
    error StreamCanceled();
    error NothingToWithdraw();
    error AlreadyClaimed();
    error InvalidClaim();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Create a direct stream to a wallet
    function createStream(address recipient, address token, uint256 amount, uint256 duration) external nonReentrant returns (uint256 streamId) {
        if (recipient == address(0)) revert ZeroAddress();
        return _createStream(recipient, token, amount, duration, bytes32(0));
    }

    /// @notice Create a claimable stream for email/wallet-less recipient (recipient = 0, claimHash = keccak256(email or code))
    function createClaimableStream(address token, uint256 amount, uint256 duration, bytes32 claimHash) external nonReentrant returns (uint256 streamId) {
        if (claimHash == bytes32(0)) revert InvalidClaim();
        return _createStream(address(0), token, amount, duration, claimHash);
    }

    function _createStream(address recipient, address token, uint256 amount, uint256 duration, bytes32 claimHash) internal returns (uint256 streamId) {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (duration == 0) revert ZeroDuration();
        if (claimHash != bytes32(0) && claimHashToStreamId[claimHash] != 0) revert AlreadyClaimed();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        streamId = nextStreamId++;
        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            totalAmount: amount,
            withdrawn: 0,
            start: block.timestamp,
            end: block.timestamp + duration,
            canceled: false,
            claimHash: claimHash
        });

        if (claimHash != bytes32(0)) {
            claimHashToStreamId[claimHash] = streamId + 1; // +1 to avoid 0 ambiguity
        }

        emit StreamCreated(streamId, msg.sender, recipient, token, amount, duration, claimHash);
    }

    /// @notice Claim a claimable stream with preimage (e.g., email -> keccak)
    function claim(uint256 streamId, bytes calldata preimage) external {
        Stream storage s = streams[streamId];
        if (s.claimHash == bytes32(0)) revert InvalidClaim();
        if (s.recipient != address(0)) revert AlreadyClaimed();
        if (keccak256(preimage) != s.claimHash) revert InvalidClaim();
        s.recipient = msg.sender;
        emit Claimed(streamId, msg.sender, s.claimHash);
    }

    /// @notice View: total vested amount at current time
    function vested(uint256 streamId) public view returns (uint256) {
        Stream memory s = streams[streamId];
        if (block.timestamp < s.start) return 0;
        if (block.timestamp >= s.end) return s.totalAmount;
        uint256 elapsed = block.timestamp - s.start;
        uint256 duration = s.end - s.start;
        return (s.totalAmount * elapsed) / duration;
    }

    function withdrawable(uint256 streamId) public view returns (uint256) {
        uint256 v = vested(streamId);
        Stream memory s = streams[streamId];
        if (v <= s.withdrawn) return 0;
        return v - s.withdrawn;
    }

    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (s.recipient == address(0)) revert NotRecipient(); // must claim first
        if (msg.sender != s.recipient) revert NotRecipient();
        uint256 amount = withdrawable(streamId);
        if (amount == 0) revert NothingToWithdraw();
        s.withdrawn += amount;
        IERC20(s.token).safeTransfer(s.recipient, amount);
        emit Withdrawn(streamId, s.recipient, amount);
    }

    /// @notice Sender can cancel, refunds unvested to sender, vested stays withdrawable by recipient
    function cancel(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (msg.sender != s.sender) revert NotSender();
        if (s.canceled) revert StreamCanceled();
        // compute vested before marking canceled
        uint256 duration = s.end - s.start;
        uint256 vestedAmt;
        if (block.timestamp < s.start) vestedAmt = 0;
        else if (block.timestamp >= s.end) vestedAmt = s.totalAmount;
        else {
            uint256 elapsed = block.timestamp - s.start;
            vestedAmt = (s.totalAmount * elapsed) / duration;
        }
        uint256 refund = s.totalAmount - vestedAmt;
        // Freeze totalAmount to vestedAmt so vested() stops growing
        s.totalAmount = vestedAmt;
        s.end = block.timestamp; // freeze
        s.canceled = true;
        if (refund > 0) {
            IERC20(s.token).safeTransfer(s.sender, refund);
        }
        emit Canceled(streamId, refund);
    }

    /// @notice Batch create for payroll (same token/amount/duration to multiple recipients)
    function batchCreate(address[] calldata recipients, address token, uint256 amountEach, uint256 duration) external nonReentrant returns (uint256[] memory ids) {
        ids = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            // transfer individually to avoid double transferFrom complexity - caller must approve total
            IERC20(token).safeTransferFrom(msg.sender, address(this), amountEach);
            uint256 streamId = nextStreamId++;
            streams[streamId] = Stream({
                sender: msg.sender,
                recipient: recipients[i],
                token: token,
                totalAmount: amountEach,
                withdrawn: 0,
                start: block.timestamp,
                end: block.timestamp + duration,
                canceled: false,
                claimHash: bytes32(0)
            });
            emit StreamCreated(streamId, msg.sender, recipients[i], token, amountEach, duration, bytes32(0));
            ids[i] = streamId;
        }
    }
}
