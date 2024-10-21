const { ethers } = require("ethers");
const axios = require("axios");
require("dotenv").config({ path: __dirname + "/.env" });

// Provider untuk jaringan Taiko
const provider = new ethers.JsonRpcProvider("https://rpc.taiko.xyz");

// Pengaturan wallet dari .env
const wallets = [
  { address: process.env.ADDRESS_1, privateKey: process.env.PRIVATE_KEY_1 },
  { address: process.env.ADDRESS_2, privateKey: process.env.PRIVATE_KEY_2 },
  { address: process.env.ADDRESS_3, privateKey: process.env.PRIVATE_KEY_3 },
  { address: process.env.ADDRESS_4, privateKey: process.env.PRIVATE_KEY_4 },
  { address: process.env.ADDRESS_5, privateKey: process.env.PRIVATE_KEY_5 },
  { address: process.env.ADDRESS_6, privateKey: process.env.PRIVATE_KEY_6 },
  { address: process.env.ADDRESS_7, privateKey: process.env.PRIVATE_KEY_7 },
];

// Mengambil GWEI dan jumlah iterasi dari .env
const GWEI = process.env.GWEI || "0.075";
const ITERATIONS = parseInt(process.env.ITERATIONS, 10) || 5;

// Alamat dan ABI WETH
const WETH_ADDRESS = "0xa51894664a773981c6c112c43ce576f315d5b1b6";
const WETH_ABI = [
  "function deposit() public payable",
  "function withdraw(uint wad) public",
  "function balanceOf(address owner) view returns (uint256)"
];

// Mendapatkan gas price sesuai dengan GWEI yang sudah diatur
const gasPrice = ethers.parseUnits(GWEI.toString(), "gwei");

function getRandomPercentage(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

async function getBalance(contract, address) {
  try {
    return await contract.balanceOf(address);
  } catch (error) {
    console.error(`Error getting balance: ${error.message}`);
    throw error;
  }
}

async function getETHPriceInUSDT() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: "ethereum",
          vs_currencies: "usd"
        }
      }
    );
    return response.data.ethereum.usd;
  } catch (error) {
    console.error(`Error fetching ETH price: ${error.message}`);
    throw error;
  }
}

async function getCombinedBalanceInUSDT(walletAddress, ethPrice) {
  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, provider);
  const [ethBalance, wethBalance] = await Promise.all([
    provider.getBalance(walletAddress),
    getBalance(wethContract, walletAddress)
  ]);

  const ethBalanceFormatted = ethers.formatEther(ethBalance);
  const wethBalanceFormatted = ethers.formatEther(wethBalance);
  const totalEth = parseFloat(ethBalanceFormatted) + parseFloat(wethBalanceFormatted);

  return totalEth * ethPrice;
}

async function wrapETH(contract, amount) {
  try {
    const tx = await contract.deposit({ value: amount, gasPrice });
    await tx.wait();
  } catch (error) {
    console.error(`Error wrapping ETH: ${error.message}`);
    throw error;
  }
}

async function unwrapETH(contract, amount) {
  try {
    const tx = await contract.withdraw(amount, { gasPrice });
    await tx.wait();
  } catch (error) {
    console.error(`Error unwrapping ETH: ${error.message}`);
    throw error;
  }
}

async function performWrapsAndUnwraps(wallet) {
  const walletInstance = new ethers.Wallet(wallet.privateKey, provider);
  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, walletInstance);

  try {
    const [ethBalance, wethBalance] = await Promise.all([
      provider.getBalance(wallet.address),
      getBalance(wethContract, wallet.address)
    ]);

    await performOperations(wrapETH.bind(null, wethContract), ethBalance, 1, 1);
    await performOperations(
      unwrapETH.bind(null, wethContract),
      wethBalance,
      1,
      1,
      true // Flag to indicate unwrap full balance
    );
  } catch (error) {
    console.error(`Error in main function for ${wallet.address}: ${error.message}`);
  }
}

async function performOperations(operation, balance, minTimes, maxTimes, unwrapFull = false) {
  const times = Math.floor(Math.random() * (maxTimes - minTimes + 1)) + minTimes;

  for (let i = 0; i < times; i++) {
    let amount;
    if (unwrapFull) {
      amount = balance;
    } else {
      const percentage = getRandomPercentage(0.08, 0.12);
      amount = (BigInt(balance) * BigInt(Math.floor(percentage * 1e18))) / BigInt(1e18);
    }

    await operation(amount);
    await new Promise((resolve) => setTimeout(resolve, getRandomDelay(2, 6)));
  }
}

async function main() {
  const promises = wallets.map((wallet) => performWrapsAndUnwraps(wallet));
  await Promise.all(promises);
}

async function runMultipleTimes() {
  const ethPrice = await getETHPriceInUSDT();

  const initialBalances = await Promise.all(
    wallets.map(async (wallet) => {
      const balanceInUSDT = await getCombinedBalanceInUSDT(wallet.address, ethPrice);
      console.log(
        `Initial balance for ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}: ${balanceInUSDT.toFixed(2)}$`
      );
      return balanceInUSDT;
    })
  );

  for (let i = 0; i < ITERATIONS; i++) {
    await main();
  }

  const finalBalances = await Promise.all(
    wallets.map(async (wallet) => {
      const balanceInUSDT = await getCombinedBalanceInUSDT(wallet.address, ethPrice);
      console.log(
        `Final balance for ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}: ${balanceInUSDT.toFixed(2)}$`
      );
      return balanceInUSDT;
    })
  );
}

runMultipleTimes();
