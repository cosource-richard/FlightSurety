
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

console.log("starting tests here...");

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts); 
    console.log("Address is ", config.flightSuretyApp.address );
    //await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

   it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() unless it is registered', async () => {
    
    // ARRANGE
    let secondAirline = accounts[2]
    let newAirline = accounts[3];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: secondAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline unless it is registered");

  });

  it('(airline) can register up to 4 airlines without multiparty', async () => {
    
    // ARRANGE
    let secondAirline = accounts[2]
    let thirdAirline = accounts[3];
    let fourthAirline = accounts[4];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(secondAirline, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(thirdAirline, {from: secondAirline});
        await config.flightSuretyApp.registerAirline(fourthAirline, {from: thirdAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.countRegisteredAirlines.call(); 

    // ASSERT
    assert.equal(result, 4, "The first 4 airlines should be able to register without multiparty");

  });

  it('(airline) should have 1 votes', async () => {
    
    // ARRANGE
    let newAirline = accounts[5];
    let fourthAirline = accounts[4];

    await config.flightSuretyApp.voteForAirline(newAirline, {from: fourthAirline});

    // ACT
    let result = await config.flightSuretyData.countAirlineVotes.call(newAirline); 

    // ASSERT
    assert.equal(result, 1, "Airline should have 1 vote");

  });

  it('(airline) can not vote for the same airline twice', async () => {
    
    // ARRANGE
    let fifthAirline = accounts[5];
    let fourthAirline = accounts[4];

    // ACT
    try {
        await config.flightSuretyApp.voteForAirline(fifthAirline, {from: fourthAirline});
    }
    catch(e) {

    }

    let result = await config.flightSuretyData.countAirlineVotes.call(fifthAirline); 

    // ASSERT
    assert.equal(result, 1, "Airline should have 1 vote");

  });


  it('(airline) cannot register as it does not have enough votes', async () => {
    
    // ARRANGE
    let fourthAirline = accounts[4]
    let fifthAirline = accounts[5];

    // ACT

    try {
        await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
    }
    catch(e) {

    }

    let result = await config.flightSuretyData.countRegisteredAirlines.call(); 

    // ASSERT
    assert.equal(result, 4, "There should be 4 airlines registered");

  });

  it('(airline) multi-party consensus', async () => {
    
    // ARRANGE
    let thirdAirline = accounts[3];
    let fourthAirline = accounts[4]
    let fifthAirline = accounts[5];

    // ACT

    await config.flightSuretyApp.voteForAirline(fifthAirline, {from: thirdAirline});
    await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
  
    let result = await config.flightSuretyData.countRegisteredAirlines.call(); 

    // ASSERT
    assert.equal(result, 5, "There should be 5 airlines registered");

  });

  it('(airline) multi-party consensus with an odd number of registered airlines', async () => {
    
    // ARRANGE
    let thirdAirline = accounts[3];
    let fourthAirline = accounts[4]
    let fifthAirline = accounts[5];
    let sixthAirline = accounts[6];

    // ACT

    await config.flightSuretyApp.voteForAirline(sixthAirline, {from: thirdAirline});
    await config.flightSuretyApp.voteForAirline(sixthAirline, {from: fourthAirline});
    await config.flightSuretyApp.voteForAirline(sixthAirline, {from: fifthAirline});
    await config.flightSuretyApp.registerAirline(sixthAirline, {from: fifthAirline});
  
    let result = await config.flightSuretyData.countRegisteredAirlines.call(); 

    // ASSERT
    assert.equal(result, 6, "There should be 6 airlines registered");

  });

  it('(airline) fund insurance', async () => {
    
    // ARRANGE

    let fifthAirline = accounts[15];
    let sixthAirline = accounts[16];
    //let fee = web3.utils.toWei(web3.utils.toBN(3), "kwei");
    let fee = await config.flightSuretyApp.AIRLINE_FEE.call();

    // ACT

    let response1 = await config.flightSuretyApp.fund({from: fifthAirline, value: fee});
    let response2 = await config.flightSuretyApp.fund({from: sixthAirline, value: fee});

    let result = await config.flightSuretyApp.getBalance.call(); 
    let result2 = await config.flightSuretyApp.getAirlines.call(); 


    // ASSERT
    assert.equal(result, fee * 2, "Incorrect Balance");

  }); 

  it('(passenger) initial balance is zero', async () => {
    
    // ARRANGE
    let passenger = accounts[9];
    
    // ACT

    let accountBalance = await config.flightSuretyApp.getPassengerBalance.call({from: passenger});
   

    // ASSERT
    assert.equal(accountBalance , 0 ,  "Account not 0");

  }); 

  it('(passenger) purchase insurance', async () => {
    
    // ARRANGE
    let passenger = accounts[9];
    //let fee = web3.utils.toWei(web3.utils.toBN(3), "kwei");
    let fee = await config.flightSuretyApp.INSURANCE_FEE.call();
    const gasPrice = 20000000000;
    
    // ACT


    let accountBalanceBefore = await web3.eth.getBalance(passenger);
    let result = await config.flightSuretyApp.buy('TestFlightNo999', {from: passenger, value: fee});
    let gasCost = result.receipt.gasUsed * gasPrice;
    let accountBalanceAfter = await web3.eth.getBalance(passenger);
    let totalSpent = BigInt(accountBalanceBefore) - (BigInt(gasCost) + BigInt(accountBalanceAfter))
  

    // console.log("Receipt: ", result.receipt);
    // console.log("Gas used: ", result.receipt.gasUsed);
    // console.log("Gas cost: ", gasCost);
    // console.log("Balance Before: ", accountBalanceBefore);
    // console.log("Total: ", BigInt(accountBalanceAfter) + BigInt(gasCost));
    // console.log("Balance After: ", accountBalanceAfter);
    // console.log("Spent: ", totalSpent);
    // console.log("Fee: ", BigInt(fee));
    // console.log("Gas used: ", response1.receipt.gasUsed);

 

    // ASSERT

    assert(totalSpent >= BigInt(fee),  "Insurance not purchased");

  });

 

  it('(passenger) can not purchase insurance twice', async () => {
    
    // ARRANGE
    let passenger = accounts[9];
    //let fee = web3.utils.toWei(web3.utils.toBN(3), "kwei");
    let fee = await config.flightSuretyApp.INSURANCE_FEE.call();
    const gasPrice = 20000000000;
    
    // ACT

    let accountBalanceBefore = await web3.eth.getBalance(passenger);
    try {
      let result = await config.flightSuretyApp.buy('TestFlightNo999', {from: passenger, value: fee});
    }
    catch(e) {
    
    }
    let accountBalanceAfter = await web3.eth.getBalance(passenger);
    let balance = accountBalanceBefore - accountBalanceAfter;
 
    // ASSERT
    assert(balance < fee ,  "Insurance purchased twice");

  });

  it('(passenger) credit insurees for late flight', async () => {
    
    // ARRANGE
    let passenger = accounts[9];
    let fee = await config.flightSuretyApp.INSURANCE_FEE.call();
    const STATUS_CODE_LATE_AIRLINE = 20;
    
    // ACT

    //
    //1% is 100bps https://muens.io/how-to-calculate-percentages-in-solidity
    //
    await config.flightSuretyApp.processFlightStatus('TestFlightNo999', STATUS_CODE_LATE_AIRLINE , {from: passenger});
    let accountBalance = await config.flightSuretyApp.getPassengerBalance.call({from: passenger});
   
    // ASSERT
    assert(accountBalance > fee,  "Account not credited");

  });

  it('(passenger) withdraw', async () => {
    
    // ARRANGE
    let passenger = accounts[9];
    const gasPrice = 20000000000;
    

    // ACT

    let result = await config.flightSuretyApp.withdraw({from: passenger});

    let accountInsuranceBalanceAfter = await config.flightSuretyApp.getPassengerBalance.call({from: passenger});

    // console.log("Receipt: ", result.receipt);
    // console.log("Gas used: ", result.receipt.gasUsed);
    // console.log("Gas cost: ", gasCost);
    // console.log("Insurance Balance Before: ", accountInsuranceBalanceBefore);
    // console.log("Balance Before: ", accountBalanceBefore);
    // console.log("Balance After: ", accountBalanceAfter);
    // console.log("Insurance Balance After: ", accountInsuranceBalanceAfter);
    // console.log("Spent: ", totalSpent);
    // console.log("Fee: ", BigInt(fee));
    //console.log("Gas used: ", response1.receipt.gasUsed);

    // ASSERT
    assert.equal(accountInsuranceBalanceAfter , 0,  "Could not withdraw insurance balance.");

  });
 

});
