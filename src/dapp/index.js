import axios from 'axios';
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;

    // Begin
    
    const http = require('http');

    console.log('Step 1: ');

    http.get('http://localhost:3000/api', res => {
    let data = [];
    
    res.on('data', chunk => {
        data.push(chunk);
    });

    res.on('end', () => {
        const flights = JSON.parse(Buffer.concat(data).toString());
        displayFlights2(flights);
    });
    }).on('error', err => {
    console.log('Error: ', err.message);
    });

    // End


     // Begin - Airlines

     http.get('http://localhost:3000/api2/airlines', res => {
     let data = [];
     
     res.on('data', chunk => {
         data.push(chunk);
     });
 
     res.on('end', () => {
         const airlines = JSON.parse(Buffer.concat(data).toString());
         displayAirlines(airlines);
     });
     }).on('error', err => {
     console.log('Error: ', err.message);
     });
 
     // End

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Oracle Report
        console.log("Register Report Begin");
        contract.registerFlightStatusInfo(testEvents);
        console.log("Register Report End");
    

        // User-submitted transaction
        // DOM.elid('submit-oracle').addEventListener('click', () => {
        //     let flight = DOM.elid('flight-number').value;
        //     // Write transaction
        //     contract.fetchFlightStatus(flight, (error, result) => {
        //         display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
        //     });
        // })

        // accessing the elements with same classname
        //const elements = document.querySelectorAll("table > tbody > tr");
        const tableFlights = document.getElementById("tblFlights");
        const elements = tableFlights.querySelectorAll("tbody > tr");


        // adding the event listener by looping
        elements.forEach(element => {
            let flightRef = element.cells[2].innerText;
            console.log('Flight Ref: ', flightRef);
            let button = element.cells[5];
                button.addEventListener('click', () => {
                    console.log("Register Report Listener");
                    // Write transaction
                    button.innerText = "Fetching status...";
                    contract.fetchFlightStatus(flightRef, (error, result) => {
                        //display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
                    });
                })
        });


        // Buy Flight Insurance
        DOM.elid('buy-insurance').addEventListener('click', async() => {
        
        
            let amount = parseInt(DOM.elid('insurance-amount').value);

            // Write transaction
            //await contract.buy(flightID, flightTime ,amount ,(error, result) => {
            await contract.buy(flightID ,amount ,(error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp}]);
            });
            DOM.elid('BuyFlightStatus').innerText = "Bought";
        })


        DOM.elid('passenger-id').innerText = contract.passenger;
        DOM.elid('wallet-id').innerText = contract.passenger;
        DOM.elid('wallet-balance').innerText = contract.passengerWalletBalance;
        

        console.log("Contract Load End");
    });

    
    

})();





function getFlightStatus (flightNo) {
    // Write transaction
    contract.fetchFlightStatus(flightNo, (error, result) => {
        display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
    });
}

function testEvents(results){
    //console.log("Callback events worked:" , results);
    console.log("Test 3", results.returnValues);

    let flightNo = results.returnValues.flight;
    console.log("Flight ", flightNo);
    let status = results.returnValues.status;
    console.log("Status ", status);

     // accessing the elements with same classname
     const elements = document.querySelectorAll("table > tbody > tr");

     // adding the event listener by looping
     elements.forEach(element => {
         let flightRef = element.cells[2].innerText;
         if (flightRef === flightNo) {
            //
            //Unknown (0) On Time (10) Late Airline (20) Late Weather (30) Late Technical (40) Late Other (50)
            //
            let statusMessage = '';
            switch(status) {
                case '10':
                    statusMessage = 'On Time';
                  break;
                case '20':
                    statusMessage = 'Late Airline';
                  break;
                case '30':
                    statusMessage = 'Late Weather';
                  break;
                case '40':
                    statusMessage = 'Late Technical';
                  break;
                case '50':
                    statusMessage = 'Late Other';
                  break;
                default:
                    statusMessage = 'Unknown';
              }
            element.cells[4].innerText = statusMessage;
            element.cells[5].innerText = "";
            let button = element.cells[5].getElementsByTagName("button")[0];
            console.log("Button", button);
            button.disabled = true;
         }
        
     });
}


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function displayFlights(results) {
    let displayDiv = DOM.elid("display-flights");
    let table = DOM.table({className:'table table-dark'});
  
    results.map((result) => {
        let row = table.appendChild(DOM.tr());
        row.appendChild(DOM.td({}, result.origin));
        row.appendChild(DOM.td({}, result.airline));
        row.appendChild(DOM.td({className:'flightRef'}, result.flightNo));
        row.appendChild(DOM.td({}, result.scheduled));
        table.appendChild(row);
    })
    displayDiv.append(table);

}

function displayFlights2(results) {
    let displayDiv = DOM.elid("display-flights2");
  
    results.map((result) => {
        let row = displayDiv.appendChild(DOM.tr());
        row.appendChild(DOM.td({}, result.origin));
        row.appendChild(DOM.td({}, result.airline));
        row.appendChild(DOM.td({}, result.flightNo));
        row.appendChild(DOM.td({}, result.scheduled));
        row.appendChild(DOM.td({}, ""));
        let cell =  DOM.td({});
        let button = DOM.button({className:'btn btn-light'},'Submit to Oracles');
        cell.appendChild(button);
        row.appendChild(cell);
        displayDiv.appendChild(row);
    })

    console.log("Displaying Flights End");

}

function displayAirlines(results) {
    let displayDiv = DOM.elid("display-airlines");
    displayDiv.innerHTML = '';

    console.log(results);

    // for(let result in results.airlines){
      
    // }
  
    results.airlines.map((result) => {
          //
        // Get Airline status
        //
        console.log(`result : ${result}`);
        let status = result.status

        console.log(status);

        let row = displayDiv.appendChild(DOM.tr());
        row.appendChild(DOM.td({}, result.airline));  
        row.appendChild(DOM.td({}, status));
        
        let cellRegister =  DOM.td({});

        if (status == "Not Registered"){
            let buttonRegister = DOM.button({className:'btn btn-light'},'Register');
            buttonRegister.addEventListener('click', async() => {
                console.log("Register Airline: " + result.wallet);
                const res = await axios.get('http://localhost:3000/api2/registerAirline', 
                    { 
                        params: {
                            wallet: result.wallet
                        }
                    }
                    );
                console.log("Response :" + res);
            });

            cellRegister.appendChild(buttonRegister);
        }

        if (status == "Not Funded"){
            let buttonFund = DOM.button({className:'btn btn-light'},'Fund');
            buttonFund.addEventListener('click', async() => {
                console.log("Fund Airline: " + result.wallet);
                const res = await axios.get('http://localhost:3000/api2/fundAirline', 
                    { 
                        params: {
                            wallet: result.wallet
                        }
                    }
                    );
                console.log("Response :" + JSON.stringify(res.data));
                console.log("Response :" + res.data.status);
                result.status = res.data.status;
                displayAirlines(results);
            });

            cellRegister.appendChild(buttonFund);
        }
        
        row.appendChild(cellRegister);

        // let cellFund =  DOM.td({});
        // let buttonFund = DOM.button({className:'btn btn-light'},'Fund');
        // cellFund.appendChild(buttonFund);
        // row.appendChild(cellFund);

        displayDiv.appendChild(row);
    })

    console.log("Displaying Airlines End");

}







