var express=require("express");
var app=express();
var server=require("http").Server(app);
var io = require('socket.io')(server);


let appPort = process.env.PORT || 4200;



// send main file when launching localhost app
app.get('/', function(req, res) {  
    res.sendFile(__dirname + '/index.html');
});

// server specific variables
let clients = [];
let players = [];
let deck = [];

// game specific variables
let round = 1;
let canCallQofSpades = false;
let canCallHeart = false
let playerOrder = new Array();
let cardsToReceiveByPlayer = new Array();
let originalPlayerOrder = new Array();
let winner;
let evalCards = [];

// logs to black console "server started"
// sends welcome message to be dispalyed in browser console
io.sockets.on('connection', function(socket){
	console.log("Server started");
	socket.emit('welcome', "welcome to the server!");

// listens for client ids with join and pushes them to array
// displays all ids in the black console
socket.on('join', function(clientID){
		console.log(clientID);
		clients.push(clientID);
		let counter = clients.length;
		console.log(counter);
		socket.emit('onePlayerJoined', counter);
		for(i=0; i<clients.length; i++){
			console.log("Player" + [i] + " is: " + clients[i]);
		}
	})

// notify client side browser console when all players have joined
socket.on('allPlayersJoined', function(){
	text = "ALL PLAYERS HAVE JOINED";
	socket.emit('allPlayersJoined', text);
})

socket.on('chatMessage', (text)=>{
	message = text;
	io.of('/').emit('messageReceived', message);
})

socket.on('letTheGameBegin', function(){

	// create players
	createPlayers();
	console.log("Players created: " + players.length);
	// shuffle cards in deck array
	shuffle(deck);
	// split deck to 4 slices
	splitDeck();
	for(i=0; i<players.length; i++){
		players[i].playerID = clients[i];
	}
	data = {
		players: players,
		clients:clients
	}
	for(i=0; i<clients.length; i++){
		io.to(players[i].playerID).emit('setupDone', data);
	}
	
})

// create player order for the first round
					socket.on('boardDrawn', function(){
						getPlayOrder(winner);
						playerOrder.length = 4;
						console.log("Player order is : " + playerOrder + " round is: " + round);
						
						for(i=0; i<playerOrder.length; i++){
							originalPlayerOrder.push(playerOrder[i]);
						}
						originalPlayerOrder.length = 4;
					})

					// ==================================================================================
					// game loop

					socket.on('playerPickedCard', function(data){
						// check if current player has the card to call
						let okPlayer = checkCard(getCardColor(data.pickedCard[0]), getCardNumber(data.pickedCard[1])); // returns player number of the player who picked a card
						let currentPlayer = playerOrder[0]; // returns the current player
						if(okPlayer == currentPlayer){
							console.log("Card picked by player " + data.myID + " is: " + data.pickedCard);
							text = "Player" + parseInt(playerOrder[0]+1) + " has picked " + data.pickedCard[0] + " " + data.pickedCard[1];
							io.of('/').emit('onCorrectPlayerPick', text);
							// remove player
							playerOrder.shift();
							console.log("Remaining player order: " + playerOrder.length);
							console.log("Rest of playerOrder is: " + playerOrder);
							// add card for eval
							evalCards.push({
								color: getCardColor(data.pickedCard[0]),
								number: getCardNumber(data.pickedCard[1])
								});
							console.log("Eval len is: " + evalCards.length);
							// remove card
							removeCard(getCardColor(data.pickedCard[0]), getCardNumber(data.pickedCard[1]));
							// remove card from DOM
							io.to(data.myID).emit('removeCardfromDom', '');
							console.log("Deck len is: " + deck.length);
						} else {
							text = "Nem a te köröd van!";
							io.to(data.myID).emit('notYourTurn', text);
						}

						
						if(evalCards.length == 4){
							console.log("winner is being ckecked");
							winner = evalRound(evalCards);
							// reset array
							evalCards.length = 0;
							io.of('/').emit('roundWinner', winner);
						}
						if(winner > -1){
							if (playerOrder.length == 0) {
								// increment round
								incrementRound();
								getPlayOrder(winner);
								// keep record with original one to determine winner
								originalPlayerOrder.length = 0;
								for(i=0; i<playerOrder.length; i++){
									originalPlayerOrder.push(playerOrder[i]);
							   }
							   originalPlayerOrder.length = 4;
							   }
							winner = 0;
						}
						if(deck.length == 0){
							// game over
							io.of('/').emit('gameOver', '');
						}
					})					

function incrementRound(){
	return round += 1;
}

function evalRound(evalCards){
	j = 0;
	for(i=1; i<4; i++){
		if(evalCards[j].color == evalCards[i].color){
			if(evalCards[j].number < evalCards[i].number)
				j = i;
		}
	}
	console.log("original player order is: " + originalPlayerOrder)
	winner = originalPlayerOrder[j];
	text = "Winner is: Player" + parseInt(winner+1);
	console.log(text);
	return winner;
}


function getPlayOrder(winner){
	console.log("in getPlayOrder " + playerOrder.length + "winner: " + winner);
	if(playerOrder.length < 5){
		// define player order
		let firstPlayer;
		if(round == 1){
			if(playerOrder.length < 5){
				firstPlayer = getPlayerOrder(0,0);
				console.log(firstPlayer);
			}

		} else {
			console.log("ok, not first round");
			firstPlayer = winner;
			console.log("new firstPlayer is: " + firstPlayer);
		}
		playerOrder.push(firstPlayer);
		// add rest of players
		addRestPlayers(firstPlayer);
		console.log("new playerOrder is: " + playerOrder);
		text = round + " ROUND BEGINS! Player" + (firstPlayer + 1) + " starts!";
		io.of('/').emit('newRound', text);
		} else {
			console.log("playerorder already more than 4");
		}
	}

})

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

function getPlayerOrder(color, number){
	var len = players.length;
	for(j=0;j<len;j++){
		for(i=0;i<players[j].playerCards.length;i++){
			if(players[j].playerCards[i].color == color){
				if(players[j].playerCards[i].number == number){
					return players[j].playerNum;
				}
			}

		}

	}
	console.log("playerorder from getplayerorder: " + playerOrder)
}

class Card {
	constructor(color, number) {
		this.color = color;
		this.number = number;
	}	
}

// create player class
class Player {
	constructor(playerNum) {
		this.playerID;
		this.playerNum = playerNum;
		this.playerCards = [];
		this.playerInventory = [];
		this.playerName;
	}
}

//create cards
createCards();
console.log("Deck created with: " + deck.length);

function createCards(){
	for(i=0; i<4; i++){
		// create colors
		for(j=0; j<13; j++){
			// create 13 numbers
			deck.push(new Card(i,j));
		}
	}
	return deck;
}

function createPlayers(){
	for(i=0; i<4;i++){
		players.push(new Player(i));
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
  
function checkCard(color, number){
	// loop players and their cards
	var len = players.length;
	for(j=0;j<len;j++){
		for(i=0;i<players[j].playerCards.length;i++){
			// check if correct player has the card
			if(players[j].playerCards[i].color == color){
				if(players[j].playerCards[i].number == number){
					return players[j].playerNum;
				}
			}

		}

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

server.listen(appPort);
