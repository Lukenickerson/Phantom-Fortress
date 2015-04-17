
/* === Generic Helper Stuff (can be reused) === */

var GameHelperClass = function () {
	this.getRandomNumber = function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
}
window.gameHelper = new GameHelperClass();


/* === Phantom Fort/Fortress Game === */

var PFGameClass = function () 
{
	this.isLooping 		= false;
	this.loopTimer 		= 0;
	this.loopIteration 	= 0;
	this.lastTime 		= 0;
	//==== Loop timing Constants
	this.loopDelay		= 14;
	// ^ Decrease for more fps
	// 1000 = 1 second
	// 100 = 1/10th of a second
	// 16 = 1/?th of a second = 62.5 fps (closest to 60 fps)
	// 10 = 1/100th of a second (better than 60 fps)
	// Needs to be less than 16 to accomodate for the time it takes to run the loop 'stuff'
	this.framesPerSecond = (1000 / this.loopDelay);
	this.secondsPerLoop	= (this.loopDelay / 1000);
	// Update certain things once every X iterations
	this.loopModulus	= Math.round(this.framesPerSecond); // once per second
	this.loopModulusAction	= Math.round(this.framesPerSecond / 2); // twice per second
	
	//==== Static Data
	this.data = {	// Get from JSON data
		"floors" 	: {}
		,"goons"	: {}
		,"invaders" : {}
		/*
		"upgrades" 	: {}
		,"groups"	: {}
		*/
	};
	this.version = "0.56";
	//==== Game Data
	this.game = {
		"floorKeyCounter" : 0
		,"floors" : {
			"F0" : {
				"floorTypeId" : 0
				,"goonKeyArray" : ["G0"]
				,"invaderKeyArray" : []
				,"naturalResources" : {}
			}
		
		}
		,"floorArray" : ["F0"] //2,2,2,2,2,2,2,2]
		,"goonKeyCounter" : 0
		,"goons" : {
			"G0" : {		// The Phantom Lord
				"key"			: "G0"
				,"goonTypeId" 	: 0
				,"$elt" 		: {}
				,"facing" 		: "right"
				,"locomotionVelX" : 0.1
				,"locomotionVelY" : 0
				,"externalVelX" : 0
				,"externalVelY" : 0
				,"x" : 0
				,"y" : 0
				//,"width" : 170
				,"floorKey" : "0"
				,"isOutside" : false
				,"hp"		: 30
				,"damage"	: 2
				,"isDead"	: false
				,"isImmortal" : true
				,"isGoon"	: true
			}
		}
		,"invaderKeyCounter" : 0
		,"invaders" : {
		
		}
		,"challenge" 	: 5	// How many extra invaders
		,"totalDeaths" 	: 0
		,"totalKills"	: 0
		/*
		,
		"upgrades" : {
			//"industry" : [], "politics" : [], "media" : []
		}
		*/
	};
	
	//==== Constants, Lookups
	this.currencyTypes = ["gold","souls","arcane","stone","ore","food"];
	this.currencyTypeLongNames = {
		"gold"		: "Gold"
		,"souls" 	: "Soul Shards"
		,"arcane" 	: "Arcane Knowledge"
		,"stone"	: "Stone"
		,"ore"		: "Ore"
		,"food"		: "Food"
	};
	//==== Zoom and Sizing
	this.zoom = 0;
	this.floorHeightByZoom = [160, 120, 80, 40];
	this.floorWidthByZoom = [600, 450, 300, 150];
	this.floorMeleeRangeByZoom = [100, 75, 50, 25];
	this.movementByZoom = [40, 30, 20, 10];
	this.floorHeight = this.floorHeightByZoom[this.zoom];
	this.floorWidth = this.floorWidthByZoom[this.zoom];
	this.meleeRange = this.floorMeleeRangeByZoom[this.zoom];
	this.movementRange = this.movementByZoom[this.zoom];
	
	//==== Selections
	this.selectedFloorKey = "";
	
	//==== Calculated Game Data
	this.topFloorsCount = 0;
	this.bottomFloorsCount = 0;
	this.totalFloorCount = 0;
	this.maxInvaders = 1;
	this.total = {
		"gold"		: 300
		,"souls" 	: 30
		,"arcane" 	: 0
		,"stone"	: 0
		,"ore"		: 0
		,"food"		: 0
	};
	this.currencyTotal = 0;
	this.perSecond = {
		"gold"		: 0
		,"souls" 	: 0
		,"arcane" 	: 0
		,"stone"	: 0
		,"ore"		: 0
		,"food"		: 0
	};
	
	/* // Use to calibrate the 1-second tick
	this.oneSecond = function () {
		console.log("1 second");
		var o = this;
		window.setTimeout(function(){ o.oneSecond() }, 1000);
	}
	this.oneSecond();
	*/
	

	//=============================================== MAIN LOOP
	
	this.loop = function() {
		var o = this;
		//console.log("loop");
	
		o.total.gold 	+= (o.perSecond.gold * o.secondsPerLoop);
		o.total.souls 	+= (o.perSecond.souls * o.secondsPerLoop);
		o.total.arcane 	+= (o.perSecond.arcane * o.secondsPerLoop);
		o.total.stone 	+= (o.perSecond.stone * o.secondsPerLoop);
		o.total.ore 	+= (o.perSecond.ore * o.secondsPerLoop);
		o.total.food 	+= (o.perSecond.food * o.secondsPerLoop);
		
		o.moveGoons();
		o.moveInvaders();
		
		// Update every half second or so... For action...
		if ((o.loopIteration % o.loopModulusAction) == 0) {
			//console.log("Combat Round ~0.5/second");
			o.doCombatRound();
			o.displayTotals();
		}
		
		// Update these only every second or so... 
		if ((o.loopIteration % o.loopModulus) == 0) {
			console.log("Loop tick ~1/second");
			o.calculatePerSecondValues();
			
			for (var goonKey in o.game.goons) {
				var goon = o.game.goons[goonKey];
				if (!goon.isDead) {
					var r = o.roll1d(100);
					if (r == 1) {
						
						o.turnToon(goon);
						goon.locomotionVelX = o.getRandomVelocity(goon.facing);
					} else if (r == 2) {
						goon.locomotionVelX = o.getRandomVelocity(goon.facing);
					}
				}
			}

		} else if (((o.loopIteration + 2) % o.loopModulus) == 0) {
			
			if (o.roll1d(15) == 1) {
				o.addInvader();
			}
			

		} else if (((o.loopIteration + 4) % o.loopModulus) == 0) {
			
			o.clearDead();
			
			if (o.total.gold < 0) 	o.total.gold = 0;
			if (o.total.souls < 0) 	o.total.souls = 0;
			if (o.total.arcane < 0) o.total.arcane = 0;
			if (o.total.stone < 0) 	o.total.stone = 0;
			if (o.total.ore < 0) 	o.total.ore = 0;
			if (o.total.food < 0) 	o.total.food = 0;

			// note: currency total won't be exactly up-to-date, only updated ~every second.
			o.currencyTotal = o.total.gold + o.total.souls + o.total.arcane 
				+ o.total.stone + o.total.ore + o.total.food;			
		}
		
	
		if (o.isLooping) {
			o.loopIteration++;
			if (o.loopIteration < 15000000) {
				o.loopTimer = window.setTimeout(function(){
					o.loop();
				}, o.loopDelay); 
			} else {
				o.notify("Game paused");
			}
		}
	}

	this.startLoop = function() {
		this.loopIteration = 0;
		this.isLooping = true;
		this.loop();
	}
	
	this.stopLoop = function() {
		this.loopIteration = 0;
		this.isLooping = false;
		clearTimeout(this.loopTimer);
	}

	//=============================================== TOWER MAP CALC, REFRESH, DISPLAY
	
	this.drawTower = function (isAnimated)
	{
		console.log("Drawing Tower");
		//console.log(this.data.floors);	console.log(this.game.floors);
		var h = "";
		//var foundGroundFloor = false;
		
		// Loop through all constructed rooms of the tower
		for (var f in this.game.floorArray) {
			var floorKey = this.game.floorArray[f];
			var floorObj = this.game.floors[floorKey];
			var floorTypeObj = this.data.floors[floorObj.floorTypeId];
			h += '<div class="floor viewFloor floor_' + floorTypeObj.name + ' floorKey' + floorKey + '" '
				+ ' data-floorkey="' + floorKey + '">'
				//+ 'Floor Key: ' + floorKey
				//+ ' floor number ' + f + '-' 
				+ '<span class="floorName">' + floorTypeObj.name + '</span>';
			if (typeof floorObj.naturalResources === "object") {
				h += '<div class="naturalResourcesIndicator">';
				for (var n in floorObj.naturalResources) {
					var amount = floorObj.naturalResources[n];
					if (amount > 0) {
						var properN = this.getProperCase(n);
						h += '<span class="nrNum nr' + properN + 'Num">' + amount + '</span>'
							+ '<span class="currencyIcon icon_' + n + '">'
							+ '<span>' + properN + '</span></span>';
					}
				}
				h += '</div>';
			}
			h += '</div>';
			//if (floorTypeObj.name == "Base") foundGroundFloor = true;
			//if (foundGroundFloor == true) {
			//	this.bottomFloorsCount++;
			//} else {
			//	this.topFloorsCount++;
			//}
		}
		// Add top and bottom
		h = '<div class="floorEdge floorTop">Build Up</div>' + h + '<div class="floorEdge floorBottom">Build Down</div>';
		this.$floors.html(h);
		
		// Get Y coords of the base and adjust the ground
		var $base = this.$floors.find('.floor_Base');
		if ($base.length == 0) {
			this.notify("ERROR: Base floor not found!");
			console.log($base);
			console.log(this.$floors);
		}
		var basePos = $base.offset();
		var groundHeight = basePos.top + this.floorHeight;
		this.$ground.css("top", groundHeight /* - 10 */);
		
		// Get full height and set this to the tower height
		var totalFloorsHeight = ((this.game.floorArray.length + 2) * this.floorHeight);
		this.$floors.css("height", totalFloorsHeight);
		if (typeof isAnimated === "boolean" && isAnimated) {
			this.$tower.css("height", 0).animate({ "height" : (totalFloorsHeight + 400 ) }, 3000);
		} else {
			this.$tower.css("height", (totalFloorsHeight + 400 )); // 
		}
		
		// Next step: populate the tower with things...
		this.populateTower();
	}
	
	this.populateTower = function ()
	{
		console.log("Populating the Tower with goons and invaders...");
		// Loop through all constructed rooms of the tower
		for (var f in this.game.floorArray) {
			var floorKey = this.game.floorArray[f];
			var floor = this.game.floors[floorKey];
			var $floor = this.$floors.find('.floorKey' + floorKey);
			//=== Add Goons to the DOM
			$floor.find(".goon").remove();
			//console.log("Floor " + floorKey + " workerGoonKeyArrray: [" + floor.goonKeyArray + "]");
			for (var i in floor.goonKeyArray) {
				var goonKey = floor.goonKeyArray[i];
				var goon = this.game.goons[goonKey];
				if (typeof goon !== "undefined") {
					var goonType = this.data.goons[goon.goonTypeId];
					this.setToon$Elt(goon, goonType).appendTo($floor);
				}
			}
			//=== Add Invaders to the DOM
			$floor.find(".invader").remove();
			for (var i in floor.invaderKeyArray) {
				var invKey = floor.invaderKeyArray[i];
				var invader = this.game.invaders[invKey];
				if (typeof invader !== "undefined") {
					var invaderType = this.data.invaders[invader.invaderTypeId];
					this.setToon$Elt(invader, invaderType).appendTo($floor);
				}
			}			
			//console.log($floor.html());
		}
		
		// *** Loop through piles
	}
	
	this.setToon$Elt = function (toon, toonType) 
	{
		//console.log(toon);
		//var toonMainType = (toon.isGoon) ? "goon" : "invader";
		if (toon.isGoon) {
			var toonMainType = "goon";
			var toonKey = toon.key;
		} else {
			var toonMainType = "invader";
			var toonKey = toon.key;		
		}
		//console.log("Setting Toon Element : " + toonMainType);
		var toonTypeName = this.removeSpaces(toonType.name);
		var h = '<div class="'
			+ ' ' + toonMainType
			+ ' ' + toon.facing + 'Facing'
			+ ' ' + toonMainType + '_' + toonTypeName 
			+ ((toon.isDead) ? ' dead ' : '')
			+ '" '
			+ ' data-' + toonMainType + 'key="' + toonKey + '">'
			+ toonType.name
			+ '</div>';
		toon.$elt = $(h);
		return toon.$elt;
	}
	
	this.removeSpaces = function (t) {
		return t.replace(/\s+/g, ''); // Remove spaces
	}
	
	this.calculateFloorsCounts = function ()
	{
		var foundGroundFloor = false, t = 0, b = 0, fIndex = 0;
		this.totalFloorCount = 0;
		// Loop through all constructed rooms of the tower
		for (fIndex in this.game.floorArray) {
			var floorKey = this.game.floorArray[fIndex];
			var floorObj = this.game.floors[floorKey];
			var floorTypeObj = this.data.floors[floorObj.floorTypeId];
			if (floorTypeObj.name == "Base") foundGroundFloor = true;
			else {
				if (foundGroundFloor == true) {
					b++;
				} else {
					t++;
				}
			}
			this.totalFloorCount++;
		}
		this.bottomFloorsCount = b;
		this.topFloorsCount = t;
	}
	
	this.getCurrencyHtml = function (cost)
	{
		//console.log("getCurrencyHtml..."); console.log(JSON.stringify(cost));
		var h = "";
		for (var c in cost) {
			var currencyLongName = this.currencyTypeLongNames[c];
			h += ' <span class="currNum ' + c + 'Num">' 
				+ cost[c] 
				+ '</span><span class="currencyIcon icon_' + c + '">'
				+ currencyLongName + '</span>';
		}
		return h;
	}
	
	this.selectFloor = function (floorKey) 
	{
		this.selectedFloorKey = floorKey;
		var floorObj = this.game.floors[floorKey];
		var $floor = this.$floors.find('.floorKey' + floorKey);
		console.log("Selecting floor " + floorKey);
		this.$floors.removeClass("selected");
		$floor.addClass("selected");
	}
	
	this.deselectFloor = function (floorKey) {	
		console.log("DESelecting floors");
		this.selectedFloorKey = "";
		this.$floors.children('div').removeClass("selected");
	}

	//======== Pop-up Menus / Floor Controls ====================================\\
	
	this.viewFloor = function (floorKey, top, left) 
	{
		var floorObj = this.game.floors[floorKey];
		var floorTypeObj = this.data.floors[floorObj.floorTypeId];
		var $floorAvailability = this.$floorMenu.find('.floorAvailability').hide();
		var $floorWorkers = this.$floorMenu.find('.floorWorkers');
		var $floorNR = this.$floorMenu.find('.naturalResources');
		var availHtml = "", workersHtml = "", nrHtml = "";
		var workerCount = floorObj.goonKeyArray.length;
		var availCount = floorTypeObj.workerSpaces - workerCount;
		if (typeof floorTypeObj.workerSpaces === 'undefined') floorTypeObj.workerSpaces = 0;
		
		$('.workerCount').html( workerCount + "/" + floorTypeObj.workerSpaces);
		
		// Disable buttons that can't be used
		if (availCount > 0) {
			this.$floorMenu.find('.buttonAddWorker').removeClass("disabledButton");
		} else {
			this.$floorMenu.find('.buttonAddWorker').addClass("disabledButton");
		}
		if (floorKey == "F0") {
			this.$floorMenu.find('.buttonRebuild').addClass("disabledButton");
		} else {
			this.$floorMenu.find('.buttonRebuild').removeClass("disabledButton");
		}		
		
		if (floorTypeObj.workerSpaces == 0) {
			availHtml = '<p>This floor does not have space for workers.</p>';
		} else {
			if (typeof floorObj.goonKeyArray === 'undefined') floorObj.goonKeyArray = [];
			
			
			//console.log("Worker Count: " + workerCount + ", Available Count: " + availCount);
			
			for (var i = 0; i < availCount; i++) {
				availHtml += '<li class="emptyWorkerSpace viewAssignWorker" '
					+ ' data-floorkey="' + floorKey + '" >'
					+ 'Worker Needed</li>';
			}			
			for (var i = 0; i < workerCount; i++) {
				var workerGoon = this.game.goons[floorObj.goonKeyArray[i]];
				var goonName = this.data.goons[workerGoon.goonTypeId].name;
				workersHtml += '<li>' + goonName  // + ' {view} / {dismiss}'
					+ '</li>';
			}
		}
		//console.log(workersHtml);
		
		this.$floorMenu.find('h1.floorName').html(floorTypeObj.name);
		this.$floorMenu.find('.floorDescription').html(floorTypeObj.description);
		if (availHtml != "") {
			$floorAvailability.children('ul').html(availHtml);
		}
		if (workersHtml != "") {
			$floorWorkers.children('ul').html(workersHtml);
		}
		console.log("floorObj.naturalResources");
		console.log(floorObj.naturalResources);
		for (var n in floorObj.naturalResources) {
			nrHtml += '<li>' + floorObj.naturalResources[n] + ' ' + n + '</li>';
		}
		if (nrHtml != "") {
			$floorNR.children('ul').html( nrHtml );
		} else {
			$floorNR.children('ul').html( '<li>None</li>' );
		}
		this.$floorMenu.css({"top" : top, "left" : left}).slideDown(200);
	}

	
	this.viewFloorPurchase = function (top) 
	{
		var o = this;
		var floorKey = o.selectedFloorKey;
		if (floorKey == "F0") {
			o.notify("Cannot rebuild the base floor.");
			return;
		}
		var h = "";
		var $floorList = this.$floorPurchase.find("ul").empty();
		var floorType = {};
		var isTop = o.isFloorOnTop(floorKey);
		console.log(floorKey);
		var cost = {};
		var affordableClass = "";
		var $li = {};
		// Loop over all floor types
		for (var floorTypeId in o.data.floors) {
			floorType = o.data.floors[floorTypeId];
			if (!floorType.forSale) {
				// Not for sale
			} else if (isTop && floorType.isBottomOnly || !isTop && floorType.isTopOnly) {
				// Cannot build here
			} else {
				cost = o.getFloorCost(floorType);
				affordableClass = (o.canAfford(cost)) ? "canAfford" : "cannotAfford";
				h = '<li class="buyFloor ' + affordableClass + '" '
					+ ' data-floortypeid="' + floorTypeId + '"'
					+ ' data-istop="' + isTop + '"'
					+ '>'
					+ '<span class="floorName">' + floorType.name + '</span>'
					// *** replace space with ...?
					+ '<div class="floorPreview floor_' + floorType.name + '"></div>';
				h += '<br class="clear" />' + o.getCurrencyHtml(cost);

				h += ' <span class="floorDescription">' + floorType.description + '</span>';
					//+ ' <button type="button" class="buyFloor">Buy Floor</button>'
					+ '</li>';
				$li = $(h);
				// Add click event for purchasing
				$li.click(function(e){
					var $this = $(this);
					var floorTypeId = $this.data("floortypeid");
					var isTop = $this.data("istop");
					o.buyFloor(floorKey, floorTypeId);
					e.preventDefault();
				});
				$li.appendTo( $floorList );
			}
		}
		//h = '<ul class="blockList">' + h + '</ul>';
		//h += '<button type="button" class="closePopUp">X</button>';
		//this.$floorPurchase.find("ul").html(h);
		o.$floorPurchase
			.css({ "left": 0, "top" : top, "opacity" : 1 })
			.fadeIn(100);
	}
	
	this.canAfford = function (cost) {
		if (cost.gold > this.total.gold) return false;
		if (cost.stone > this.total.stone) return false;
		return true;
		
	}
	
	this.buyFloor = function (floorKey, floorTypeId) 
	{
		var o = this;
		var floorType = o.data.floors[floorTypeId];
		var cost = o.getFloorCost(floorType);
		if (o.canAfford(cost)) {
			for (var c in cost) {
				o.eraseCurrency(c, cost[c]);
			}
			o.game.floors[floorKey].floorTypeId = floorTypeId;
			console.log("Swapping floor, key = " + floorKey + ", floorTypeId = " + floorTypeId); 
			o.drawTower();
		} else {
			o.notify("You cannot afford this floor yet.");
		}
		o.$floorPurchase.animate({
			"left" : 3000
			,"opacity" : 0
		}, 500, function(){
			o.$floorPurchase.hide();
		});
	}
	
	this.viewBuilder = function (isTop, top, left) 
	{
		var o = this;
		// *** get cost
		//var h = "[show cost] Build Yes / No?";
		var floorTypeId = (isTop) ? 1 : 2; // HARD CODED: 1=Empty, 2=Tunnel
		var floorType = o.data.floors[floorTypeId];
		// Add event for clicking "Yes, build"
		o.$floorBuilder.find('.buildNewFloor').off("click").on("click", function(e){
			o.buildNewFloor(floorTypeId, isTop);
			o.$floorBuilder.fadeOut(200);
		});
		// Add cost info
		var floorCost = o.getFloorCost(floorType, true, isTop);
		o.$floorBuilder.find('.cost').html( o.getCurrencyHtml(floorCost) );
		// Show builder pop-up
		o.$floorBuilder.css({ "top" : top, "left" : left }).fadeIn(200);
	}	
	
	this.buildNewFloor = function (floorTypeId, isTop) 
	{
		var o = this;
		var floorType = o.data.floors[floorTypeId];
		var cost = o.getFloorCost(floorType, true, isTop);
		if (o.canAfford(cost)) {
			for (var c in cost) {
				o.eraseCurrency(c, cost[c]);
			}
			// Add floor to game data
			o.game.floorKeyCounter++;
			var newFloorKey = "F" + o.game.floorKeyCounter.toString();
			o.game.floors[newFloorKey] = {
				"floorTypeId" : floorTypeId
				,"goonKeyArray" : []
				,"invaderKeyArray" : []
				,"naturalResources" : {}
			};
			console.log("Adding floor, key = " + newFloorKey + ", isTop = " + isTop); 
			if (isTop) {
				o.game.floorArray.unshift(newFloorKey);
			} else {
				o.game.floorArray.push(newFloorKey);
				var nr = {
					"stone" : 50 + (o.roll1d(9) * 50) // 100-500
					//,"ore"	: 0
					//,"gold"	: 0
				};
				if (o.game.floorArray.length == 2) nr.gold = 250;
				if (o.roll1d(3) == 1) nr.ore = (o.roll1d(10) * 50); // 50 - 500
				if (o.roll1d(5) == 1) nr.gold = (o.roll1d(6) * 50); // 50 - 300
				
				o.game.floors[newFloorKey].naturalResources = nr;
			}
			//console.log(o.game.floors[newFloorKey]);
			o.drawTower();
			
		} else {
			o.notify("You cannot afford this floor yet.");
		}
		this.calculateFloorsCounts();
		o.$floorPurchase.animate({
			"left" : 3000
			,"opacity" : 0
		}, 500, function(){
			o.$floorPurchase.hide();
		});
	}
	
	this.getFloorCost = function (floorType, isNewFloor, isTop)
	{
		var finalCost = {};
		this.calculateFloorsCounts();
		this.calculateFloorsCounts();
		// Are we building a new floor?
		if (typeof isNewFloor === 'boolean' && isNewFloor) {
			//console.log("isTop=" + isTop + ", " + this.topFloorsCount + ", " + this.bottomFloorsCount);
			// Get cost based on distance from ground floor 
			var floorCount = (isTop) ? this.topFloorsCount : this.bottomFloorsCount;
			var g = floorType.cost.gold;
			finalCost.gold = g + (g * 0.9 * floorCount);
			if (isTop) { 
				finalCost.stone = 100 + (40 * floorCount);
			}
		} else {
		// Not building a new floor, just remodeling
			finalCost = this.cloneDataObject(floorType.cost);
			// Make it cost slightly more as the # of floors increases
			// *** calibrate this
			// *** maybe make it more expensive the more you have of each floor type
			finalCost.gold += 10 * this.totalFloorCount;
		}
		return finalCost;
	}
	
	this.isFloorOnTop = function (floorKey) 
	{
		var isTop = true;
		var iterativeFloorTypeId = -1;
		var floorNum = this.game.floorArray.length;
		for (var i = 0; i < floorNum; i++) {
			iterativeFloorKey = this.game.floorArray[i];
			if (iterativeFloorKey == floorKey) {
				return isTop;
			} else if (iterativeFloorKey == "F0") {
				isTop = false;
				//return isTop; // safe to default to top?
			}
		}
		//console.error("Floor " + floorKey + " not found");
		return isTop;
	}
	
	
	//=======================================================================\\
	//============================================ TOONS: GOONZ & INVADERS
	
	this.viewGoon = function (goonKey) 
	{
		var h = "";
		// ***
		h += goonKey;
		this.$goonInfo.find('div').html(h);
		this.$goonInfo.slideDown(200);
	}
	
	this.viewGoonAssignment = function (floorKey, top)
	{
		if (typeof floorKey === 'undefined') floorKey = this.selectedFloorKey;
		console.log("View goons to assign to " + floorKey);
		var h = ""
		for (var goonId in this.data.goons) {
			var goonType = this.data.goons[goonId];
			if (goonType.forSale) {
				var toonTypeNameSpaceless = this.removeSpaces(goonType.name);
				h += '<li class="buyGoon goon_' + toonTypeNameSpaceless + '" '
					+ ' data-floorkey="' + floorKey + '" '
					+ ' data-goontypeid="' + goonId + '" '
					+ '>'
					+ '<span class="goonName">' + goonType.name + '</span>';
				//console.log(goonType);	
				h += this.getCurrencyHtml(goonType.cost);
				h += '</li>';
			}
		}
		// *** List additional unassigned goons
		// *** List working goons that can be re-assigned
		this.$goonAssign.find('ul').html(h);
		this.$goonAssign.css({ "top" : top }).slideDown(200);
	
	}
	
	this.isRoomForWorkers = function (floorKey) 
	{
		var floor = this.game.floors[floorKey];
		var floorType = this.data.floors[floor.floorTypeId];
		return (floorType.workerSpaces > floor.goonKeyArray.length);
	}
	
	this.buyGoon = function (goonTypeId, floorKey)
	{
		var o = this;
		if (typeof floorKey === 'undefined') floorKey = o.selectedFloorKey;
		if (o.isRoomForWorkers(floorKey)) {
			var goonTypeObj = o.data.goons[goonTypeId];
			var canAfford = true;
			for (var currency in goonTypeObj.cost) {
				if (o.total[currency] < goonTypeObj.cost[currency]) canAfford = false;
			}
			
			if (canAfford) {
				// Remove all payments
				for (var currency in goonTypeObj.cost) {
					o.eraseCurrency(currency, goonTypeObj.cost[currency]);
				}
				o.addGoon(goonTypeId, floorKey);

				o.$goonAssign.slideUp();		
				
				o.drawTower();
			} else {
				o.notify("You cannot afford this goon.");
			}
		} else {
			o.notify("No more room for goon workers.");
		}
	}
	
	this.addGoon = function (goonTypeId, floorKey) 
	{
		if (Object.keys(this.game.goons).length > 100) return false;
		if (typeof floorKey === 'undefined') floorKey = o.selectedFloorKey;
		var goonType = this.data.goons[goonTypeId];
		// Add goon to game data
		this.game.goonKeyCounter++;
		var newKey = "G" + this.game.goonKeyCounter.toString();
		var faceWhere = ((this.roll1d(2) == 2) ? "left" : "right");
		this.game.goons[newKey] = {
			"key"			: newKey
			,"goonTypeId" 	: goonTypeId
			,"$elt" 		: {}
			,"facing" 		: faceWhere
			,"x" : 0
			,"y" : 0
			//,"width" : ???
			,"locomotionVelX" 	: this.getRandomVelocity(faceWhere)
			,"locomotionVelY" 	: 0
			,"externalVelX" 	: 0
			,"externalVelY" 	: 0			
			,"floorKey" 	: floorKey
			,"isOutside" 	: false
			,"hp"			: goonType.hitPoints
			,"isDead"		: false
			,"damage"		: goonType.damage
			,"isGoon"		: true
		};
		console.log("Adding goon, key = " + newKey + ", goonTypeId = " + goonTypeId + ", to floorKey = " + floorKey);

		// Add goon as a worker to this floor
		this.game.floors[floorKey].goonKeyArray.push(newKey);
		
		return true;		
	}
	
	this.addInvader = function (invaderTypeId) 
	{
		// Calculate the max invaders possible
		var numberOfFloors = Object.keys(this.game.floors).length;
		this.maxInvaders = 1 + (numberOfFloors / 3) + (this.currencyTotal / 1000) + this.game.challenge;
		if (Object.keys(this.game.invaders).length > this.maxInvaders) return false;
		
		// If not specified, then find a random invader type
		if (typeof invaderTypeId !== 'numeric') {
			invaderTypeId = this.roll1d(this.data.invaders.length) - 1;
		}
		var invaderType = this.data.invaders[invaderTypeId];
		
		// Add invader to game data
		this.game.invaderKeyCounter++;
		var newKey = "I" + this.game.invaderKeyCounter.toString();
		this.game.invaders[newKey] = {
			"key"			: newKey
			,"invaderTypeId" : invaderTypeId
			,"$elt" 		: {}
			,"facing" 		: "left"
			,"x" : 2000
			,"y" : 0
			,"locomotionVelX" 	: this.getRandomVelocity("left")
			,"locomotionVelY" 	: 0
			,"externalVelX" 	: 0
			,"externalVelY" 	: 5			
			,"floorKey" 	: "F0"
			,"isOutside" 	: true
			,"hp"			: invaderType.hitPoints
			,"isDead"		: false
			,"damage"		: invaderType.damage
			,"isGoon"		: false
		};
		console.log("Adding invader, key = " + newKey + ", invaderTypeId = " + invaderTypeId); 
		
		// Invader always starts on the base floor
		this.game.floors["F0"].invaderKeyArray.push(newKey);
		this.populateTower();
		
		return true;		
	}	
	
	//=============================================== MOVEMENT ========================
	
	this.getRandomSpeed = function () {
		var baseSpeed = 0.3;
		var randomSpeed = this.roll1d(this.movementRange) / 10;
		return (baseSpeed + randomSpeed);
	}
	this.getRandomVelocity = function (facing) {
		if (typeof facing === 'string') {
			var dir = (facing == "left") ? -1 : 1;
		} else {
			var dir = (this.roll1d(2) == 2) ? -1 : 1;
		}
		return (dir * this.getRandomSpeed());
	}
	
	
	this.moveGoons = function ()
	{
		for (var goonKey in this.game.goons) {
			var goon = this.game.goons[goonKey];
			var goonType = this.data.goons[goon.goonTypeId];
			this.moveToon(goon, goonType);
		}
	}
	
	this.moveInvaders = function ()
	{
		for (var invaderKey in this.game.invaders) {
			var invader = this.game.invaders[invaderKey];
			var invaderType = this.data.invaders[invader.invaderTypeId];
			this.moveToon(invader, invaderType);
			// Special invader stuff...
			//console.log(invaderType.hitPoints - invader.hp);
			//if ((invaderType.hitPoints - invader.hp) < 5) {
				if (Math.abs(88 - invader.x) < 2) {
					this.toonUseStairs(invader, invaderKey);
				}
			//}
		}
	}
	
	// Simulate physics
	this.moveToon = function (toon, toonType) 
	{
		// *** set width somewhere else
		if (typeof toon.width === 'undefined') {
			toon.width = toon.$elt.width();
		}
		var maxX = this.floorWidth - toon.width;
		//var toonMidX = toon.x + (toon.width/2);
		var velX = 0, velY = 0;
		var isOnGround = (toon.y <= 0);
		var weightMultiplier = toonType.weightMultiplier;
		// Handle locomotion based on life/death
		if (toon.isDead) {
			weightMultiplier = 1;
			// Stop all locomotion
			if (toon.locomotionVelX != 0) {
				toon.externalVelX += toon.locomotionVelX;
				toon.locomotionVelX = 0;
			}
			if (toon.locomotionVelY != 0) {
				toon.externalVelY += (toon.locomotionVelY / 2);
				toon.locomotionVelY = 0;
			}
		} else { 				// If alive and moving, then move and hop
			if (isOnGround && toon.locomotionVelX != 0) toon.externalVelY += 1.5;
		}
		// Ground Friction
		if (isOnGround && toon.externalVelX != 0) {
			toon.externalVelX = toon.externalVelX * 0.95;
			if (toon.externalVelX < 0.05) toon.externalVelX = 0;
		}	

		// If toon on/past the floor?
		if (toon.y <= 0) {
			if (toon.externalVelY < 0) {
				toon.externalVelY = 0;
			}
		} else { // Not on the floor, so subject to gravity
			// Gravity
			toon.externalVelY -= (0.2 * weightMultiplier);
		}

		// New Location based on velocity
		toon.x += (toon.locomotionVelX + toon.externalVelX);
		toon.y += (toon.locomotionVelY + toon.externalVelY);	
		
		//this.updateToonFacing(toon); // Don't run this every time?
		
		// Check boundaries X
		if (toon.x <= 0) {					// Left Edge
			toon.x = 0;
			this.turnToon(toon, "right");
			toon.locomotionVelX = this.getRandomSpeed();
		} else if (toon.x >= maxX) {		// Right Edge
			if (!toon.isOutside) {
				toon.x = maxX;
				this.turnToon(toon, "left");
				toon.locomotionVelX = -1 * this.getRandomSpeed();
			}
		} else {							// Somewhere Inside
			toon.isOutside = false;
		}
		
		// Check boundaries Y
		if (toon.y <= 0) {
			toon.y = 0;
		}

		// Update Position
		//toon.$elt.css({ "left" : toon.x, "bottom" : toon.y });
		toon.$elt[0].style.left = toon.x + "px";
		toon.$elt[0].style.bottom = toon.y + "px";
	}
	
	// Combat Impact Physics
	this.hitToon = function (toon, hittingToon) 
	{
		var damper = 1;			// *** connect this to weight/mass?
		if (toon.key == "G0") {
			toon.externalVelY += 1; 
			damper = 8;
		}
		if (toon.x < hittingToon.x) {			toon.externalVelX -= (8 / damper); }
		else if (toon.x > hittingToon.x) {		toon.externalVelX += (8 / damper); }
		else {									toon.externalVelY += (1 / damper); }

	}
	
	this.turnToon = function (toon, facing) 
	{
		if (typeof facing === 'undefined') {
			toon.facing = (toon.facing == "left") ? "right" : "left";
		} else {
			toon.facing = facing;
		}
		this.updateToonFacing(toon);
	}
	
	this.updateToonFacing = function (toon)
	{	
		var toonEltClassList = toon.$elt[0].classList;
		// 'contains' is IE10+ http://youmightnotneedjquery.com/#has_class
		var isLeftFacing = (toonEltClassList.contains("leftFacing")) ? true : false;
		if (toon.facing == "left" && !isLeftFacing) {
			//toon.$elt.addClass("leftFacing").removeClass("rightFacing");
			toonEltClassList.add("leftFacing");
			toonEltClassList.remove("rightFacing");
		} else if (toon.facing == "right" && isLeftFacing) {
			//toon.$elt.addClass("rightFacing").removeClass("leftFacing");
			toonEltClassList.add("rightFacing");
			toonEltClassList.remove("leftFacing");
		}	
	}
	
	this.toonUseStairs = function (toon, toonKey, isUp)
	{
		var o = this;
		if (typeof isUp === 'undefined') isUp = (this.roll1d(2) == 1) ? true : false;
		var farr = this.game.floorArray;
		var currentFloor = this.game.floors[toon.floorKey];
		if (farr.length <= 1) return false;
		var floorIndex = $.inArray(toon.floorKey, farr);
		if (floorIndex == -1) return false; // shouldn't happen
		if (isUp) {						
			if (floorIndex == 0) return false;
			var newFloorKey = farr[floorIndex - 1];
		} else {						
			if (floorIndex == (farr.length - 1)) return false;
			var newFloorKey = farr[floorIndex + 1];
		}
		// Check for cooldown to prevent jumping through stairs too often
		if (typeof toon.stairsCooldown === "undefined") toon.stairsCooldown = 0;
		else toon.stairsCooldown--;
		if (toon.stairsCooldown > 0) return false;
		// Made it this far, now go to new floor
		//toon.locomotionVelX = 0;
		
		o.removeToonFromFloor(toon, toonKey, function(){
			o.addToonToFloor(toon, toonKey, newFloorKey);
			toon.stairsCooldown = 5;
			toon.externalVelY += 4;
		});
		return true;
	}	
	
	this.doCombatRound = function ()
	{
		var o = this;
		// Loop through all floors
		for (var f in this.game.floorArray) {
			var floorKey = this.game.floorArray[f];
			var floor = this.game.floors[floorKey];
			// Loop through all invaders on this floor
			for (var i in floor.invaderKeyArray) {
				var invKey = floor.invaderKeyArray[i];
				var invader = this.game.invaders[invKey];
				if (typeof invader !== "undefined" && !invader.isDead) {
					var invaderType = this.data.invaders[invader.invaderTypeId];
					// Loop through all goons on this floor to see if there are any in melee range
					for (var g in floor.goonKeyArray) {
						var goonKey = floor.goonKeyArray[g];
						var goon = this.game.goons[goonKey];
						if (typeof goon !== "undefined" && !goon.isDead) {
							var goonType = this.data.goons[goon.goonTypeId];
							var dist = o.getDistanceBetween(goon.x, goon.y, invader.x, invader.y);
							if (dist < o.meleeRange) {
								// Roll for invader attack
								var toHitRoll = o.roll1d(10);
								if (toHitRoll > 4) {
									o.damageToon(goon, invader.damage);
									o.hitToon(goon, invader);
								}
								// Roll for goon attack
								toHitRoll = o.roll1d(10);
								if (toHitRoll > 4) {
									o.damageToon(invader, goon.damage);
									o.hitToon(invader, goon);
								}
							}
						}
					}
				}
			}
		}	
	}
	
	this.damageToon = function (toon, damage) 
	{
		damage += this.roll1d(2) - 1; // bonus random damage
		toon.hp -= damage;
		var $dmg = $('<div class="damage">' + damage + '</div>');
		var toonPos = toon.$elt.position();
		//console.log(toonPos);
		$dmg.css({
			"left" : toonPos.left + 50
			,"top" : toonPos.top
		});
		toon.$elt.closest('.floor').append($dmg);
		if (toon.isGoon) $dmg.addClass("goonDamage");
		$dmg.animate({
			"opacity" : 0
			,"bottom" : 0
		}, 1000, function(){
			$dmg.remove();
		});
		// DEAD!
		if (toon.hp <= 0) {
			if (typeof toon.isImmortal !== 'boolean') toon.isImmortal = false;
			if (toon.isImmortal) {
				toon.decay = 20;
			} else if (toon.isUndead) {
				toon.decay = 30;
				this.total.souls += this.roll1d(3);
			} else {
				toon.decay = 50;
				this.total.souls += this.roll1d(2);
				if (!toon.isGoon) {
					this.total.gold += this.roll1d(2);
				}
			}
			if (toon.isGoon) {
				this.game.totalDeaths++;
			} else {
				this.game.totalKills++;
			}
			toon.externalVelY = 6;
			toon.isDead = true;
			toon.$elt.addClass("dead");
		}
	}
	
	
	this.lootCorpse = function (toonKey, isGoon) 
	{
		var toon = (isGoon) ? this.game.goons[toonKey] : this.game.invaders[toonKey];
		// Is the toon is dead, not fully decyaed and not immortal, then you can loot!
		var isToonLootable = toon.isDead && toon.decay > 0 && !toon.isImmortal;
		if (isToonLootable) {
			toon.decay = 0;
			toon.$elt.addClass("decayed");
			if (toon.isUndead) {
				this.total.souls += this.roll1d(9);
			} else {
				this.total.souls += 2 + this.roll1d(8);
				if (!toon.isGoon) {
					this.total.gold += this.roll1d(6);
				}		
			}
			toon.externalVelX = this.getRandomVelocity();
			toon.externalVelY += 7;
		}
	}
	
	this.clearDead = function ()
	{
		var o = this;
		for (var invaderKey in this.game.invaders) {
			var invader = this.game.invaders[invaderKey];
			if (invader.isDead) {
				invader.decay--;
				if (invader.decay < 0) {
					console.log("Clearing Invader " + invaderKey);
					o.removeToonFromFloor(invader, invaderKey);
					delete this.game.invaders[invaderKey];
				}
			}
		}
		for (var goonKey in this.game.goons) {
			var goon = this.game.goons[goonKey];
			if (goon.isDead) {
				goon.decay--;
				if (goon.decay < 0) {
					console.log("Clearing goon " + goonKey);
					console.log(goon);
					if (typeof goon.isImmortal !== 'boolean') goon.isImmortal = false;
					// If the goon is the Phantom Lord, then RESPAWN
					if (goon.isImmortal) {
						console.log("Respawning Immortal " + goonKey);	
						goon.isDead = false;
						// Need closure fix here... http://stackoverflow.com/questions/21070431/how-to-loop-over-an-array-and-add-jquery-click-events
						(function(g){
							goon.$elt.fadeOut(2000, function(){
								g.isDead = false;
								g.hp = 30 + (o.total.arcane / 10);
								g.$elt.removeClass("dead").fadeIn(500);
							});
						}(goon)); 
					} else { // normal delete
						console.log("Deleting Goon " + goonKey);
						o.removeToonFromFloor(goon, goonKey);
						delete this.game.goons[goonKey];
					}
				}
			}
		}		
	}
	
	this.removeToonFromFloor = function (toon, toonKey, callback)
	{
		var floor = this.game.floors[toon.floorKey];
		var arrayName = (toon.isGoon) ? "goonKeyArray" : "invaderKeyArray";
		var keyPos = $.inArray(toonKey, floor[arrayName]);
		floor[arrayName].splice(keyPos, 1);
		toon.$elt.fadeOut(500, function(){
			toon.$elt.remove();
			if (typeof callback === "function") callback();
		});
	}
	
	this.addToonToFloor = function (toon, toonKey, newFloorKey)
	{
		toon.floorKey = newFloorKey;
		var newFloor = this.game.floors[newFloorKey];
		if (toon.isGoon) {
			var arrayName = "goonKeyArray";
			var toonType = this.data.goons[toon.goonTypeId];
		} else {
			var arrayName = "invaderKeyArray";
			var toonType = this.data.invaders[toon.invaderTypeId];
		}
		newFloor[arrayName].push(toonKey);
		// Now add the element to the floor so we don't have to refresh all toons in the DOM
		var $floor = this.$floors.find('.floorKey' + newFloorKey);
		this.setToon$Elt(toon, toonType).hide().appendTo($floor).fadeIn(100);	
	}
	
	
	this.getDistanceBetween = function (x1, y1, x2, y2) {
		return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));
	}
	
	
	//=========================================================================
	//============================================ CURRENCY / PILE
	
	this.displayTotals = function ()
	{
		var h = '<ul>'
			+ '<li><span class="currNum goldNum">'
			+ this.getDisplayNumber(this.total.gold)
			+ '</span><span class="currencyIcon icon_gold"><span>Gold</span></span></li>'
			+ '<li><span class="currNum soulsNum">'
			+ this.getDisplayNumber(this.total.souls)
			+ '</span><span class="currencyIcon icon_souls"><span>Soul Shards</span></span></li>'
			+ '<li><span class="currNum arcaneNum">'
			+ this.getDisplayNumber(this.total.arcane)
			+ '</span><span class="currencyIcon icon_arcane"><span>Arcane Knowledge</span></span></li>'
				//'<!---<li><span class="currNum foodNum">'
				// this.getDisplayNumber(this.total.food)
				// '</span><span class="currencyIcon icon_food">Food</span></li>--->'
			+ '<li><span class="currNum stoneNum">'
			+ this.getDisplayNumber(this.total.stone)
			+ '</span><span class="currencyIcon icon_stone"><span>Stone</span></span></li>'
			+ '<li><span class="currNum oreNum">'
			+ this.getDisplayNumber(this.total.ore)
			+ '</span><span class="currencyIcon icon_ore"><span>Ore</span></span></li>'		
			+ '<li><span class="currNum floorNum">'
			+ this.totalFloorCount
			+ '</span><span class="currencyIcon icon_floors"><span>Floors</span></span></li>'
			+ '</ul>';
		this.$currency[0].innerHTML = h;
		/*
		this.$currency.find('.goldNum').html(this.getDisplayNumber(this.total.gold));
		this.$currency.find('.soulsNum').html(this.getDisplayNumber(this.total.souls));
		this.$currency.find('.arcaneNum').html(this.getDisplayNumber(this.total.arcane));
		this.$currency.find('.stoneNum').html(this.getDisplayNumber(this.total.stone));
		this.$currency.find('.oreNum').html(this.getDisplayNumber(this.total.ore));
		this.$currency.find('.foodNum').html(this.getDisplayNumber(this.total.food));
		this.$currency.find('.floorNum').html(this.totalFloorCount);
		*/
	}
	
	this.calculatePerSecondValues = function () 
	{
		// Start at zero
		this.perSecond = {
			"gold"		: 0
			,"souls" 	: 0
			,"arcane" 	: 0
			,"stone"	: 0
			,"ore"		: 0
			,"food"		: 0	
		};
		// Loop through all constructed rooms of the tower
		for (fIndex in this.game.floorArray) {
			var floorKey = this.game.floorArray[fIndex];
			var floor = this.game.floors[floorKey];
			var floorType = this.data.floors[floor.floorTypeId];
			var numOfWorkers = 0; // was: numOfWorkers = floor.goonKeyArray.length;
			var canProduce = true;
			var canHarvest = (floorType.name == "Mine") ? true : false;
			// Loop over goons and get a count of workers
			for (var goonIndex in floor.goonKeyArray) {
				var goonKey = floor.goonKeyArray[goonIndex];
				var goon = this.game.goons[goonKey];
				if (!goon.isDead) numOfWorkers++;
			}
			// If we can harvest and we have workers and resources, then harvest resources...
			if (canHarvest && numOfWorkers > 0 && typeof floor.naturalResources === "object") {
				var $floor = this.$floors.find('.floorKey' + floorKey);
				// Loop through all natural resources
				for (var currency in floor.naturalResources) {
					if (floor.naturalResources[currency] > 0) {
						if (numOfWorkers > 0) {
							var workersAssignedToThisResource = 1;
							var naturalProductionPerSecond = workersAssignedToThisResource;
							// If this floor outputs this resource already, then get a bonus
							if (typeof floorType.output === "object") {
								if (floorType.output[currency] > 0) {
									naturalProductionPerSecond += floorType.output[currency];
								}
							}
							this.perSecond[currency] += naturalProductionPerSecond;
							floor.naturalResources[currency] -= naturalProductionPerSecond;
							numOfWorkers -= workersAssignedToThisResource;
						}
					}
					$floor.find('.nr' + this.getProperCase(currency) + 'Num')
						.html(floor.naturalResources[currency]);
				}
			}				
			// If we have workers left, then the floor can output...
			if (numOfWorkers > 0) {			
				// Does the floor have any inputs?
				if (typeof floorType.input === "object") {
					for (var currency in floorType.input) {
						var totalInputFromWorkers = (floorType.input[currency] * numOfWorkers);
						if (this.total[currency] > totalInputFromWorkers) {
							this.perSecond[currency] -= totalInputFromWorkers;
						} else {
							canProduce = false;
						}
					}				
				}
				// Does the floor output anything? and can it output?
				if (canProduce && typeof floorType.output === "object") {
					for (var currency in floorType.output) {
						this.perSecond[currency] += (floorType.output[currency] * numOfWorkers);
					}
				}
			} 
		}
	}

	
	this.eraseCurrency = function (currencyType, amount)
	{
		// *** Change this so if removes currency from piles
		this.total[currencyType] -= amount;
		return true;
	}
	
	
	/*
	this.displayPerSecondNumbers = function () {
		// Per second...
		this.displayNumber(this.perSecond.indMoney, this.$indMoneyPerSecondVal);
		this.displayNumber(this.perSecond.polMoney, this.$polMoneyPerSecondVal);
		this.displayNumber(this.perSecond.medMoney, this.$medMoneyPerSecondVal);
		this.displayNumber(this.perSecond.votes, this.$votesPerSecondVal);
		this.displayNumber(this.perSecond.minds, this.$mindsPerSecondVal);	
	}

	/*
	this.displayNumber = function (n, $elt) {
		//console.log($elt);
		$elt.html(this.getDisplayNumber(n));
	}
	*/
	
	this.getDisplayNumber = function(n) {
		n = parseInt(n);
		//if (n >= 5) n = parseInt(n);
		//else n = Math.round( n * 10 ) / 10;
		return n.toLocaleString('en');
	}
	
	this.getProperCase = function(t) {	
		return t.replace(/\w\S*/g, function(txt){
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	}
	
	//=============================================== ZOOM
	
	this.zoomOut = function () {
		return this.changeZoom(1);
	}
	this.zoomIn = function () {
		return this.changeZoom(-1);
	}
	this.changeZoom = function (zoomDelta) {
		var zoomLevel = this.zoom; //0 + this.$tower.data("zoom");
		zoomLevel += zoomDelta;
		return this.setZoom(zoomLevel);
	}
	this.setZoom = function (zoomLevel) {
		if (zoomLevel > 3) 		return false; //zoomLevel = 3;
		else if (zoomLevel < 0) return false; //zoomLevel = 0;	
		this.zoom = zoomLevel;
		this.$tower.add('body') //.data("zoom", zoomLevel)
			.removeClass("zoom0").removeClass("zoom1").removeClass("zoom2").removeClass("zoom3")
			.addClass("zoom" + zoomLevel);
		this.setSizesByZoom();
		this.drawTower(true);
		return zoomLevel;
	}
	this.setSizesByZoom = function () {
		this.floorHeight = this.floorHeightByZoom[this.zoom];
		this.floorWidth = this.floorWidthByZoom[this.zoom];
		this.meleeRange = this.floorMeleeRangeByZoom[this.zoom];
		this.movementRange = this.movementByZoom[this.zoom];		
	}

	
	//=============================================== SETUP & LAUNCH
	
	this.notify = function (t) {
		console.warn(t);
		alert(t);
	}

	
	this.setup = function () 
	{
		var o = this;
		var ajaxGetData = {};
		
		
		$.ajax({
			type: 		"get"
			,url:		"data/phantom_data.json"
			,dataType: 	"json"
			,complete: function(x,t) {
			}
			,success: function(responseObj) {
				try {
					//var responseObj = $.parseJSON(response);
					//o.data.upgrades = responseObj.upgrades;
					//o.data.groups 	= responseObj.groups;
					o.data.floors 	= responseObj.floors;
					o.data.goons 	= responseObj.goons;
					o.data.invaders = responseObj.invaders;
					console.log("Ajax Success loading data");
				} catch (err) {
					o.notify("ERROR IN JSON DATA");
					console.log(responseObj);
				}
				// Loop through upgrade data and setup default ownership
				/*
				for (sector in o.data.upgrades) {
					o.owned.upgrades[sector] = [];
					for (ug in o.data.upgrades[sector]) {
						o.owned.upgrades[sector][ug] = 0;
					}
				}
				*/
			}
			,failure: function(msg) {
				console.log("Fail\n"+ msg);
			}
			,error: function(x, textStatus, errorThrown) {
				console.log("Error\n" + x.responseText + "\nText Status: " + textStatus + "\nError Thrown: " + errorThrown);
			}
		});
	
	
	
		//=========== Setup UI
		
		o.$body 		= $('body');
		o.$tower 		= $('#tower');
		o.$floors 		= $('#floors');
		o.$ground 		= $('#ground');
		o.$floorMenu 	= $('#floorMenu');
		o.$settings 	= $('#settings');
		o.$goonInfo 	= $('#goonInfo');
		o.$floorPurchase = $('#floorPurchase');
		o.$floorBuilder = $('#floorBuilder');
		o.$goonAssign 	= $('#goonAssign');
		o.$currency 	= $('#currency');
		
		var closePopUp = function($pop){
			$pop.hide(200);
			$('footer').fadeOut();	
		}
		
		var clickFloor = function ($floor) {
			var floorKey = $floor.data("floorkey");
			o.selectFloor(floorKey);
			//var top = o.$body.scrollTop();
			var top = $floor.offset().top;
			o.viewFloor(floorKey, top, 0);		
		}
		
		o.$body.on("click", function(e){
			var $target = $(e.target);
			console.log($target);
			if ($target.hasClass("viewFloor")) {
				clickFloor($target);
				
			} else if ($target.hasClass("floorTop")) {
				
				var top = $target.offset().top;
				var left = $target.offset().left;
				o.viewBuilder(true, top, left);
				
			} else if ($target.hasClass("floorBottom")) {
				
				var top = $target.offset().top;
				var left = $target.offset().left;
				o.viewBuilder(false, top, left);
				
			} else if ($target.hasClass("goon")) {	
			
				if ($target.hasClass("dead")) {
					var goonKey = $target.data("goonkey");
					o.lootCorpse(goonKey, true);
				} else {
					clickFloor($target.closest('.floor'));
				}

			} else if ($target.hasClass("invader")) {	
			
				if ($target.hasClass("dead")) {
					var invaderKey = $target.data("invaderkey");
					o.lootCorpse(invaderKey, false);
				} else {
					clickFloor($target.closest('.floor'));
				}
				
			} else if ($target.hasClass("floorName")) {
				clickFloor($target.closest('.floor'));
				
			} else if ($target.hasClass("viewAssignWorker")) {
				var floorKey = $target.data("floorkey");
				closePopUp( $target.closest('.popUp') );
				//var top = $target.offset().top;
				var top = o.$body.scrollTop();
				o.viewGoonAssignment(floorKey, top);
				
			} else if ($target.hasClass("buyGoon")) {
				var floorKey = $target.data("floorkey");
				var goonTypeId = $target.data("goontypeid");
				o.buyGoon(goonTypeId, floorKey);
				
			} else if ($target.hasClass("floorPurchase")) {
				closePopUp( $target.closest('.popUp') );
				var top = o.$body.scrollTop();
				o.viewFloorPurchase(top);
				
			} else if ($target.hasClass("toggleFloorDescription")) {
				$target.closest('.popUp').find('.descriptiveInfo').toggle(400);
			}
			// Settings
			else if ($target.hasClass("zoomOut")) {
				o.zoomOut();
			} else if ($target.hasClass("zoomIn")) {
				o.zoomIn();
			}
			
			// Close popup
			if ($target.hasClass("closePopUp")) {
				closePopUp( $target.parent() );
				o.deselectFloor();
			}
		});
		
		// Some UI stuff that will be constant
		
		$('.openSettings').click(function(e){
			var top = o.$body.scrollTop();
			o.$settings.slideDown().css("top", top);
			$('footer').fadeIn();
			console.log($('footer'));
		});
		$('.toggleWorkerInfo').click(function(e){
			$('.workerInfo').toggle(200);
		});
		$('.toggleProductionInfo').click(function(e){
			$('.productionInfo').toggle(200);
		});		
		
		/*
		$('.save').click(function(e){
			o.playSound("save1");
			o.saveGame(true);
		});
		$('.load').click(function(e){
			o.playSound("save1");
			o.loadGame();
		});
		$('.delete').click(function(e){
			o.playSound("shock1");
			o.deleteGame(true);
			if (confirm("Reload page to start a new game?")) {
				window.location.reload(true); 
			}
		});
		$('.toggleSound').click(function(e){
			var x = o.toggleSound();
			o.notify("Sound turned " + ((x) ? "ON" : "OFF"));
		});
		*/
		
		
		/* Intro */
		/*
		$('.openWalkthru').click(function(e){
			$(this).fadeOut(200);
			$('section.intro').fadeOut(1000, function(){
				$('section.walkthru').fadeIn(1000, function(){
					$('.threeCols').fadeIn(1000);
				});
			});
		});
		$('.openGame').click(function(e){
			$(this).fadeOut(200);
			$('section.walkthru').fadeOut(1000,function(){
				o.saveGame();
				o.loadGame(true);
			});
		});
		*/

		
		// Scroll Event
		var $win = $(window);
		//var $3cols = $('.threeCols');
		$win.scroll(function() {
			var height = $win.scrollTop();
			//console.log(height);
			if (height > 550) {
				
			} else {
				
			}
		});
		
		
		$('.stopLoop').click(function(e){ 	o.stopLoop(); });
		$('.startLoop').click(function(e){ 	o.startLoop(); });
		
		//$('.upgradeList > li').click(function(e){	o.buyUpgrade(1); });


		//=========== Launch!
		var launchTimer = window.setTimeout(function(){
			o.launch(0);
		}, 250);
	}
	
	this.launch = function (iteration) 
	{
		var o = this;
		iteration++;
		if (Object.keys(o.data.floors).length > 0) {
			console.log("Launching Game!");
			o.loadGame(true);
		} else if (iteration < 40) {
			console.log("Launch... Cannot start yet. " + iteration);
			var launchTimer = window.setTimeout(function(){
				o.launch(iteration);
			}, 250);			
		} else {
			o.notify("Cannot launch game.");
		}
	}
	
	this.saveGame = function(showNotice) 
	{
		localStorage.setItem("owned", JSON.stringify(this.owned));
		localStorage.setItem("total", JSON.stringify(this.total));
		localStorage.setItem("isSoundOn", JSON.stringify(this.isSoundOn));
		
		if (typeof showNotice === 'boolean') { 
			if (showNotice) this.notify("Game has been saved to this browser. Your game will be automatically loaded when you return.");
		}
	}
	
	this.deleteGame = function() 
	{
		localStorage.removeItem("owned");
		localStorage.removeItem("total");
		this.notify("Saved game deleted!");
	}	
	
	this.loadGame = function (isStartLoop) 
	{
		var o = this;
		var isLoaded = false;
		// Load game data (two objects)
		
		/*
		var loadedOwned = localStorage.getItem("owned");
		if (loadedOwned !== null) {
			o.owned = JSON.parse(loadedOwned);
			isLoaded = true;
		}
		var loadedTotal = localStorage.getItem("total");
		if (loadedTotal !== null) {
			o.total = JSON.parse(loadedTotal);
			isLoaded = true;
		}
		*/
		
		var loadedSound = localStorage.getItem("isSoundOn");
		if (loadedSound !== null) {
			o.isSoundOn = JSON.parse(loadedSound);
		}		

		$('.subTitle').html("ver " + o.version);
		
		$('body > header').hide().fadeIn(150, function(){
		
			$('#controls').hide().slideDown(1500)
			if (false /* !isLoaded */) {
				$('.intro').fadeIn(1000);
			} else {
				/*
				o.calculateCoreValues();
				o.writeUpgrades();
				//o.addFlipCardEvents();
				$('.metrics').slideDown(1000);
				$('footer').slideDown(3000);
				$('.progress').show(2000);
				$('.threeCols').fadeIn(2000, function(){
					if (isStartLoop) {
						o.startLoop();
					}
				});
				*/
				o.calculateFloorsCounts();
				o.drawTower();
				if (isStartLoop) {
					o.startLoop();
				}
			}
		});
	}

	
	//========================================= SOUND

	this.isSoundOn = true;
	
	this.toggleSound = function (forceSound) {
		if (typeof forceSound === 'boolean') 	this.isSoundOn = forceSound;
		else									this.isSoundOn = (this.isSoundOn) ? false : true;
		return this.isSoundOn;	
	}

	this.sounds = {
		"coin1" 		: new Audio("sounds/coin1.mp3")
		,"coin2" 		: new Audio("sounds/coin2.mp3")
		,"dud1" 		: new Audio("sounds/dud1.mp3")
		,"dud2" 		: new Audio("sounds/dud2.mp3")
		,"save1" 		: new Audio("sounds/save1.mp3")
		,"transfer1" 	: new Audio("sounds/transfer1.mp3")
		,"upgrade1" 	: new Audio("sounds/upgrade1.mp3")
		,"shock1" 	: new Audio("sounds/shock1.mp3")
	}
	/*
	this.sounds["jibber1"].volume = 0.6;
	this.sounds["jibber2"].volume = 0.6;
	this.sounds["jibber3"].volume = 0.6;
	this.sounds["jibber4"].volume = 0.6;
	this.sounds["glassian"].volume = 0.4;
	*/	
	
	this.playSound = function (soundName, isLooped)
	{
		if (this.isSoundOn) {	
			if (soundName == "coin" || soundName == "dud") {
				soundName += this.roll1d(2);
			}	
			if (typeof this.sounds[soundName] === 'undefined') {
				console.log("Sound does not exist: " + soundName);
				return false;
			} else {
				if (typeof isLooped === 'boolean') {
					this.sounds[soundName].loop = isLooped;
				}
				this.sounds[soundName].play();
				return true;
			}
		} else {
			return false;
		}
	}
	
	this.roll1d = function (sides) {
		return (Math.floor(Math.random()*sides) + 1);
	}
	
	//========================================= Helper Functions
	
	this.cloneDataObject = function (o) {
		return JSON.parse(JSON.stringify(o));
	}


	//========================================= Construction
	if (!window.localStorage) {
		alert("This browser does not support localStorage, so this app will not run properly. Please try another browser, such as the most current version of Google Chrome.");
	}
	if (!window.jQuery) { alert("ERROR - jQuery is not loaded!"); }
}

