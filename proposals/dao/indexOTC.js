const { expect } = require('chai');
const hre = require('hardhat');
const { forceEth } = require('../../end-to-end/setup/utils.ts');

const e18 = '000000000000000000';
const e15 =    '000000000000000';

// Run the setup steps required for the DAO proposal to fully execute
// Approve the 3 OTC contracts for INDEX from the beneficiary
async function setup(addresses, oldContracts, contracts, logging) {
  const {
    defiPulseOTCAddress,
    ethOTCEscrowAddress,
    feiOTCEscrowAddress,
    tribeOTCEscrowAddress,
  } = addresses;

  const { index } = contracts;
  await forceEth(defiPulseOTCAddress);

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [defiPulseOTCAddress]
  }); 

  await index.approve(ethOTCEscrowAddress, `50000${e18}`, {from: defiPulseOTCAddress});
  await index.approve(tribeOTCEscrowAddress, `25000${e18}`, {from: defiPulseOTCAddress});
  await index.approve(feiOTCEscrowAddress, `25000${e18}`, {from: defiPulseOTCAddress});
}

/*
Simulate the DAO flow of acquiring and swapping ETH, FEI, and TRIBE OTC for INDEX
 1. Withdraw 633.15 ETH to Timelock
 2. Wrap 633.15 ETH
 3. Transfer WETH to OtcEscrow
 4. Swap Weth OTC
 5. Mint 991512.900 FEI to OTC contract
 6. Swap FEI OTC
 7. Send 1235325.922 TRIBE from Treasury to OTC contract
 8. Swap TRIBE OTC
*/
async function run(addresses, oldContracts, contracts, logging = false) {
  const { timelockAddress } = addresses;
  const { 
    fei,
    weth,
    core,
    ethOTCEscrow,
    feiOTCEscrow,
    tribeOTCEscrow,
    ethPCVDripper
  } = contracts;

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [timelockAddress]
  }); 

  await ethPCVDripper.withdrawETH(timelockAddress, `633150${e15}`);
  await weth.deposit({from: timelockAddress, value: `633150${e15}`});
  await weth.transfer(ethOTCEscrow.address, `633150${e15}`, {from: timelockAddress });
  await ethOTCEscrow.swap({from: timelockAddress});
  await fei.mint(feiOTCEscrow.address, `991512900${e15}`);
  await feiOTCEscrow.swap({from: timelockAddress});
  await core.allocateTribe(tribeOTCEscrow.address, `1235325922${e15}`);
  await tribeOTCEscrow.swap({from: timelockAddress});
}

// Check all of the balances are transferred as expected
async function validate(addresses, oldContracts, contracts) {
  const {
    index, wethERC20, tribe, fei 
  } = contracts;
  const {
    defiPulseOTCAddress,
    timelockAddress,
  } = addresses;

  expect((await index.balanceOf(timelockAddress)).toString()).to.be.equal(`100000${e18}`);
  expect((await fei.balanceOf(defiPulseOTCAddress)).toString()).to.be.equal(`991512900${e15}`);
  expect((await tribe.balanceOf(defiPulseOTCAddress)).toString()).to.be.equal(`1235325922${e15}`);
  expect((await wethERC20.balanceOf(defiPulseOTCAddress)).toString()).to.be.equal(`633150${e15}`);
}

async function teardown(addresses, oldContracts, contracts, logging) {}

module.exports = {
  setup, run, teardown, validate
};
