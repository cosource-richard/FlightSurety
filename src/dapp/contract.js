import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        //this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        //this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passenger = null;
        this.passengerWalletBalance = null;

    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            this.airlines.push(accts[1]);
            this.passenger = accts[9];
         
            //this.passengerWalletBalance = 
            this.web3.eth.getBalance(this.passenger).then(balance => {
                this.passengerWalletBalance = this.web3.utils.fromWei(balance, 'ether');
                callback();
            });
            console.log('Promise', this.passengerWalletBalance);

           /* let counter = 2;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
                this.registerAirline(accts[counter], accts[counter - 1], (response) => {
                    console.log(response);
                });
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            } */

            //callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    balance(callback) {
        let self = this;
        self.flightSuretyApp.methods
             .getBalance()
             .call({ from: self.owner}, callback);
     }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    fetchAirlineStatus(airline, callback) {
        let self = this;
       
        self.flightSuretyApp.methods
            .getAirlineStatus(airline)
            .send({ from: self.owner}, (error, result) => {
                callback(result);
            });
    }

    registerOracleReport(callback) {
        let self = this;
        self.flightSuretyApp.events.OracleReport({
            fromBlock: 'latest'
          }, function (error, event) {
              if (error) console.log('richard' + error)
              // Get random index for oracle response     
              console.log(`Contract oracle report`, event);
              callback(event);
            });
     }


     registerFlightStatusInfo(callback) {
        let self = this;
        self.flightSuretyApp.events.FlightStatusInfo({
            fromBlock: 'latest'
          }, function (error, event) {
              if (error) console.log('richard' + error)
              // Get random index for oracle response     
              callback(event);
            });
     }

     registerAirline(airline, registeredAirline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(airline)
            .send({ from: registeredAirline, "gas": 4712388, "gasPrice": 100000000000 }, 
                (error, result) => {
                    if (error)
                        callback(error);
                    else 
                        callback(result);
                });
    }

    buy(flightNo, insuranceAmount, callback) {
        let self = this;
        insuranceAmount = this.web3.utils.toWei(insuranceAmount.toString(), 'ether');
        console.log("Insurance Amount: ", insuranceAmount );
        self.flightSuretyApp.methods
            .buy(flightNo)
            .send({ from: self.passenger, value: insuranceAmount, "gas": 4712388, "gasPrice": 100000000000 }, 
                (error, result) => {
                    callback(error, result);
                });
    }

    insuranceBalance(callback) {
        let self = this;
        self.web3.eth.getBalance(self.passenger).then(balance => {
            self.passengerWalletBalance = this.web3.utils.fromWei(balance, 'ether');
        });
        self.flightSuretyApp.methods
            .getPassengerBalance()
            .call({ from: self.passenger}, 
                (error, result) => {   
                    if (typeof result !== 'undefined') {
                        result = this.web3.utils.fromWei(result, 'ether');
                    }
                    callback(error, result);
                });
    }

    withdraw(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .withdraw()
            .send({ from: self.passenger, "gas": 4712388, "gasPrice": 100000000000 }, 
                (error, result) => {
                    callback(error, result);
                });
    }

    
}