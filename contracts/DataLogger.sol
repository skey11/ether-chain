// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DataLogger
/// @notice Minimal contract that writes arbitrary messages to chain via events.
/// Deploy to任意测试链（建议 Sepolia），前端通过 wagmi 直接调用 log 记录。
contract DataLogger {
    event DataLogged(
        address indexed sender,
        string memo,
        bytes32 indexed dataId,
        uint256 timestamp
    );

    function log(string calldata memo, bytes32 dataId) external {
        emit DataLogged(msg.sender, memo, dataId, block.timestamp);
    }
}
