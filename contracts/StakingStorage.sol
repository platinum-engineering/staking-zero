// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

contract StakingProxyStorage {
    address public admin;
    address public pendingAdmin;
    address public implementation;
}

contract StakingStorageV1 is StakingProxyStorage {
    address public token;
}