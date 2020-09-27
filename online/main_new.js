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
let evalCards = new Array();
let cardsToReceiveByPlayer = new Array();
let originalPlayerOrder = new Array();
let winner;

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
	socket.emit('allPlayersJoined', "ALL PLAYERS HAVE JOINED");
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
						console.log(playerOrder);
						text = parseInt(playerOrder[0]+1) + " starts the round!";
						socket.broadcast.emit('firstplayer', text);
					})

					// ==================================================================================
					// game loop

					socket.on('playerPickedCard', function(data){
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
						console.log("Card picked by player is: " + pickedCard);
						// console.log("Card picked by player " + data.playerSocketID + " is: " + data.pickedCard);


					})					

function incrementRound(){
	return round += 1;
}

function getPlayOrder(winner){
	// define player order
	let firstPlayer;
	if(round == 1){
		firstPlayer = getPlayerOrder(0,0);
	} else {
		firstPlayer = winner;
	}
	playerOrder.push(firstPlayer);
	// add rest of players
	addRestPlayers(firstPlayer);
	text = round + " ROUND BEGINS! \n Player" + (firstPlayer + 1) + " starts!";
	socket.broadcast.emit('updateStats', text);
	}
})

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
  

server.listen(appPort);
