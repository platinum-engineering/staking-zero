// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WhiteList is Ownable {
    mapping (address => bool) public isWhiteListed;

    event AddedWhiteList(address _user);

    event RemovedWhiteList(address _user);

    function addWhiteList(address _user) public onlyOwner {
        isWhiteListed[_user] = true;

        emit AddedWhiteList(_user);
    }

    function removeWhiteList(address _user) public onlyOwner {
        isWhiteListed[_user] = false;

        emit RemovedWhiteList(_user);
    }

    function getWhiteListStatus(address _user) external view returns (bool) {
        return isWhiteListed[_user];
    }
}

