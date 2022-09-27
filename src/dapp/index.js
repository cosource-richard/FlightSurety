
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;

    // Begin
    
    const http = require('http');

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

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Oracle Report
        console.log("Register Report Begin");
        contract.registerOracleReport();
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
        const elements = document.querySelectorAll("table > tbody > tr");

        // adding the event listener by looping
        elements.forEach(element => {
            let flightRef = element.cells[0].innerText;
            let button = element.cells[2];
                button.addEventListener('click', () => {
                    console.log("Register Report Listener");
                    // Write transaction
                    contract.fetchFlightStatus(flightRef, (error, result) => {
                        display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
                    });
                })
        });

        console.log("Contract Load End");
    });

    
    

})();


function getFlightStatus (flightNo) {
    // Write transaction
    contract.fetchFlightStatus(flightNo, (error, result) => {
        display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
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
        row.appendChild(DOM.td({}, result.title));
        row.appendChild(DOM.td({className:'flightRef'}, result.flightNo));
        table.appendChild(row);
    })
    displayDiv.append(table);

}

function displayFlights2(results) {
    let displayDiv = DOM.elid("display-flights2");
  
    results.map((result) => {
        let row = displayDiv.appendChild(DOM.tr());
        row.appendChild(DOM.td({}, result.flightNo));
        row.appendChild(DOM.td({}, result.title));
        let cell =  DOM.td({});
        let button = DOM.button({className:'btn btn-light'},'Submit to Oracles');
        //button.addEventListener('click', getFlightStatus(result.flightNo));
        cell.appendChild(button);
        row.appendChild(cell);
        displayDiv.appendChild(row);
    })

    console.log("Displaying Flights End");

}







