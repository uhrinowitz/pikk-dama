// init
const deck = new Array();
const players = new Array();

class Card {
	constructor(color, number) {
		this.color = color;
		this.number = number;
	}	
}

// create player class
class Player {
	constructor(playerNum) {
		this.playerNum = playerNum;
		this.playerCards = [];
		this.playerInventory = [];
	}
}
//create cards
createCards();
// create players
createPlayers();
// shuffle cards in deck array
shuffle(deck);
// split deck to 4 slices
splitDeck();
// create elements in DOM and name all Cards
drawBoard();

// game specific variables
let round = 1;
let text;
let canCallQofSpades = false;
let canCallHeart = false
let playerOrder = new Array();
let evalCards = new Array();
let cardsToReceiveByPlayer = new Array();
let originalPlayerOrder = new Array();
// let isDone = false;
let winner;

// ==================================================================================
// game loop
function mainLoop() {
    update();
    // check if game ended
	if(deck.length == 0){
		console.log("GAME OVER!!!");
		return;
   		}
	requestAnimationFrame(mainLoop);
	}

// Start things off
requestAnimationFrame(mainLoop);
// ==================================================================================



// round update
function update(){
   	// check if update is needed
   	if (playerOrder.length == 0) {
	    getPlayOrder(winner);
	    // keep record with original one to determine winner
	    originalPlayerOrder.length = 0;
	    for(i=0; i<playerOrder.length; i++){
	    	originalPlayerOrder.push(playerOrder[i]);
	}
	// increment round
	incrementRound();
	}
}

function incrementRound(){
	return round += 1;
}

function getPlayOrder(winner){
	// define player order
	var firstPlayer;
	if(round == 1){
		firstPlayer = getPlayerOrder(0,0);
	} else {
		firstPlayer = winner;
	}
	playerOrder.push(firstPlayer);
	// add rest of players
	addRestPlayers(firstPlayer);
	text = round + " ROUND BEGINS!"
	appendStats(text);
	text = "Player" + (firstPlayer + 1) + " starts!"
	appendStats(text);
	text = "PLAYER ORDER: " + playerOrder;
	appendStats(text);
	// return isDone = true;
}



// check if player's turn
document.onclick = function(e){
	if(e.target.tagName == 'LI'){

	pickedCard = e.target.textContent.split(' ');
	// console.log("Player" + parseInt(playerOrder[0]+1) + " has picked " + pickedCard[0] + " " + pickedCard[1])


	// check if current player has the card to call
	var okPlayer = checkCard(getCardColor(pickedCard[0]), getCardNumber(pickedCard[1]));
	var currentPlayer = playerOrder[0];
	if(okPlayer == currentPlayer){
		text = "Player" + parseInt(playerOrder[0]+1) + " has picked " + pickedCard[0] + " " + pickedCard[1];
		appendStats(text);
		// remove player
		playerOrder.shift();
		// add card for eval
		evalCards.push({
			color: getCardColor(pickedCard[0]),
			number: getCardNumber(pickedCard[1])
			});
		// remove card
		removeCard(getCardColor(pickedCard[0]), getCardNumber(pickedCard[1]));
	  	e.target.remove();
	  	}
	  	else {
	  		text = "not this player's turn!";
	  		appendStats(text);
	  	}
   }
	console.log(evalCards);
		if(evalCards.length == 4){
			winner = evalRound(evalCards);
			// reset array
			evalCards.length = 0;
		}

}

function evalRound(evalCards){
	j = 0;
	for(i=1; i<4; i++){
		if(evalCards[j].color == evalCards[i].color){
			if(evalCards[j].number < evalCards[i].number)
				j = i;
		}
	}
	winner = originalPlayerOrder[j];
	text = "Winner is: Player" + parseInt(winner+1);
	appendStats(text);
	return winner;
}

function checkCard(color, number){
		// loop players and their cards
		var len = players.length;
		for(j=0;j<len;j++){
			for(i=0;i<players[j].playerCards.length;i++){
				// check if correct player had the card
				if(players[j].playerCards[i].color == color){
					if(players[j].playerCards[i].number == number){
						return players[j].playerNum;
					}
				}

			}

		}
}

