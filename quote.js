document.addEventListener("DOMContentLoaded", function () {

"use strict";

const form = document.getElementById("quote-form");

const progressItems =
document.querySelectorAll(".progress-step");

if (!form) {
console.error("Quote form not found.");
return;
}


/* =========================================================
   WIZARD STATE
========================================================= */

let currentStep = 1;
let batteryCounter = 0;

const data = {

manufacturer: "",
model: "",
package: "",
condition: "",

flightHours: "",
flightHoursRange: "",

batteries: [],

unbound: "",

damage: "",
damageDescription: "",

packageContents: {},

additionalAccessories: [],

droneSerial: "",
controllerSerial: "",

photos: [],

legalRight: "",

fullName: "",
email: "",
phone: "",

addressLine1: "",
addressLine2: "",
city: "",
county: "",
postcode: "",

quoteAmount: null,
quoteReference: ""

};


/* =========================================================
   DJI MODEL DATABASE
========================================================= */

const models = [

["mini", "DJI Mini"],
["mini-se", "DJI Mini SE"],
["mini-2", "DJI Mini 2"],
["mini-2-se", "DJI Mini 2 SE"],
["mini-3", "DJI Mini 3"],
["mini-3-pro", "DJI Mini 3 Pro"],
["mini-4-pro", "DJI Mini 4 Pro"],
["mini-5-pro", "DJI Mini 5 Pro"],

["neo", "DJI Neo"],
["neo-2", "DJI Neo 2"],

["lito-1", "DJI Lito 1"],
["lito-x1", "DJI Lito X1"],

["flip", "DJI Flip"],

["air", "DJI Air"],
["air-2", "DJI Air 2"],
["air-2s", "DJI Air 2S"],
["air-3", "DJI Air 3"],
["air-3s", "DJI Air 3S"],

["mavic-mini", "DJI Mavic Mini"],
["mavic-pro", "DJI Mavic Pro"],
["mavic-2-pro", "DJI Mavic 2 Pro"],
["mavic-2-zoom", "DJI Mavic 2 Zoom"],
["mavic-3", "DJI Mavic 3"],
["mavic-3-classic", "DJI Mavic 3 Classic"],
["mavic-3-pro", "DJI Mavic 3 Pro"],
["mavic-3-pro-cine", "DJI Mavic 3 Pro Cine"],
["mavic-4-pro", "DJI Mavic 4 Pro"],

["fpv", "DJI FPV"],
["avata", "DJI Avata"],
["avata-2", "DJI Avata 2"],
["avata-360", "DJI Avata 360"],

["mavic-3-enterprise", "DJI Mavic 3 Enterprise"],
["mavic-3-thermal", "DJI Mavic 3 Thermal"],
["mavic-3-multispectral", "DJI Mavic 3 Multispectral"],
["matrice-4e", "DJI Matrice 4E"],
["matrice-4t", "DJI Matrice 4T"],
["matrice-30", "DJI Matrice 30"],
["matrice-30t", "DJI Matrice 30T"],
["matrice-300-rtk", "DJI Matrice 300 RTK"],
["matrice-350-rtk", "DJI Matrice 350 RTK"],
["matrice-400", "DJI Matrice 400"],
["inspire-1", "DJI Inspire 1"],
["inspire-2", "DJI Inspire 2"],
["inspire-3", "DJI Inspire 3"],
["agras", "DJI Agras"]

];


/* =========================================================
   PACKAGE DATABASE
========================================================= */

const packages = {

"mini-5-pro": {

"drone-only":
"Drone only",

"standard-rc-n3":
"Standard + RC-N3",

"fly-more-rc-n3":
"Fly More Combo + RC-N3",

"fly-more-rc-2":
"Fly More Combo + RC 2",

"fly-more-plus-rc-2":
"Fly More Combo Plus + RC 2"

},

"mini-4-pro": {

"drone-only":
"Drone only",

"standard-rc-n2":
"Standard + RC-N2",

"standard-rc-2":
"Standard + RC 2",

"fly-more-rc-n2":
"Fly More Combo + RC-N2",

"fly-more-rc-2":
"Fly More Combo + RC 2"

},

"mini-3-pro": {

"drone-only":
"Drone only",

"drone-rc-n1":
"Drone + RC-N1",

"drone-dji-rc":
"Drone + DJI RC",

"fly-more-rc-n1":
"Fly More Combo + RC-N1",

"fly-more-dji-rc":
"Fly More Combo + DJI RC"

},

"mini-3": {

"drone-only":
"Drone only",

"standard-rc-n1":
"Standard + RC-N1",

"fly-more-rc-n1":
"Fly More Combo + RC-N1"

},

"mini-2": {

"drone-only":
"Drone only",

"standard-rc-n1":
"Standard + RC-N1",

"fly-more":
"Fly More Combo"

},

"neo": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"neo-2": {

"standard":
"Standard Package",

"fly-more":
"Fly More Combo"

},

"flip": {

"standard-rc-n3":
"Standard + RC-N3",

"fly-more-rc-n3":
"Fly More Combo + RC-N3",

"fly-more-rc-2":
"Fly More Combo + RC 2"

},

"air": {

"drone-only":
"Drone only",

"standard":
"Standard Package",

"fly-more":
"Fly More Combo"

},

"air-2": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"air-2s": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"air-3": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"air-3s": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"mavic-2-pro": {

"drone-only":
"Drone only",

"standard":
"Standard Package",

"fly-more":
"Fly More Combo"

},

"mavic-2-zoom": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"mavic-3": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"mavic-3-classic": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"mavic-3-pro": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"mavic-3-pro-cine": {

"drone-only":
"Drone only",

"premium-combo":
"Premium Combo"

},

"mavic-4-pro": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

},

"fpv": {

"drone-only":
"Drone only",

"fly-smart":
"Fly Smart Combo"

},

"avata": {

"drone-only":
"Drone only",

"fly-smart":
"Fly Smart Combo",

"pro-view":
"Pro-View Combo",

"explorer":
"Explorer Combo"

},

"avata-2": {

"drone-only":
"Drone only",

"fly-more":
"Fly More Combo"

}

};


/* =========================================================
   PACKAGE BATTERY COUNTS
========================================================= */

const packageBatteryCounts = {

"mini-5-pro": {
"drone-only": 1,
"standard-rc-n3": 1,
"fly-more-rc-n3": 3,
"fly-more-rc-2": 3,
"fly-more-plus-rc-2": 3
},

"mini-4-pro": {
"drone-only": 1,
"standard-rc-n2": 1,
"standard-rc-2": 1,
"fly-more-rc-n2": 3,
"fly-more-rc-2": 3
},

"mini-3-pro": {
"drone-only": 1,
"drone-rc-n1": 1,
"drone-dji-rc": 1,
"fly-more-rc-n1": 3,
"fly-more-dji-rc": 3
},

"mini-3": {
"drone-only": 1,
"standard-rc-n1": 1,
"fly-more-rc-n1": 3
},

"mini-2": {
"drone-only": 1,
"standard-rc-n1": 1,
"fly-more": 3
},

"neo": {
"drone-only": 1,
"fly-more": 3
},

"neo-2": {
"standard": 1,
"fly-more": 3
},

"flip": {
"standard-rc-n3": 1,
"fly-more-rc-n3": 3,
"fly-more-rc-2": 3
},

"air": {
"drone-only": 1,
"standard": 1,
"fly-more": 3
},

"air-2": {
"drone-only": 1,
"fly-more": 3
},

"air-2s": {
"drone-only": 1,
"fly-more": 3
},

"air-3": {
"drone-only": 1,
"fly-more": 3
},

"air-3s": {
"drone-only": 1,
"fly-more": 3
},

"mavic-2-pro": {
"drone-only": 1,
"standard": 1,
"fly-more": 3
},

"mavic-2-zoom": {
"drone-only": 1,
"fly-more": 3
},

"mavic-3": {
"drone-only": 1,
"fly-more": 3
},

"mavic-3-classic": {
"drone-only": 1,
"fly-more": 3
},

"mavic-3-pro": {
"drone-only": 1,
"fly-more": 3
},

"mavic-3-pro-cine": {
"drone-only": 1,
"premium-combo": 3
},

"mavic-4-pro": {
"drone-only": 1,
"fly-more": 3
},

"fpv": {
"drone-only": 1,
"fly-smart": 1
},

"avata": {
"drone-only": 1,
"fly-smart": 2,
"pro-view": 2,
"explorer": 2
},

"avata-2": {
"drone-only": 1,
"fly-more": 3
}

};


/* =========================================================
   PRICING DATABASE
========================================================= */

const pricing = {

"mini-5-pro": {

"fly-more-rc-2": {

basePrice: 500,

floorPrice: 250,

flightDeductions: {

"0-5": 0,
"5-20": 0,
"20-50": 25,
"50-100": 50,
"100-150": 100,
"150-200": 150,
"200+": null

},

conditionDeductions: {

"factory-sealed": 0,
"opened-unused": 0,
"excellent": 0,
"good": 25,
"fair": 75,
"damaged": null,
"not-working": null

},

batteryDeductions: {

"0-50": 0,
"51-100": 5,
"101-200": 15,
"201-300": 30,
"301+": 50

},

missingItems: {

"drone": 500,
"controller": 100,
"charging-hub": 25,
"bag": 20,
"propellers": 10,
"power-supply": 20,
"cables": 10

},

additionalBatteryValue: 30,

maximumAdditionalBatteries: 3

}

}

};


/* =========================================================
   BASIC HELPERS
========================================================= */

function getStep(number) {

return document.querySelector(
'.wizard-step[data-step="' + number + '"]'
);

}


function showStep(number) {

const allSteps =
document.querySelectorAll(".wizard-step");

allSteps.forEach(function (step) {

step.hidden =
Number(step.dataset.step) !== number;

});


currentStep = number;


progressItems.forEach(function (item, index) {

if (index + 1 === number) {

item.setAttribute(
"aria-current",
"step"
);

} else {

item.removeAttribute(
"aria-current"
);

}

});


window.scrollTo({
top: 0,
behavior: "smooth"
});


if (number === 6) {

setupBatteryStep();

}


if (number === 9) {

buildPackageContents();

}


if (number === 12) {

buildQuoteResult();

}

}


function getModelName(id) {

const found =
models.find(function (model) {

return model[0] === id;

});

return found ? found[1] : id;

}


function getPackageName(model, id) {

if (
packages[model] &&
packages[model][id]
) {

return packages[model][id];

}

return id;

}


function money(value) {

return new Intl.NumberFormat(
"en-GB",
{
style: "currency",
currency: "GBP"
}
).format(value);

}


function quoteReference() {

return "WBA-" +
new Date().getFullYear() +
"-" +
Math.floor(
100000 +
Math.random() * 900000
);

}


/* =========================================================
   STEP 1
========================================================= */

function step1() {

const selected =
form.querySelector(
'input[name="manufacturer"]:checked'
);

if (!selected) {

alert(
"Please select a manufacturer."
);

return false;

}

data.manufacturer =
selected.value;

return true;

}


/* =========================================================
   STEP 2
========================================================= */

function populateModels() {

const select =
document.getElementById(
"dji-model"
);

if (!select) return;

select.innerHTML =
'<option value="">-- Select a model --</option>';

models.forEach(function (model) {

const option =
document.createElement("option");

option.value = model[0];

option.textContent = model[1];

select.appendChild(option);

});

if (data.model) {

select.value =
data.model;

}

}


function step2() {

const select =
document.getElementById(
"dji-model"
);

if (!select || !select.value) {

alert(
"Please select your DJI model."
);

return false;

}

data.model =
select.value;

return true;

}


/* =========================================================
   STEP 3
========================================================= */

function populatePackages() {

const select =
document.getElementById(
"package-select"
);

if (!select) return;

select.innerHTML =
'<option value="">-- Select a package --</option>';

const options =
packages[data.model] || {

"standard":
"Standard Package"

};

Object.entries(options).forEach(
function (entry) {

const option =
document.createElement("option");

option.value =
entry[0];

option.textContent =
entry[1];

select.appendChild(option);

}
);

}


function step3() {

const select =
document.getElementById(
"package-select"
);

if (!select || !select.value) {

alert(
"Please select the exact package."
);

return false;

}

data.package =
select.value;

return true;

}


/* =========================================================
   STEP 4
========================================================= */

function step4() {

const selected =
form.querySelector(
'input[name="condition"]:checked'
);

if (!selected) {

alert(
"Please select the condition."
);

return false;

}

data.condition =
selected.value;

return true;

}


/* =========================================================
   STEP 5
========================================================= */

function step5() {

const hours =
document.getElementById(
"flight-hours"
);

const range =
form.querySelector(
'input[name="flightHoursRange"]:checked'
);

if (
(!hours || !hours.value.trim()) &&
!range
) {

alert(
"Please enter flight hours or select a flight-time range."
);

return false;

}


if (
hours &&
hours.value.trim()
) {

const number =
Number(hours.value);

if (
!Number.isFinite(number) ||
number < 0
) {

alert(
"Please enter a valid flight-hour figure."
);

return false;

}

data.flightHours =
number;

if (number <= 5) {
data.flightHoursRange = "0-5";
}
else if (number <= 20) {
data.flightHoursRange = "5-20";
}
else if (number <= 50) {
data.flightHoursRange = "20-50";
}
else if (number <= 100) {
data.flightHoursRange = "50-100";
}
else if (number <= 150) {
data.flightHoursRange = "100-150";
}
else if (number <= 200) {
data.flightHoursRange = "150-200";
}
else {
data.flightHoursRange = "200+";
}

} else {

data.flightHours =
"";

data.flightHoursRange =
range.value;

}

return true;

}


/* =========================================================
   STEP 6 BATTERIES
========================================================= */

function expectedBatteries() {

if (
packageBatteryCounts[data.model] &&
packageBatteryCounts[data.model][data.package]
) {

return packageBatteryCounts
[data.model]
[data.package];

}

return 1;

}


function setupBatteryStep() {

const container =
document.getElementById(
"batteries-container"
);

const note =
document.getElementById(
"battery-package-note"
);

if (!container) return;

const expected =
expectedBatteries();

if (note) {

note.innerHTML =
"The selected package normally includes <strong>" +
expected +
"</strong> battery" +
(expected === 1 ? "" : "ies") +
". Add every battery being supplied. Additional batteries beyond the package allowance can be valued separately.";

}

if (
!container.querySelector(
".battery-entry"
)
) {

addBattery();

}

}


function addBattery() {

const container =
document.getElementById(
"batteries-container"
);

if (!container) return;

batteryCounter++;

const div =
document.createElement("div");

div.className =
"battery-entry";

div.dataset.number =
batteryCounter;

div.innerHTML = `

<h4>Battery ${batteryCounter}</h4>

<label>
Battery Type
<input
type="text"
class="battery-type"
placeholder="Example: Intelligent Flight Battery"
>
</label>

<label>
Battery Cycle Count
<input
type="number"
class="battery-cycles"
min="0"
step="1"
placeholder="Example: 25"
>
</label>

<button
type="button"
class="btn-remove-battery"
>
Remove Battery
</button>

`;

container.appendChild(div);

}


function validateBatteries() {

const entries =
document.querySelectorAll(
".battery-entry"
);

if (!entries.length) {

alert(
"Please add at least one battery."
);

return false;

}

const batteries = [];

for (
const entry of entries
) {

const type =
entry.querySelector(
".battery-type"
);

const cycles =
entry.querySelector(
".battery-cycles"
);

if (
!type ||
!type.value.trim()
) {

alert(
"Please enter the battery type for every battery."
);

return false;

}

if (
!cycles ||
cycles.value === "" ||
!Number.isFinite(
Number(cycles.value)
) ||
Number(cycles.value) < 0
) {

alert(
"Please enter a valid battery cycle count for every battery."
);

return false;

}

batteries.push({

type:
type.value.trim(),

cycles:
Number(cycles.value)

});

}

data.batteries =
batteries;

return true;

}


/* =========================================================
   STEP 7
========================================================= */

function step7() {

const selected =
form.querySelector(
'input[name="unbound"]:checked'
);

if (!selected) {

alert(
"Please confirm whether the drone is unbound."
);

return false;

}

data.unbound =
selected.value;

if (
selected.value === "no"
) {

alert(
"The drone normally needs to be unbound before a standard purchase can proceed. This submission will require manual review."
);

}

return true;

}


/* =========================================================
   STEP 8
========================================================= */

function step8() {

const selected =
form.querySelector(
'input[name="damage"]:checked'
);

if (!selected) {

alert(
"Please tell us whether the drone has any damage."
);

return false;

}

data.damage =
selected.value;

const description =
document.getElementById(
"damage-description"
);

data.damageDescription =
description
? description.value.trim()
: "";

if (
selected.value === "yes" &&
!data.damageDescription
) {

alert(
"Please describe the damage."
);

return false;

}

return true;

}


/* =========================================================
   STEP 9 PACKAGE CONTENTS
========================================================= */

function buildPackageContents() {

const container =
document.getElementById(
"package-contents-list"
);

if (!container) return;

container.innerHTML = "";

const batteryNumber =
expectedBatteries();

const items = [

["drone", "Drone"],
["controller", "Controller"]

];

for (
let i = 1;
i <= batteryNumber;
i++
) {

items.push([
"battery-" + i,
"Battery " + i
]);

}

items.push(

["charging-hub", "Charging Hub"],
["bag", "Bag"],
["propellers", "Propellers"],
["power-supply", "Power Supply"],
["cables", "Cables"]

);


items.forEach(
function (item) {

const row =
document.createElement("div");

row.className =
"package-content-row";

row.innerHTML = `

<label>
${item[1]}

<select
class="package-content-select"
data-item="${item[0]}"
>

<option value="">
-- Select status --
</option>

<option value="present">
Present
</option>

<option value="missing">
Missing
</option>

</select>

</label>

`;

container.appendChild(row);

});


renderAccessories();

}


function renderAccessories() {

const container =
document.getElementById(
"additional-accessories-list"
);

if (!container) return;

container.innerHTML = "";

data.additionalAccessories.forEach(
function (accessory, index) {

const row =
document.createElement("div");

row.className =
"additional-accessory-row";

row.innerHTML = `

<label>
Accessory ${index + 1}

<input
type="text"
class="accessory-name"
data-index="${index}"
value="${escapeHTML(accessory.name)}"
placeholder="Example: ND filter set"
>

</label>

<label>
Quantity

<input
type="number"
class="accessory-quantity"
data-index="${index}"
min="1"
value="${accessory.quantity}"
>

</label>

<button
type="button"
class="btn-remove-accessory"
data-index="${index}"
>
Remove
</button>

`;

container.appendChild(row);

}
);

}


function addAccessory() {

data.additionalAccessories.push({

name: "",
quantity: 1

});

renderAccessories();

}


function validatePackageContents() {

const selects =
document.querySelectorAll(
".package-content-select"
);

const contents = {};

for (
const select of selects
) {

if (!select.value) {

alert(
"Please mark every package item as Present or Missing."
);

return false;

}

contents[
select.dataset.item
] =
select.value;

}

data.packageContents =
contents;


const accessories = [];

document.querySelectorAll(
".additional-accessory-row"
).forEach(
function (row) {

const name =
row.querySelector(
".accessory-name"
).value.trim();

const quantity =
Number(
row.querySelector(
".accessory-quantity"
).value
);

if (name) {

accessories.push({

name:
name,

quantity:
Number.isFinite(quantity) &&
quantity > 0
? Math.floor(quantity)
: 1

});

}

}
);

data.additionalAccessories =
accessories;

return true;

}


/* =========================================================
   STEP 10 SERIAL NUMBERS
========================================================= */

function step10() {

const drone =
document.getElementById(
"drone-serial-number"
);

const controller =
document.getElementById(
"controller-serial-number"
);

if (
!drone ||
!drone.value.trim()
) {

alert(
"Please enter the drone serial number."
);

return false;

}

data.droneSerial =
drone.value.trim();

data.controllerSerial =
controller
? controller.value.trim()
: "";

return true;

}


/* =========================================================
   STEP 11 PHOTOS
   IMPORTANT:
   NO OWNERSHIP VALIDATION HERE
========================================================= */

function step11() {

const input =
document.getElementById(
"photo-uploads"
);

if (
!input ||
!input.files ||
input.files.length === 0
) {

alert(
"Please upload at least one photograph."
);

return false;

}

data.photos =
Array.from(
input.files
);

return true;

}


/* =========================================================
   PRICING
========================================================= */

function calculateQuote() {

const modelPricing =
pricing[data.model];

if (!modelPricing) {

return {

automatic: false,

reason:
"This model has not yet been given a verified automatic purchase price."

};

}


const packagePricing =
modelPricing[data.package];

if (
!packagePricing ||
!packagePricing.basePrice
) {

return {

automatic: false,

reason:
"A verified purchase price has not yet been entered for this package."

};

}


if (
data.unbound === "no" ||
data.unbound === "unknown"
) {

return {

automatic: false,

reason:
"The drone's DJI account status requires manual review."

};

}


if (
data.condition === "damaged"
) {

return {

automatic: false,

reason:
"Damaged equipment requires manual valuation."

};

}


if (
data.condition === "not-working"
) {

return {

automatic: false,

reason:
"Non-working / spares-only equipment requires manual valuation."

};

}


const flightRange =
data.flightHoursRange;

const flightDeduction =
packagePricing
.flightDeductions
[flightRange];


if (
flightDeduction === null
) {

return {

automatic: false,

reason:
"Very high flight time requires manual valuation."

};

}


let price =
packagePricing.basePrice;


price -=
flightDeduction || 0;


/* CONDITION */

const conditionDeduction =
packagePricing
.conditionDeductions
[data.condition];


if (
conditionDeduction === null ||
conditionDeduction === undefined
) {

return {

automatic: false,

reason:
"This condition requires manual valuation."

};

}


price -=
conditionDeduction;


/* BATTERIES */

for (
const battery of data.batteries
) {

const cycles =
battery.cycles;

let deduction = 0;

if (cycles <= 50) {

deduction = 0;

}
else if (cycles <= 100) {

deduction =
packagePricing
.batteryDeductions
["51-100"];

}
else if (cycles <= 200) {

deduction =
packagePricing
.batteryDeductions
["101-200"];

}
else if (cycles <= 300) {

deduction =
packagePricing
.batteryDeductions
["201-300"];

}
else {

deduction =
packagePricing
.batteryDeductions
["301+"];

}

price -=
deduction || 0;

}


/* MISSING PACKAGE ITEMS */

Object.entries(
data.packageContents
).forEach(
function (entry) {

const item =
entry[0];

const status =
entry[1];

if (
status === "missing"
) {

price -=
packagePricing
.missingItems
[item] || 0;

}

}
);


/* ADDITIONAL BATTERIES */

const included =
expectedBatteries();

const extra =
Math.max(
0,
data.batteries.length -
included
);

const allowed =
Math.min(
extra,
packagePricing
.maximumAdditionalBatteries
);

price +=
allowed *
packagePricing
.additionalBatteryValue;


/* NEVER EXCEED BASE PRICE */

price =
Math.min(
price,
packagePricing.basePrice
);


/* FLOOR */

if (
price <
packagePricing.floorPrice
) {

return {

automatic: false,

reason:
"The calculated value is below the automatic purchase floor."

};

}


return {

automatic: true,

amount:
Math.round(
price * 100
) / 100

};

}


/* =========================================================
   STEP 12 QUOTE RESULT
========================================================= */

function escapeHTML(value) {

return String(
value || ""
)

.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");

}


function buildQuoteResult() {

const container =
document.getElementById(
"quote-summary"
);

if (!container) return;

const result =
calculateQuote();

data.quoteAmount =
result.automatic
? result.amount
: null;


let html = `

<p>
<strong>Drone:</strong>
${escapeHTML(
getModelName(data.model)
)}
</p>

<p>
<strong>Package:</strong>
${escapeHTML(
getPackageName(
data.model,
data.package
)
)}
</p>

<p>
<strong>Condition:</strong>
${escapeHTML(
data.condition
)}
</p>

<p>
<strong>Flight time:</strong>
${
data.flightHours !== ""
? escapeHTML(
data.flightHours
) + " hours"
: escapeHTML(
data.flightHoursRange
)
}
</p>

<p>
<strong>Batteries:</strong>
${data.batteries.length}
</p>

`;


if (result.automatic) {

html += `

<div class="quote-price-box">

<h3>
Estimated Purchase Price
</h3>

<p
class="quote-price"
style="
font-size:2.5rem;
font-weight:800;
"
>
${money(result.amount)}
</p>

</div>

`;

} else {

html += `

<div class="manual-valuation-box">

<h3>
MANUAL VALUATION REQUIRED
</h3>

<p>
We need to manually assess this equipment
before confirming a purchase price.
</p>

<p>
<strong>Reason:</strong>
${escapeHTML(
result.reason
)}
</p>

<p>
Your information can still be submitted
for review.
</p>

</div>

`;

}


container.innerHTML =
html;

}


/* =========================================================
   STEP 13 CUSTOMER DETAILS
   OWNERSHIP IS VALIDATED HERE
========================================================= */

function step13() {

const name =
document.getElementById(
"full-name"
);

const email =
document.getElementById(
"email-address"
);

const phone =
document.getElementById(
"phone-number"
);

const address1 =
document.getElementById(
"address-line-1"
);

const address2 =
document.getElementById(
"address-line-2"
);

const city =
document.getElementById(
"city"
);

const county =
document.getElementById(
"county"
);

const postcode =
document.getElementById(
"postcode"
);


if (
!name ||
!name.value.trim()
) {

alert(
"Please enter your full name."
);

return false;

}


if (
!email ||
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/
.test(
email.value.trim()
)
) {

alert(
"Please enter a valid email address."
);

return false;

}


if (
!phone ||
!phone.value.trim()
) {

alert(
"Please enter your telephone number."
);

return false;

}


if (
!address1 ||
!address1.value.trim()
) {

alert(
"Please enter Address Line 1."
);

return false;

}


if (
!city ||
!city.value.trim()
) {

alert(
"Please enter your town or city."
);

return false;

}


if (
!county ||
!county.value.trim()
) {

alert(
"Please enter your county."
);

return false;

}


if (
!postcode ||
!/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i
.test(
postcode.value.trim()
)
) {

alert(
"Please enter a valid UK postcode."
);

return false;

}


/* OWNERSHIP */

const ownership =
form.querySelector(
'input[name="legalRight"]:checked'
);

if (!ownership) {

alert(
"Please confirm whether you have the legal right to sell this equipment."
);

return false;

}


data.legalRight =
ownership.value;


/* STORE CUSTOMER DATA */

data.fullName =
name.value.trim();

data.email =
email.value.trim();

data.phone =
phone.value.trim();

data.addressLine1 =
address1.value.trim();

data.addressLine2 =
address2
? address2.value.trim()
: "";

data.city =
city.value.trim();

data.county =
county.value.trim();

data.postcode =
postcode.value
.trim()
.toUpperCase();


/* OWNERSHIP UNCERTAIN */

if (
data.legalRight === "no" ||
data.legalRight === "not-sure"
) {

const warning =
document.getElementById(
"ownership-warning"
);

if (warning) {

warning.hidden =
false;

}

alert(
"We cannot automatically purchase equipment where ownership is uncertain. Your details can be submitted for manual review."
);

}


return true;

}


/* =========================================================
   SUBMISSION
========================================================= */

function submitQuote() {

data.quoteReference =
quoteReference();


try {

localStorage.setItem(
"wba_latest_quote",
JSON.stringify({
...data,
photos: [],
created:
new Date().toISOString()
})
);

} catch (error) {

console.warn(
"Local quote storage unavailable.",
error
);

}


const reference =
document.getElementById(
"quote-reference"
);

if (reference) {

reference.textContent =
data.quoteReference;

}

}


/* =========================================================
   FINAL OFFER
========================================================= */

function setupFinalOffer() {

const accept =
document.querySelector(
".btn-final-accept"
);

const decline =
document.querySelector(
".btn-final-decline"
);

const result =
document.getElementById(
"final-offer-result"
);


if (accept) {

accept.addEventListener(
"click",
function () {

if (!result) return;

result.hidden =
false;

result.innerHTML = `

<hr>

<h3>
Final Offer Accepted
</h3>

<p>
The final offer has been accepted.
</p>

<h3>
Payment Details
</h3>

<p>
Bank details are requested only
after the final offer has been accepted.
</p>

<label for="bank-name">
Account Name
</label>

<input
type="text"
id="bank-name"
>

<label for="account-number">
Account Number
</label>

<input
type="text"
id="account-number"
inputmode="numeric"
maxlength="8"
>

<label for="sort-code">
Sort Code
</label>

<input
type="text"
id="sort-code"
inputmode="numeric"
maxlength="8"
placeholder="12-34-56"
>

<button
type="button"
id="submit-bank-details"
>
Submit Bank Details
</button>

<p>
<strong>
BACKEND PAYMENT INTEGRATION REQUIRED
</strong>
</p>

`;

accept.hidden =
true;

if (decline) {

decline.hidden =
true;

}


const bankButton =
document.getElementById(
"submit-bank-details"
);

if (bankButton) {

bankButton.addEventListener(
"click",
function () {

const bankName =
document.getElementById(
"bank-name"
);

const account =
document.getElementById(
"account-number"
);

const sort =
document.getElementById(
"sort-code"
);

if (
!bankName.value.trim() ||
!/^\d{8}$/.test(
account.value.trim()
) ||
!/^\d{2}-?\d{2}-?\d{2}$/.test(
sort.value.trim()
)
) {

alert(
"Please enter a valid account name, 8-digit account number and 6-digit sort code."
);

return;

}

alert(
"Bank details captured for this prototype. A secure backend payment system is required before real banking information should be submitted."
);

}
);

}

}
);


if (decline) {

decline.addEventListener(
"click",
function () {

if (!result) return;

result.hidden =
false;

result.innerHTML = `

<hr>

<h3>
Final Offer Declined
</h3>

<p>
The equipment will be returned to
the full return address supplied
during your quote.
</p>

<p>
<strong>
BACKEND SHIPPING / RETURNS INTEGRATION REQUIRED
</strong>
</p>

`;

if (accept) {

accept.hidden =
true;

}

decline.hidden =
true;

}
);

}

}


/* =========================================================
   NEXT BUTTON
========================================================= */

function next() {

if (currentStep === 1) {

if (!step1()) return;

populateModels();

showStep(2);

return;

}


if (currentStep === 2) {

if (!step2()) return;

populatePackages();

showStep(3);

return;

}


if (currentStep === 3) {

if (!step3()) return;

showStep(4);

return;

}


if (currentStep === 4) {

if (!step4()) return;

showStep(5);

return;

}


if (currentStep === 5) {

if (!step5()) return;

setupBatteryStep();

showStep(6);

return;

}


if (currentStep === 6) {

if (!validateBatteries()) return;

showStep(7);

return;

}


if (currentStep === 7) {

if (!step7()) return;

showStep(8);

return;

}


if (currentStep === 8) {

if (!step8()) return;

showStep(9);

return;

}


if (currentStep === 9) {

if (!validatePackageContents()) return;

showStep(10);

return;

}


if (currentStep === 10) {

if (!step10()) return;

showStep(11);

return;

}


/* IMPORTANT:
   Step 11 only validates photographs.
   It does NOT validate ownership.
*/

if (currentStep === 11) {

if (!step11()) return;

showStep(12);

return;

}


if (currentStep === 12) {

const result =
calculateQuote();

if (
result.automatic
) {

data.quoteAmount =
result.amount;

}

showStep(13);

return;

}


if (currentStep === 13) {

if (!step13()) return;

submitQuote();

showStep(14);

return;

}


if (currentStep === 14) {

showStep(15);

return;

}


if (currentStep === 15) {

showStep(16);

return;

}

}


/* =========================================================
   BACK BUTTON
========================================================= */

function back() {

if (
currentStep <= 1
) {

return;

}

showStep(
currentStep - 1
);

}


/* =========================================================
   CLICK HANDLER
========================================================= */

form.addEventListener(
"click",
function (event) {

const button =
event.target.closest(
"button"
);

if (!button) return;


/* ADD BATTERY */

if (
button.id ===
"add-battery-btn"
) {

event.preventDefault();

addBattery();

return;

}


/* REMOVE BATTERY */

if (
button.classList.contains(
"btn-remove-battery"
)
) {

event.preventDefault();

const entry =
button.closest(
".battery-entry"
);

if (entry) {

entry.remove();

}

return;

}


/* ADD ACCESSORY */

if (
button.id ===
"add-accessory-btn"
) {

event.preventDefault();

addAccessory();

return;

}


/* REMOVE ACCESSORY */

if (
button.classList.contains(
"btn-remove-accessory"
)
) {

event.preventDefault();

const index =
Number(
button.dataset.index
);

data.additionalAccessories
.splice(
index,
1
);

renderAccessories();

return;

}


/* BACK */

if (
button.classList.contains(
"btn-back"
)
) {

event.preventDefault();

back();

return;

}


/* NEXT */

if (
button.classList.contains(
"btn-next"
)
) {

event.preventDefault();

next();

return;

}


/* ACCEPT INSTANT QUOTE */

if (
button.classList.contains(
"btn-accept"
)
) {

event.preventDefault();

showStep(13);

return;

}

}
);


/* =========================================================
   CHANGE HANDLERS
========================================================= */

form.addEventListener(
"change",
function (event) {

const target =
event.target;


/* MODEL */

if (
target.id ===
"dji-model"
) {

data.model =
target.value;

data.package =
"";

populatePackages();

const packageSelect =
document.getElementById(
"package-select"
);

if (packageSelect) {

packageSelect.value =
"";

}

}


if (
target.id ===
"package-select"
) {

data.package =
target.value;

const batteryContainer =
document.getElementById(
"batteries-container"
);

if (batteryContainer) {

batteryContainer.innerHTML =
"";

}

batteryCounter = 0;

setupBatteryStep();

}


/* DAMAGE */

if (
target.name ===
"damage"
) {

const details =
document.getElementById(
"damage-details"
);

if (details) {

details.hidden =
!(
target.value === "yes" &&
target.checked
);

}

}

}
);


/* =========================================================
   INITIALISE
========================================================= */

populateModels();

showStep(1);

setupFinalOffer();

console.log(
"WE BUY ANY DRONE quote wizard loaded successfully."
);

console.log(
"Ownership validation is Step 13 only."
);

});
