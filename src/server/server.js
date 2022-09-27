import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
//import express from 'express';
const express = require('express');
const cors = require('cors');


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

//let oracles = [];
const oracles = [];
//authorize app contract to call the data contract


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
      if (error) console.log('richard' + error)
      // Get random index for oracle response     
      let result = event.returnValues;
      let totalSelectedOracles = 0;
      const {index, airline, flight, timestamp} = result;

      console.log(`Index ${index} Airline ${airline} Flight${flight} Timestamp ${timestamp}`);
    
      oracles.forEach((oracle) => {
        if (oracle.indexes.indexOf(index) > -1){
          //
          //Unknown (0) On Time (10) Late Airline (20) Late Weather (30) Late Technical (40) Late Other (50)
          //
          let status = Math.floor((Math.random() * 6)) * 10;
          console.log(`Status ${status}`);
          flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, status).send
                          ({ from: oracle.address, gas : 4712388, gasPrice: 100000000000 });
          console.log(`Submitted ${status}`);
          totalSelectedOracles += 1;
        }
      });
      console.log(`Total oracles that responded ${totalSelectedOracles}`);
    });


/*flightSuretyApp.events.OracleReport({
      fromBlock: 0
    }, function (error, event) {
        if (error) console.log('richard' + error)
        // Get random index for oracle response     
        console.log(`Total oracle report`, event);
      }); */

const app = express();
app.use(cors());

const apiRouter = require('./routers/apiRouter');

app.use('/api', apiRouter);

(async() => {

  let accounts = await web3.eth.getAccounts();
 
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call()

  for(let a=1; a < accounts.length ; a++) {     
    //
    // Check to see if the Oracle has already been registered.
    // 
    let oracelIndex = await flightSuretyApp.methods.getOracle().call({from: accounts[a]});
    let total = 0;
    oracelIndex.map(x => total += parseInt(x)); // if all the indexes add up to Zero, then the Oracle has not been registered.
    if (total === 0) {
      await flightSuretyApp.methods.registerOracle().send({ from: accounts[a], value: fee, gas : 4712388, gasPrice: 100000000000 });
      oracelIndex = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]});
      console.log(`Oracle Registered: ${accounts[a]} ${oracelIndex}`);
    }
    oracles[a] = {
      address: accounts[a],
      indexes: oracelIndex
    };
    console.log(`Oracle Details: ${oracles[a].address} ${oracles[a].indexes}`);
  }
  
})();

(async function oracleFlightStatus(){
  let x = Math.floor((Math.random() * 6)) * 10;


})();


// app.get('/api', (req, res) => {
//     res.send({
//       message: 'An API for use with your Dapp!'
//     })
// })

export default app;


