pragma solidity >=0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    //Costs
    uint256 public constant AIRLINE_FEE = 10 ether;
    uint256 public constant INSURANCE_FEE = 1 ether;

    //Payout Percentage (BPS) - 150%
    uint256 public constant INSURANCE_PAYOUT_PERCENTAGE = 5000;

    address private contractOwner;          // Account used to deploy contract
    FlightSuretyData flightSuretyData;

    mapping(bytes32 => bool) insurancePurchaseHistory;   // Key - Address of buyer + flightcode

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    uint constant M = 2;
    uint8 constant N = 4;  //Number of Airlines that can register without consensus 
    address[] multiCalls = new address[](0);

 
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
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
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

    modifier registeredAirline()
    {
        require(flightSuretyData.isAirlineRegistered(msg.sender), "Airline is not registered");
        _;
    }

      // Define a modifier that checks if the paid amount is sufficient to cover the price
    modifier paidEnough(uint _price) { 
        require(msg.value >= _price); 
        _;
    }
    
    // Define a modifier that checks the price and refunds the remaining balance
    modifier checkValue(uint _price) {
        _;
        uint amountToReturn = msg.value - _price;
        msg.sender.transfer(amountToReturn);
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address dataContract,
                                    address firstAirline                           
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
        flightSuretyData.registerAirline(firstAirline);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            pure 
                            returns(bool) 
    {
        return true;  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function voteForAirline
                        (
                            address airline
                        ) public 
                        registeredAirline
                        returns(uint)
    
    {
        bytes32 key = keccak256(msg.sender, airline);
        flightSuretyData.updateVote(airline, key);    
    }   

    function addAirline
                (
                    string memory code,
                    string memory name,
                    address wallet
                )
    {
        flightSuretyData.insertAirline(code, name, wallet);
    }
  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (   
                                address newAirline
                            )
                            public
                            registeredAirline
                            returns(bool success, uint256 votes)
    {
        uint noOfVotes;
        uint noOfVotesRequired;
        uint noOfAirlines = flightSuretyData.countRegisteredAirlines();

        if (noOfAirlines < N) {            
            success = true;
        } else {               
                noOfVotes = flightSuretyData.countAirlineVotes(newAirline);
                require(noOfVotes != 0, "Airline does not have any votes"); //Protect against 0 
                noOfVotesRequired = (noOfAirlines / M) + (noOfAirlines % M);
                require(noOfVotes >= noOfVotesRequired, "Airline does not have enough votes");
                success = true;
        }

        if (success){
            flightSuretyData.registerAirline(newAirline); 
        }
        return (success, noOfVotes);
    }

    function fund()
        payable
        public
    {
        //gasleft();
        address(flightSuretyData).transfer(msg.value);
        flightSuretyData.fundAirline(msg.sender);

        //flightSuretyData.fund();
    }

    function buy
                            (        
                                string flightNo               
                            )
                            external
                            payable
                            returns (bool)
    {
        require((msg.value > 0) && (msg.value <= 1 ether), "Insurance value should be greater than 0 and up to 1 ether]");
        bytes32 key = keccak256(abi.encodePacked(msg.sender, flightNo));
        require(!insurancePurchaseHistory[key], "Insurance has already been brought");

        address(flightSuretyData).transfer(msg.value);
        flightSuretyData.buy(msg.sender, flightNo, msg.value);
        insurancePurchaseHistory[key] = true;

        return insurancePurchaseHistory[key];
    }

     function creditInsurees
                                (
                                    uint256 bps,
                                    string flightNo
                                )
                                external
    {
        flightSuretyData.creditInsurees(bps, flightNo);
    }



    function getPassengerBalance
                                    (

                                    ) external view
                                    returns(uint256 balance)
    {
        return flightSuretyData.getPassengerBalance(msg.sender);
    } 


     function withdraw
                    () external
                       payable 
                       returns(bool success){
        
        flightSuretyData.pay(msg.sender);
        return true;
    } 



    function getBalance()
        view
        public
        returns (uint balance)
    {
        return flightSuretyData.getBalance();
    }



    function getAirlines()
                            view
                            external
                            returns(address[])
    {
        return flightSuretyData.getFundedAirlines();
    }

    function getAirlineStatus
                            (
                                address airline
                            )
                            view 
                            external
                            returns(string)
    {
        string memory status = "Not Registered";

        if (flightSuretyData.isAirlineRegistered(airline))
        {
            if (flightSuretyData.isAirlineFunded(airline))
            {
                status = "Active";
            }
            else
            {
                status = "Not Funded";
            }
        }

        return status;
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    string number,
                                    string from,
                                    string to,
                                    uint departure,
                                    uint arrival            
                                )
                                external
    {
        flightSuretyData.insertFlight(number, from, to, departure, arrival);
    }


    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    string memory flightNo,
                                    uint8 statusCode
                                )
                                public                            
    {
        address[] memory insurees = flightSuretyData.getInsurees(flightNo);
        //
        // Allow the insurance to be purchased again
        //
        for(uint256 i=0; i < insurees.length; i++){
             bytes32 key = keccak256(abi.encodePacked(insurees[i], flightNo));
             insurancePurchaseHistory[key] = false;
        }  
        if (statusCode == STATUS_CODE_LATE_AIRLINE){
            flightSuretyData.creditInsurees(INSURANCE_PAYOUT_PERCENTAGE, flightNo);
        } else {
            //
            // Adjust the balance to remove original amount that insurance was purchased
            //
            flightSuretyData.debitInsurees(flightNo);
        }
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE  = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        address id;
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        id : msg.sender,
                                        isRegistered: true,
                                        indexes: indexes
                                    });
        //Save Oracle
        flightSuretyData.insertOracle(msg.sender, indexes);
    }

    function getOracle
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        return flightSuretyData.getOracle(msg.sender);
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        //require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if ((oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) && (oracleResponses[key].isOpen))  {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            //As we have the status response close off further requests.
            oracleResponses[key].isOpen = false;

            // Handle flight status as appropriate
            processFlightStatus(flight, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}  

contract FlightSuretyData {
    function getOracle(address id) view external returns (uint8[3]);
    function insertOracle(address id,uint8[3] indexes) external;
    function insertAirline(string code, string name, address wallet) external;
    function registerAirline(address airline) external;
    function isAirlineRegistered (address airline) view external returns(bool);
    function isAirlineFunded (address airline) view external returns(bool);
    function countRegisteredAirlines() view external returns(uint);
    function updateVote(address airline, bytes32 key) external;
    function countAirlineVotes(address airline) view  external returns (uint);
    function fund() payable external;
    function fundAirline(address airline) external;
    function getFundedAirlines()external view returns (address[]);
    function getBalance() external returns (uint balance);
    function insertFlight(string number, string from, string to, uint departure, uint arrival) external;
    function buy(address buyer, string flightNo, uint256 amount) external payable;
    function pay (address insuree) payable external;
    function getPassengerBalance  (address passenger) external view returns(uint256 balance);
    function creditInsurees(uint256 bps,string flightNo) external;
    function debitInsurees(string flightNo) external;
    function getInsurees(string flightNo) external returns(address[] passengers);
}
