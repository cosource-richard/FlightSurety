pragma solidity >=0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    struct Airline {
        string code;
        string name;
        uint votes;
        bool hasSubmittedFunds;
        bool isRegistered;
    }

    struct Insurance {
        address purchaser;
        uint amount;
    }

    struct Flight {
        string number;
        string from;
        string to;
        uint departure;
        uint arrival;
    }

    Flight[] flights;

    mapping (string => Insurance[]) flightInsurance;
    mapping(address => uint256)  passengerBalance;

    mapping (address => Airline) airlines;
    address[] registeredAirlines;

    address[] fundedAirlines;
    //mapping (address => bool) fundedAirlines;

    mapping (bytes32 => address) votes;
    mapping (address => uint) airlineVotes;

    mapping (address => uint8[3]) registeredOracles;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier hasNotVoted(bytes32 key)
    {
        require(votes[key] == address(0x0), "Has already voted");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/



    function insertAirline
                (
                    string code,
                    string  name,
                    address wallet
                )
    {
        var airline = airlines[wallet];
        airline.code = code;
        airline.name = name;
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address airline
                            )
                            external
    {
        airlines[airline].isRegistered = true;
        registeredAirlines.push(airline) -1;
    }

    function isAirlineRegistered 
                            (   
                                address airline
                            )
                            public
                            view
                            returns(bool)
    {
        return airlines[airline].isRegistered;
    }

    function isAirlineFunded
                            (   
                                address airline
                            )
                            public
                            view
                            returns(bool)
    {
        return airlines[airline].hasSubmittedFunds;
    }

    function countRegisteredAirlines() 
                            public 
                            view 
                            returns(uint) 
    {
        return registeredAirlines.length;
    }


     /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function fundAirline
                            (   
                                address airline
                            )
                            external
    {
        airlines[airline].hasSubmittedFunds = true;
        fundedAirlines.push(airline) -1;
    }

    function getFundedAirlines()
                        external
                        view
                        returns (address[])
    {
        return fundedAirlines;
    }


  /**
    * @dev Flights
    *
    */   
  function insertFlight
                            (        
                                string number,
                                string from,
                                string to,
                                uint departure,
                                uint arrival                     
                            )
                            external 
    {
        Flight flight;
        flight.number = number;
        flight.from = from; 
        flight.to = to;
        flight.departure = departure;
        flight.arrival = arrival;


        flights.push(flight) -1;
    }

    function insertOracle 
                        (
                            address id,
                            uint8[3] indexes
                        )
                        external
    {
        registeredOracles[id] = indexes;
    }

    function getOracle(address id)
                        external
                        view
                        returns (uint8[3])
    {
        return  registeredOracles[id];
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   

    function buy
                            (        
                                address buyer,
                                string flightNo,
                                uint256 amount                     
                            )
                            external
                            payable
    {
        flightInsurance[flightNo].push(Insurance(buyer, amount)) - 1;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    //
    //1% is 100bps https://muens.io/how-to-calculate-percentages-in-solidity
    //
    function creditInsurees
                                (
                                    address insuree,
                                    uint256 bps,
                                    string flightNo
                                )
                                external
    {
        Insurance[] insurees = flightInsurance[flightNo];
        for(uint256 i=0; i < insurees.length; i++){
            insurees[i].amount = insurees[i].amount * bps / 10000;
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address insuree
                            )
                            payable
                            external
                           
    {
        require(passengerBalance[insuree] > 0, "Balance is 0.");

        uint256 balance = passengerBalance[insuree];
        passengerBalance[insuree] = 0;

        address(insuree).transfer(balance);

    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                              
                            )
                            public
                            payable
    {
        
    }

    function getBalance
                        (

                        )
                        external
                        view
                        returns (uint balance)
    {
        return address(this).balance;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function updateVote
                        (
                            address airline,
                            bytes32 key
                        )  
                        external
                        hasNotVoted(key)
    {
        airlineVotes[airline]++;
        votes[key] = airline;
    }

    function countAirlineVotes
                        (
                            address airline
                        )
                        view  
                        external
                        returns (uint)
    {
        return airlineVotes[airline];
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