// add rest players
function addRestPlayers(firstPlayer) {
	// case 3
	if(firstPlayer == 3){
		for(i=0; i<3; i++){
			playerOrder.push(i);
		}
		return playerOrder;	
	}

	// case 0
	else if(firstPlayer == 0) {
		for(i=firstPlayer + 1; i<players.length; i++){
			playerOrder.push(i);
		}
		return playerOrder;
	}
	// case 1, 2
	else {
		switch (firstPlayer) {
			case 1:
				return playerOrder = [1, 2, 3, 0];
			case 2:
				return playerOrder = [2, 3, 0, 1];
			default:
				console.log("fail in addRestPlayers");
		}
	}
}


// name cards
function getColor(color){
	switch(color){
		case 0:
			return "Treff";
		case 1:
			return "Káró";
		case 2:
			return "Kőr";
		case 3:
			return "Pikk";
		default:
			console.log("fail");
	}
}

function getNumber(number){
	switch(number){
		case 0:
			return "2";
		case 1:
			return "3";
		case 2:
			return "4";
		case 3:
			return "5";
		case 4:
			return "6";
		case 5:
			return "7";
		case 6:
			return "8";
		case 7:
			return "9";
		case 8:
			return "10"
		case 9:
			return "Bubi";
		case 10:
			return "Dáma";
		case 11:
			return "Király";
		case 12:
			return "Ász"
		default:
			console.log("fail");
	}
}

function shuffle(deck) {
  var currentIndex = deck.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = deck[currentIndex];
    deck[currentIndex] = deck[randomIndex];
    deck[randomIndex] = temporaryValue;
  }

  return deck;
}


function sortByColor(temparray) {
    let len = temparray.length-1;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len; j++) {
            if (temparray[j].color > temparray[j + 1].color) {
                let tmp = temparray[j];
                temparray[j] = temparray[j + 1];
                temparray[j + 1] = tmp;
            }
        }
    }
    return temparray;
};

function getCardColor(color){
		switch (color){
			case "Treff":
				return 0;
			case "Káró":
				return 1;
			case "Kőr":
				return 2;
			case "Pikk":
				return 3;
			default:
				console.log("fail");
		}
	}

function getCardNumber(number){
	switch(number){
		case "2":
			return 0;
		case "3":
			return 1;
		case "4":
			return 2;
		case "5":
			return 3;
		case "6":
			return 4;
		case "7":
			return 5;
		case "8":
			return 6;
		case "9":
			return 7;
		case "10":
			return 8;
		case "Bubi":
			return 9;
		case "Dáma":
			return 10;
		case "Király":
			return 11;
		case "Ász":
			return 12;
		default:
			console.log("fail");
		}
	}

	function removeCard(color, number){
		// loop players and their cards
		var len = players.length;
		for(j=0;j<len;j++){
			for(i=0;i<players[j].playerCards.length;i++){
				// remove card from players card list
				if(players[j].playerCards[i].color == color){
					if(players[j].playerCards[i].number == number){
						players[j].playerCards.splice(i, 1);
						// also remove from deck
						deck.splice(i, 1);
					}
				}

			}

		}
	}

function getPlayerOrder(color, number){
		var len = players.length;
		for(j=0;j<len;j++){
			for(i=0;i<players[j].playerCards.length;i++){
				// return player[i]
				if(players[j].playerCards[i].color == color){
					if(players[j].playerCards[i].number == number){
						return players[j].playerNum;
					}
				}

			}

		}
}

function splitDeck(){
		var i,j,temparray,chunk = 13, k=0;
		for (i=0,j=deck.length; i<j; i+=chunk) {
			// holds 13 cards
		    temparray = deck.slice(i,i+chunk);
		    temparray = sortByColor(temparray);
		    // add these 13 cards to players
		    players[k].playerCards = temparray;
		    k++;
		}
}

function drawBoard(){
	var id = 0;
	for(j=0;j<players.length;j++){
		id++;
		for(i=0;i<players[j].playerCards.length;i++){
			var li = document.createElement("li");

			var text = document.createTextNode(getColor(players[j].playerCards[i].color) + " " + getNumber(players[j].playerCards[i].number));

			li.appendChild(text);

			var addToDiv = document.getElementById("div" + id);
			addToDiv.appendChild(li);
		}
	}
}

function createCards(){
	for(i=0; i<4; i++){
		// create colors
		for(j=0; j<13; j++){
			// create 13 numbers
			deck.push(new Card(i,j));
		}
	}
}

function createPlayers(){
	for(i=0; i<4;i++){
		players.push(new Player(i));
	}
}

function appendStats (text) {
	var li = document.createElement("li");
	text = document.createTextNode(text);
	li.appendChild(text);
	var addToDiv = document.getElementById("gamestats");
	addToDiv.appendChild(li);
}
