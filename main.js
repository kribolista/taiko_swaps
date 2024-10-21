const { ethers } = require("ethers");
const axios = require("axios");
require("dotenv").config({ path: __dirname + "/.env" });

const provider = new ethers.JsonRpcProvider("https://rpc.taiko.xyz");

const wallets = [
  {
    address: process.env.ADDRESS_1,
    privateKey: process.env.PRIVATE_KEY_1,
  },
  {
    address: process.env.ADDRESS_2,
    privateKey: process.env.PRIVATE_KEY_2,
  },
  {
    address: process.env.ADDRESS_3,
    privateKey: process.env.PRIVATE_KEY_3,
  },
  {
    address: process.env.ADDRESS_4,
    privateKey: process.env.PRIVATE_KEY_4,
  },
  {
    address: process.env.ADDRESS_5,
    privateKey: process.env.PRIVATE_KEY_5,
  },
  {
    address: process.env.ADDRESS_6,
    privateKey: process.env.PRIVATE_KEY_6,
  },
  {
    address: process.env.ADDRESS_7,
    privateKey: process.env.PRIVATE_KEY_7,
  },
];

const WETH_ADDRESS = "0xa51894664a773981c6c112c43ce576f315d5b1b6";
const WETH_ABI = [
  "function deposit() public payable",
  "function withdraw(uint wad) public",
  "function balanceOf(address owner) view returns (uint256)",
];

// Fetch Gwei and iteration count from .env
const GWEI = process.env.GWEI;
const ITERATIONS = parseInt(process.env.ITERATIONS);

const gasPrice = ethers.utils.parseUnits(GWEI, "gwei");

function getRandomPercentage(min, max) {
  return Math.random() * (max - min) + min;
}

async function getBalance(contract, address) {
  try {
    return await contract.balanceOf(address);
  } catch (error) {
    console.error(`Error getting balance: ${error.message}`);
    throw error;
  }
}

async function wrapETH(contract, amount) {
  try {
    const tx = await contract.deposit({ value: amount, gasPrice: gasPrice });
    await tx.wait();
  } catch (error) {
    console.error(`Error wrapping ETH: ${error.message}`);
    throw error;
  }
}

async function unwrapETH(contract, amount) {
  try {
    const tx = await contract.withdraw(amount, { gasPrice: gasPrice });
    await tx.wait();
  } catch (error) {
    console.error(`Error unwrapping ETH: ${error.message}`);
    throw error;
  }
}

async function performWrapAndUnwrap(wallet) {
  const walletInstance = new ethers.Wallet(wallet.privateKey, provider);
  const wethContract = new ethers.Contract(
    WETH_ADDRESS,
    WETH_ABI,
    walletInstance
  );

  try {
    // Fetch ETH balance
    const ethBalance = await provider.getBalance(wallet.address);

    // Generate random amount (between 8% and 12% of the ETH balance) to wrap
    const percentage = getRandomPercentage(0.08, 0.12);
    const randomAmount = (BigInt(ethBalance) * BigInt(Math.floor(percentage * 1e18))) / BigInt(1e18);

    // Perform wrap with random amount
    await wrapETH(wethContract, randomAmount);

    // Fetch WETH balance after wrap
    const wethBalance = await getBalance(wethContract, wallet.address);

    // Perform unwrap for the entire WETH balance
    await unwrapETH(wethContract, wethBalance);

  } catch (error) {
    console.error(
      `Error in performWrapAndUnwrap for ${wallet.address}: ${error.message}`
    );
  }
}

async function main() {
  const promises = wallets.map((wallet) => performWrapAndUnwrap(wallet));
  await Promise.all(promises);
}

async function runMultipleTimes() {
  for (let i = 0; i < ITERATIONS; i++) {
    console.log(`Starting iteration ${i + 1}...`);
    await main();
    console.log(`Iteration ${i + 1} complete.\n`);
  }
}

runMultipleTimes();
