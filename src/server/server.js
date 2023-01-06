import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import { query } from 'express';

//import express from 'express';
const express = require('express');
const cors = require('cors');

let airlines = require('./data/airlines.json');


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

//let oracles = [];
const oracles = [];
//authorize app contract to call the data contract


flightSuretyApp.events.OracleRequest({
    fromBlock: 'latest'
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
      //

const app = express();
app.use(cors());

const apiRouter = require('./routers/apiRouter');

app.use('/api', apiRouter);

(async() => {

  let accounts = await web3.eth.getAccounts();
 
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();

 
// fs.writeFile("src/server/data/airlines.json", airlines, 'utf8', function (err) {
//   if (err) {
//       console.log("An error occured while writing JSON Object to File.");
//       return console.log(err);
//   }

//   console.log("JSON file has been saved.");
// });


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


 app.get('/api2/airlines', async (req, res) => {
   
  for(let airline in airlines){
    let status = await flightSuretyApp.methods.getAirlineStatus(airlines[airline].wallet).call()
    airlines[airline].status = status;
  }

  res.send({
      airlines
    })
})

app.get('/api2/registerAirline', async(req, res) => {
  let airline = req.query.wallet;
  let accounts = await web3.eth.getAccounts();
  await flightSuretyApp.methods.registerAirline(airline).send({from: accounts[1], gas : 4712388, gasPrice: 100000000000 });
  let status = await flightSuretyApp.methods.getAirlineStatus(airline).call()
  res.send({
    status: status
  })
})


app.get('/api2/fundAirline', async(req, res) => {
  let airline = req.query.wallet;
  let fee = web3.utils.toWei(web3.utils.toBN(10), "ether");
  //let fee = await flightSuretyApp.methods.AIRLINE_FEE.call();
  await flightSuretyApp.methods.fund().send({from: airline, value: fee, gas : 4712388, gasPrice: 100000000000 });
  let status = await flightSuretyApp.methods.getAirlineStatus(airline).call()
  res.send({
    status: status
  })
})

//  app.getAirlines = () => { 
//   for(let airline in airlines){
//     let status = flightSuretyApp.methods.getAirlineStatus(airlines[airline].wallet).call()
//     airlines[airline].status = status;
//   } 
//   return airlines;
// };

//module.exports = "Hello World"; //airlines;
//export {getAirlines, app}
// export default getAirlines;
export default app;


