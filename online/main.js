// SETTING UP THE SERVER
var express=require("express");
var app=express();
var server=require("http").Server(app);
var io = require('socket.io')(server);
let appPort = process.env.PORT || 4200;

// FILE SERVER SECTION
app.get('/', (req, res) => {  
    res.sendFile(__dirname + '/html/index.html');
});
app.get('/game', (req, res) =>{  
    res.sendFile(__dirname + '/nevek.html');
});
app.get('/style.css', (req, res) => {
	res.sendFile(__dirname + "/" + "style.css");
  });
// serve all card images
var htmlPath = __dirname + '/' + 'html';
app.use(express.static(htmlPath));

// VARIABLES SECTION
// server specific variables
let clients = [];
let players = [];
let deck = [];
let connectionsLimit = 4;
// game specific variables
let playerOrder = [];
let cardsToReceiveByPlayer = [];
let originalPlayerOrder = [];
let evalCards = [];
let korElejenAtadottKartyak = 0;
let cycle = 0;
let round = 1;
let atadasiKor = true;
let canCallQofSpades = false;
let canCallHeart = false
let merre;
let winner;
let szin = null;
let allitottam = false;

// START OF SERVER-CLINt
io.sockets.on('connection', (socket) => {
	console.log("Server started");
		if (io.engine.clientsCount > connectionsLimit) {
		socket.emit('err', { message: 'reach the limit of connections' })
		socket.disconnect()
		console.log('Disconnected...')
		return
	  }
	  socket.emit('welcome', "welcome to the server!");

// listens for client ids with join and pushes them to array
// displays all ids in the black console
socket.on('join', (clientID) => {
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
socket.on('allPlayersJoined', () =>{
	text = "ALL PLAYERS HAVE JOINED";
	socket.emit('allPlayersJoined', text);
})

socket.on('chatMessage', (text)=>{
	message = text;
	io.of('/').emit('messageReceived', message);
})

socket.on('letTheGameBegin', () => {

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
socket.on('boardDrawn', () =>{
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

socket.on('playerPickedCard', (data) => {
	// check if current player has the card to call
	//let okPlayer = checkCard(getCardColor(data.pickedCard[0]), getCardNumber(data.pickedCard[1])); // returns player number of the player who picked a card
	let okPlayer = checkCard(data.pickedCard[0], data.pickedCard[1]); // pl. 0,0 for treff 2
	let currentPlayer = playerOrder[0]; // returns the current player
	if(okPlayer == currentPlayer){
		
		// meg kell még nézni, hogy a kiválasztott kártyát ki lehet-e játszani playerOrder[0]-nál
		console.log("allitottam if elott? " + allitottam)
		console.log("round: " + round)
		
		if(round == 1 && allitottam==false){
			console.log(allitottam)
			console.log("allitom a szint 0-ra");
			szin = 0; // treffel lehet kezdeni
			for(i=0; i<4; i++){
				for(j=0;j<13;j++){
					// megnézzük minden playernél, hogy van-e ilyen szine, és akkor csak azokbol hivhat
					//console.log("playwrs: " + players);
					//console.log("cards" + players[i].playerCards);
					if(players[i].playerCards[j].color==szin){
						players[i].lehetosegek.push({
							color: players[i].playerCards[j].color,
							number: players[i].playerCards[j].number
						})
					} else { // ha nincs, akkor az összes kártyáját hivhatja
						players[i].lehetosegek = [...players[i].lehetosegek, ...players[i].playerCards]
					}
				}
				console.log("lehetőségek: " + players[i].lehetosegek)
			}
			allitottam = true;
		} else {
			
			if(playerOrder.length == 4 && allitottam == false){
				szin = data.pickedCard[0];
				for(i=0; i<4; i++){
					for(j=0;j<13;j++){
						if(players[i].playerCards[j].color==szin){
							players[i].lehetosegek.push({
								color: players[i].playerCards[j].color,
								number: players[i].playerCards[j].number
							})
						} else { // ha nincs, akkor az összes kártyáját hivhatja
							players[i].lehetosegek = [...players[i].lehetosegek, ...players[i].playerCards]
						}
					}
				}


				allitottam = true;
			}
		}
		//console.log("a szin pedig: " + szin);
		// meg van a hivott szinünk

		text = data.pickedCard[0] + "-" + data.pickedCard[1] // 0-0 for treff 2";
		io.of('/').emit('onCorrectPlayerPick', text);
		// remove player
		playerOrder.shift();
		// add card for eval
		evalCards.push({
			color: parseInt(data.pickedCard[0]),
			number: parseInt(data.pickedCard[1])
			});
		// remove card
		removeCard(data.pickedCard[0], data.pickedCard[1]);
		// remove card from DOM
		io.to(data.myID).emit('removeCardfromDom', '');
		console.log("Deck len is: " + deck.length);
	} else {
		text = "Nem a te köröd van!";
		io.to(data.myID).emit('notYourTurn', text);
	}

	
	if(evalCards.length == 4){
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

socket.on("showPoints", (playerSocketID)=>{
	let pontok = [];
	for(i=0; i<4; i++){
		let points = 0;
		for(j=0; j<players[i].playerInventory.length; j++){
			if(players[i].playerInventory[j].color == 2){ // ha kőr
				points+=1;
			}
			else if(players[i].playerInventory[j].color == 3){ // ha pick dáma
				if(players[i].playerInventory[j].number==10){
					points+=13;
				}
			}
		}
		pontok.push(points);		
	}
	console.log(pontok);
	io.to(playerSocketID).emit('getPoints', pontok);
})
					// ==================================================================================
					// game loop

					// socket.on('playerPickedCard', function(data){
					// check if átadás kör
					// if(atadasiKor){
					// 	for(i=0; i<4;i++){
					// 		if(!players[i].cardsToPass.length == 0){
					// 			if(players[i].playerID==data.myID){
					// 				players[i].cardsToPass.push(getCardColor(data.pickedCard[0]), getCardNumber(data.pickedCard[1]));
					// 				korElejenAtadottKartyak += 1;
					// 			}
					// 		}

					// 	}
					// 	atadottKartya = data.pickedCard;
					// 	io.to(data.myID).emit('atadasKor', atadottKartya);
					// 	if(korElejenAtadottKartyak == 12){
					// 		// átadás mechanizmus
					// 		merre = getMerre();
					// 		if(merre == "BALRA"){
					// 			// elvesszük az átadott kártyákat
					// 			for(i=0; i<4; i++){
					// 				for(j=0; j<3; j++){
					// 					let index = players[i].playerCards.indexOf(players[i].cardsToPass[j]);
					// 					if (index > -1) {
					// 						players[i].playerCards.splice(index, 1);
					// 					}
					// 				}
					// 			}
							
					// 			// hozzáadjuk a kapott kártyákat
					// 			for(i=0; i<3; i++){
					// 				players[0].playerCards.push(players[1].cardsToPass[i]);
					// 				players[1].playerCards.push(players[2].cardsToPass[i]);
					// 				players[2].playerCards.push(players[3].cardsToPass[i]);
					// 				players[3].playerCards.push(players[0].cardsToPass[i]);
					// 			}
					// 			// removve cards to pass elements
					// 			for(i=0; i<4; i++){
					// 				players[i].cardsToPass=[];
					// 			}
					// 			atadasiKor = false;
					// 			socket.emit('atadasKesz', '')
					// 			}
							
					// 		if(merre == "JOBBRA"){

					// 		}
					// 		if(merre == "SZEMBE"){

					// 		}
					// 		if(merre == "SEHOVA"){

					// 		}

					// 	}
						
						// MÁR NEM ÁTADÁSI KÖR
						// } else {
							// socket.on('boardDrawn', function(){
					// 			getPlayOrder(winner);
					// 			playerOrder.length = 4;
					// 			console.log("Player order is : " + playerOrder + " round is: " + round);
								
					// 			for(i=0; i<playerOrder.length; i++){
					// 				originalPlayerOrder.push(playerOrder[i]);
					// 			}
					// 			originalPlayerOrder.length = 4;
					// 		//})



						
					// 	// end of round 1
					

					// 	// check if current player has the card to call
					// 	let okPlayer = checkCard(getCardColor(data.pickedCard[0]), getCardNumber(data.pickedCard[1])); // returns player number of the player who picked a card
					// 	let currentPlayer = playerOrder[0]; // returns the current player
					// 	if(okPlayer == currentPlayer){
					// 		console.log("Card picked by player " + data.myID + " is: " + data.pickedCard);
					// 		// text = "Player" + parseInt(playerOrder[0]+1) + " has picked " + data.pickedCard[0] + " " + data.pickedCard[1];
					// 		// io.of('/').emit('onCorrectPlayerPick', text);
					// 		text = "Player" + parseInt(playerOrder[0]+1) + ": " + data.pickedCard[0] + " " + data.pickedCard[1];
					// 		io.of('/').emit('onCorrectPlayerPick', text);
					// 		// remove player
					// 		playerOrder.shift();
					// 		console.log("Remaining player order: " + playerOrder.length);
					// 		console.log("Rest of playerOrder is: " + playerOrder);
					// 		// add card for eval
					// 		evalCards.push({
					// 			color: getCardColor(data.pickedCard[0]),
					// 			number: getCardNumber(data.pickedCard[1])
					// 			});
					// 		console.log("Eval len is: " + evalCards.length);
					// 		// remove card
					// 		removeCard(getCardColor(data.pickedCard[0]), getCardNumber(data.pickedCard[1]));
					// 		// remove card from DOM
					// 		io.to(data.myID).emit('removeCardfromDom', '');
					// 		console.log("Deck len is: " + deck.length);
					// 	} else {
					// 		text = "Nem a te köröd van!";
					// 		io.to(data.myID).emit('notYourTurn', text);
					// 	}

						
					// 	if(evalCards.length == 4){
					// 		console.log("winner is being ckecked");
					// 		winner = evalRound(evalCards);
					// 		// reset array
					// 		evalCards.length = 0;
					// 		io.of('/').emit('roundWinner', winner);
					// 	}
					// 	if(winner > -1){
					// 		if (playerOrder.length == 0) {
					// 			// increment round
					// 			incrementRound();
					// 			getPlayOrder(winner);
					// 			// keep record with original one to determine winner
					// 			originalPlayerOrder.length = 0;
					// 			for(i=0; i<playerOrder.length; i++){
					// 				originalPlayerOrder.push(playerOrder[i]);
					// 		   }
					// 		   originalPlayerOrder.length = 4;
					// 		   }
					// 		winner = 0;
					// 	}
					// 	if(deck.length == 0){
					// 		// game over
					// 		io.of('/').emit('gameOver', '');
					// 	}
					// })					

function incrementRound(){
	allitottam = false;
	return round += 1;

}

function evalRound(evalCards){
	j = 0;
	// console.log("Eval cards are: " + " " + evalCards[0].color + " " + evalCards[0].number + " " + evalCards[1].color + " " + evalCards[1].number + " " + evalCards[2].color + " " + evalCards[2].number + " " + evalCards[3].color + " " + evalCards[3].number);
	for(i=1; i<4; i++){
		if(evalCards[j].color == evalCards[i].color){
			if(evalCards[j].number < evalCards[i].number)
				j = i;
		}
	}
	//console.log("original player order is: " + originalPlayerOrder)
	winner = originalPlayerOrder[j];
	text = "Winner is: Player" + parseInt(winner+1);
	// console.log(text);
	// add won cards to player's inventory
	players[winner].playerInventory = [...players[winner].playerInventory, ...evalCards];
	console.log("Winner's inventory: " + players[winner].playerInventory);
	return winner;
}


function getMerre(){
	switch(cycle % 4){
		// Debug.Print 1 Mod 4 // 1
		// Debug.Print 2 Mod 4 // 2
		// Debug.Print 3 Mod 4 // 3
		// Debug.Print 4 Mod 4 // 0
		// Debug.Print 5 Mod 4 // 1
		case 1:
			console.log("getMerre")
			return "BALRA";
		case 2:
			console.log("getMerre")
			return "JOBBRA";
		case 3:
			console.log("getMerre")
			return "SZEMBE"
		case 0:
			console.log("getMerre")
			return "SEMERRE"
		default:
			console.log("fail in getMerre");
	}
	
}

function getPlayOrder(winner){
	if(playerOrder.length < 5){
		// define player order
		let firstPlayer;
		if(round == 1){
			if(playerOrder.length < 5){
				firstPlayer = getPlayerOrder(0,0);
				console.log(firstPlayer);
			}
		} else {
			firstPlayer = winner;
		}
		playerOrder.push(firstPlayer);
		// add rest of players
		addRestPlayers(firstPlayer);
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
		this.cardsToPass = [];
		this.lehetosegek = [];
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
