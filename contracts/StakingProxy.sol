// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./StakingStorage.sol";

contract StakingProxy is StakingProxyStorage {

    event NewImplementation(address oldImplementation, address newImplementation);
    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);
    event NewAdmin(address oldAdmin, address newAdmin);

    constructor(
        address implementation_,
        address admin_,
        address token_
    ) {
        implementation = implementation_;

        emit NewImplementation(address(0), implementation_);

        delegateTo(implementation, abi.encodeWithSignature("initialize(address)", token_));

        admin = admin_;

        emit NewAdmin(address(0), admin_);
    }

    function _setImplementation(address newImplementation) external returns (bool) {
        require(msg.sender == admin, "SpaceOracleProxy::_setImplementation: admin only");

        address oldImplementation = implementation;
        implementation = newImplementation;

        emit NewImplementation(oldImplementation, newImplementation);

        return true;
    }

    function _setPendingAdmin(address newPendingAdmin) public returns (bool) {
        require(msg.sender == admin, "SpaceOracleProxy::_setPendingAdmin: admin only");

        address oldPendingAdmin = pendingAdmin;
        pendingAdmin = newPendingAdmin;

        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);

        return true;
    }

    function _acceptAdmin() public returns (bool) {
        require(msg.sender == pendingAdmin, "SpaceOracleProxy::_acceptAdmin: pendingAdmin only");

        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;

        admin = pendingAdmin;
        pendingAdmin = address(0);

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);

        return true;
    }

    function delegateTo(address callee, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returnData) = callee.delegatecall(data);
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return returnData;
    }

    function delegateAndReturn() private returns (bytes memory) {
        (bool success, ) = implementation.delegatecall(msg.data);

        assembly {
            let free_mem_ptr := mload(0x40)
            returndatacopy(free_mem_ptr, 0, returndatasize())

            switch success
            case 0 { revert(free_mem_ptr, returndatasize()) }
            default { return(free_mem_ptr, returndatasize()) }
        }
    }

    fallback() external {
    // delegate all other functions to current implementation
        delegateAndReturn();
    }
}
