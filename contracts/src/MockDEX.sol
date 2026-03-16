pragma solidity 0.8.28;

import "./MockERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MockDEX
 * @notice Uniswap V2 style constant-product AMM for the Intent Solver Network.
 */
contract MockDEX is ReentrancyGuard {
    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
    }

    mapping(bytes32 => Pool) public pools;

    event LiquidityAdded(
        address indexed token0,
        address indexed token1,
        uint256 amount0,
        uint256 amount1
    );
    event Swapped(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    function _poolKey(
        address tokenA,
        address tokenB
    ) internal pure returns (bytes32) {
        (address t0, address t1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        return keccak256(abi.encodePacked(t0, t1));
    }

    /**
     * @notice Add liquidity to a pool.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant {
        require(tokenA != tokenB, "DEX: identical tokens");
        require(amountA > 0 && amountB > 0, "DEX: zero amount");

        bytes32 key = _poolKey(tokenA, tokenB);
        Pool storage pool = pools[key];

        if (pool.token0 == address(0)) {
            (address t0, address t1) = tokenA < tokenB
                ? (tokenA, tokenB)
                : (tokenB, tokenA);
            pool.token0 = t0;
            pool.token1 = t1;
        }

        // Transfer tokens in (Uses the MockERC20 in the same directory)
        MockERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        MockERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        if (tokenA == pool.token0) {
            pool.reserve0 += amountA;
            pool.reserve1 += amountB;
        } else {
            pool.reserve0 += amountB;
            pool.reserve1 += amountA;
        }

        emit LiquidityAdded(pool.token0, pool.token1, amountA, amountB);
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        bytes32 key = _poolKey(tokenIn, tokenOut);
        Pool storage pool = pools[key];
        require(pool.token0 != address(0), "DEX: pool not found");

        (uint256 reserveIn, uint256 reserveOut) = tokenIn == pool.token0
            ? (pool.reserve0, pool.reserve1)
            : (pool.reserve1, pool.reserve0);

        require(reserveIn > 0 && reserveOut > 0, "DEX: no liquidity");

        uint256 amountInWithFee = amountIn * 997;
        amountOut =
            (amountInWithFee * reserveOut) /
            (reserveIn * 1000 + amountInWithFee);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "DEX: zero input");
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "DEX: slippage exceeded");

        bytes32 key = _poolKey(tokenIn, tokenOut);
        Pool storage pool = pools[key];

        MockERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(tokenOut).transfer(msg.sender, amountOut);

        if (tokenIn == pool.token0) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }

        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
