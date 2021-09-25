// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./Whitelist.sol";


contract PoolsInfo is WhiteList {
    struct PoolData {
        address factory;
        address pool;
        address stakeToken;
        address implAndTerms;
    }

    PoolData[] public pools;

    event NewPool(uint id, address indexed factory, address pool, address indexed stakeToken, address indexed implAndTerms);

    function getPoolsLength() public view returns (uint) {
        return pools.length;
    }

    function addPool(address factory_, address pool_, address stakeToken_, address implAndTerms_) public {
        require(getWhiteListStatus(msg.sender), "PoolsInfo::addPool: factory is not in whitelist");

        PoolData memory newPool;
        newPool.factory = factory_;
        newPool.pool = pool_;
        newPool.stakeToken = stakeToken_;
        newPool.implAndTerms = implAndTerms_;

        uint id = getPoolsLength();
        emit NewPool(id, factory_, pool_, stakeToken_, implAndTerms_);

        pools.push(newPool);
    }

    function getPools(uint id) public view returns (PoolData memory) {
        return pools[id];
    }

    function getAllPools() public view returns (PoolData[] memory) {
        return pools;
    }
}
